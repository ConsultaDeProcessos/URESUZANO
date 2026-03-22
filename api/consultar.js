export default async function handler(req, res) {
    // 1. TRAVA REAL CONTRA POSTMAN, SCRIPTS PYTHON E HACKERS (Verificação de Origin)
    const origin = req.headers.origin || "";
    const allowedOrigins = [
        'https://consultadeprocessos.github.io', // Site de Produção Oficial
        'http://127.0.0.1:5500',                // Live Server (Suas Edições Locais)
        'http://localhost:5500',
        'http://localhost:3000'
    ];

    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: "Acesso Negado: Você está tentando acessar de uma fonte não autorizada." });
    }

    // 2. CORS PARA O NAVEGADOR
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', origin); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Retorno rápido para requisições de preflight do CORS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { nome } = req.query;

    if (!nome) {
        return res.status(400).json({ error: "Por favor, digite um nome válido." });
    }

    const { SUPABASE_URL, SUPABASE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: "Erro interno no servidor: O Vercel não encontrou as credenciais do Supabase." });
    }

    const defaultHeaders = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        const nomeBusca = nome.trim().replace(/\s+/g, '*');

        const [resSefrep, resSeape] = await Promise.all([
            fetch(`${SUPABASE_URL}/rest/v1/sefrep_registros?nome=ilike.*${encodeURIComponent(nomeBusca)}*&select=*`, { headers: defaultHeaders }),
            fetch(`${SUPABASE_URL}/rest/v1/seape_registros?nome=ilike.*${encodeURIComponent(nomeBusca)}*&select=*`, { headers: defaultHeaders })
        ]);

        if (resSefrep.status === 429 || resSeape.status === 429) {
            return res.status(429).json({ error: "Limite de consultas atingido no Banco de Dados. Aguarde." });
        }

        const dadosSefrep = await resSefrep.json();
        const dadosSeape = await resSeape.json();

        let todosResultados = [
            ...(dadosSefrep || []).map(p => ({ ...p, origem: 'SEFREP' })),
            ...(dadosSeape || []).map(p => ({ ...p, origem: 'SEAPE' }))
        ];

        // Se houver Processo VTC não devolvido/negado, buscar a fila
        const temVTCAtivo = todosResultados.some(p => {
            const tema = (p.tema || "").toUpperCase();
            const obs = (p.observacoes || "").toLowerCase();
            return tema.includes("VTC") && 
                   !obs.includes("finalizado") && !obs.includes("analise concluida") && 
                   !obs.includes("devolvido") && !obs.includes("não faz jus") && !obs.includes("nao faz jus");
        });

        let filaAtivaVTC = [];
        if (temVTCAtivo) {
            const resFila = await fetch(`${SUPABASE_URL}/rest/v1/sefrep_registros?tema=ilike.*VTC*&or=(status.ilike.*lise*,status.ilike.*andamento*,status.ilike.*exig*)&select=id,data_entrada,created_at`, { headers: defaultHeaders });
            if (resFila.ok) {
                filaAtivaVTC = await resFila.json();
                filaAtivaVTC.sort((a, b) => {
                    const d1 = new Date(a.data_entrada || 0).getTime();
                    const d2 = new Date(b.data_entrada || 0).getTime();
                    if (d1 === d2) return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                    return d1 - d2;
                });
            }
        }

        return res.status(200).json({
            resultados: todosResultados,
            filaVTC: filaAtivaVTC
        });
    } catch (error) {
        console.error("Erro na Vercel API:", error);
        return res.status(500).json({ error: "Erro de comunicação com o banco de dados." });
    }
}
