import { ProcessoView } from '../views/ProcessoView.js';

// URL da nossa API no Vercel
const API_URL = 'https://uresuzano.vercel.app/api/consultar';  

export const ProcessoController = {
    
    // Função básica de similaridade usada p/ Smart Search no cliente
    calcularSimilaridade: function(s1, s2) {
        let m = 0;
        if (s1.length === 0 || s2.length === 0) return 0;
        if (s1 === s2) return 1;
        const range = (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1;
        const s1Matches = new Array(s1.length).fill(false);
        const s2Matches = new Array(s2.length).fill(false);
        for (let i = 0; i < s1.length; i++) {
            const low = Math.max(0, i - range);
            const high = Math.min(i + range + 1, s2.length);
            for (let j = low; j < high; j++) {
                if (!s2Matches[j] && s1[i] === s2[j]) {
                    s1Matches[i] = true;
                    s2Matches[j] = true;
                    m++;
                    break;
                }
            }
        }
        if (m === 0) return 0;
        let t = 0;
        let k = 0;
        for (let i = 0; i < s1.length; i++) {
            if (s1Matches[i]) {
                while (!s2Matches[k]) k++;
                if (s1[i] !== s2[k]) t++;
                k++;
            }
        }
        return (m / s1.length + m / s2.length + (m - t / 2) / m) / 3;
    },

    consultarProcesso: async function() {
        const input = document.getElementById("processoNumero");
        if (!input) return;

        const nomeOriginal = input.value.trim().toUpperCase();
        const nomeLimpo = nomeOriginal.replace(/\s+/g, ' '); 

        if (!nomeLimpo) {
            ProcessoView.exibirAlerta("⚠ Por favor, digite seu nome completo.", "warning");
            return;
        }

        // Chama a View para Loading
        ProcessoView.mostrarCarregando();

        try {
            // Chamada à nova API do Vercel - Oculta a key do BD e trata Cors/Bots
            const response = await fetch(`${API_URL}?nome=${encodeURIComponent(nomeLimpo)}`);
            
            if (response.status === 429) {
                ProcessoView.exibirAlerta(`⚠️ <b>Limite de consultas atingido.</b><br><small>Aguarde cerca de 1 minuto e tente novamente.</small>`, "warning");
                return;
            }

            if (!response.ok) {
                const erroParse = await response.json();
                throw new Error(erroParse.error || "Erro na consulta.");
            }

            const payload = await response.json();
            const { resultados, filaVTC } = payload;

            if (!resultados || resultados.length === 0) {
                ProcessoView.exibirAlerta(`⚠️ Nenhum processo localizado para: <b>${nomeLimpo}</b>.<br><small>Verifique se o nome está correto ou procure a sua unidade escolar.</small>`, "warning");
                return;
            }

            // Filtro Smart Search
            const resultadosValidos = resultados.filter(p => {
                const score = this.calcularSimilaridade(nomeLimpo, (p.nome || "").toUpperCase());
                return score > 0.85; 
            });

            if (resultadosValidos.length === 0) {
                ProcessoView.exibirAlerta(`⚠️ Nenhum processo localizado para: <b>${nomeLimpo}</b>.<br><small>Tente digitar o nome completo sem abreviações.</small>`, "warning");
                return;
            }

            // Deduplicação pelo tema
            const temasUnicos = new Map();
            resultadosValidos.forEach(p => {
                const temaKey = (p.tema || "OUTROS").toUpperCase().trim();
                if (!temasUnicos.has(temaKey)) {
                    temasUnicos.set(temaKey, p);
                }
            });
            const resultadosFiltrados = Array.from(temasUnicos.values());

            // Envia os dados processados para a View exibir
            ProcessoView.renderizarResultados(resultadosFiltrados, filaVTC);

        } catch (error) {
            console.error("Erro na camada Controlle/API:", error);
            ProcessoView.exibirAlerta("❌ Não foi possível realizar a consulta (Sistema Indisponível/Protegido).", "danger");
        }
    }
};

// Amarrar o clique do botão no DOM com a função do Module, 
// pois módulos com "export/import" perdem o escopo global pro onclick.
window.consultarProcesso = ProcessoController.consultarProcesso.bind(ProcessoController);
