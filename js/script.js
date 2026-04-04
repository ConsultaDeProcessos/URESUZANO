// ============================================================ 
// JS PORTAL URE SUZANO — LÓGICA DE CONSULTA & UX 
// Versão 12.1.0 — Segurança Máxima (LGPD + Anti-XSS)
// ============================================================ 

const API_PRODUCTION = "https://admin-ure-privado.vercel.app/api/public_search";

// --- FUNÇÃO DE SANITIZAÇÃO (Proteção Anti-XSS) ---
function sanitizar(str) {
    if (!str) return "";
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    const reg = /[&<>"'/]/ig;
    return str.replace(reg, (match) => map[match]);
}

async function consultarProcesso() {
    const pInput = document.getElementById("processoNumero");
    const pResultado = document.getElementById("resultadoProcesso");
    const pNumero = pInput.value.trim().toUpperCase();

    if (!pNumero) {
        pResultado.innerHTML = `<div class="alert alert-warning border-0 animate__animated animate__shakeX">⚠️ Digite o número do protocolo.</div>`;
        return;
    }

    const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileToken) {
        pResultado.innerHTML = `<div class="alert alert-danger border-0 animate__animated animate__shakeX">⚠️ Verificação de segurança (Anti-Robô) pendente ou expirada.</div>`;
        return;
    }

    pResultado.innerHTML = `<div class="text-center py-4"><span class="spinner-border text-primary"></span><p class="mt-2 text-muted">Acessando base URE Suzano...</p></div>`;

    try {
        const response = await fetch(`${API_PRODUCTION}?protocolo=${encodeURIComponent(pNumero)}`, {
            method: 'GET',
            headers: { 'X-Turnstile-Token': turnstileToken }
        });

        const data = await response.json();

        if (!response.ok) {
            pResultado.innerHTML = `<div class="alert alert-danger border-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>${sanitizar(data.error || "Erro na consulta.")}</div>`;
            return;
        }

        const listaResultados = data.resultados || data;

        if (!listaResultados || listaResultados.length === 0) {
            pResultado.innerHTML = `<div class="alert alert-info border-0 p-4 text-center shadow-sm w-100" style="border-radius: 12px; border-left: 8px solid #003366 !important; background: white; border: 1px solid #dee2e6;">
                <i class="bi bi-search fs-1 d-block mb-3 text-muted"></i>
                <h5 class="fw-bold">Nenhum processo encontrado</h5>
                <p class="small mb-0">Verifique se digitou o protocolo corretamente (Ex: S12345).</p>
            </div>`;
            return;
        }

        renderizarResultados(listaResultados, pResultado);

    } catch (error) {
        pResultado.innerHTML = `<div class="alert alert-danger border-0">❌ Erro de conexão com o servidor. Tente novamente mais tarde.</div>`;
    }
}

function formatarData(dataStr) {
    if (!dataStr) return "";
    return dataStr.split('-').reverse().join('/');
}

function gerarMensagemHumanizada(processo) {
    // Sanitizamos os campos antes de usar na lógica de mensagens
    const status = sanitizar(processo.status || "").toUpperCase();
    const tema = sanitizar(processo.tema || "").toUpperCase();
    const obs = sanitizar(processo.observacoes || "").toUpperCase();
    const dEntrada = formatarData(processo.data_entrada);
    const dSaida = formatarData(processo.data_saida);
    const context = (tema + " " + obs).toUpperCase();
    const posicao = processo._posicaoFila ? `${processo._posicaoFila}º lugar` : "ainda em processamento";

    const FECHO = "Caso necessite de esclarecimentos, procure a gerência de sua unidade escolar.";
    
    if (context.includes("NÃO FAZ JUS") || status.includes("INDEFERIDO")) {
        return `Prezado(a) servidor(a), seu processo foi analisado em ${dSaida || dEntrada} e os requisitos não foram preenchidos. O processo retornou à Unidade Escolar. ${FECHO}`;
    }

    if (status.includes("DEVOLVIDO") || context.includes("CORREÇÃO")) {
        return `Prezado(a) servidor(a), em ${dSaida || dEntrada} foi identificada a necessidade de correção de documentos. O processo retornou à sua Unidade Escolar.`;
    }
    
    if (status.includes("FINALIZADO") || status.includes("CONCLUÍDO")) {
        return `Prezado(a) servidor(a), seu processo foi concluído em ${dSaida || dEntrada}. Já retornou à Unidade Escolar para ciência e registros.`;
    }
    
    if (status.includes("ANALISE") || status.includes("ANDAMENTO")) {
        return `Prezado(a) servidor(a), seu processo deu entrada em ${dEntrada} e está na posição ${posicao}, aguardando análise.`;
    }

    return `Prezado(a) servidor(a), seu processo encontra-se em trâmite técnico. Acompanhe este portal para atualizações.`;
}

function renderizarResultados(resultados, container) {
    container.innerHTML = "";
    
    resultados.forEach(processo => {
        // Sanitização de todos os campos que vão para o HTML
        const interessado = sanitizar(processo.nome || "INTERESSADO NÃO INFORMADO").toUpperCase();
        const tema = sanitizar(processo.tema || "NÃO INFORMADO").toUpperCase();
        const protocoloVal = sanitizar(processo.protocolo || "---");
        const stDisplay = sanitizar(processo.status || "EM ANÁLISE").toUpperCase();
        const exibicaoEscola = sanitizar(processo.escola || "URE SUZANO").toUpperCase();
        
        const dataEntrada = formatarData(processo.data_entrada);
        const dataSaida = formatarData(processo.data_saida);

        const isEmAndamento = stDisplay.includes("ANÁLISE") || stDisplay.includes("ANDAMENTO");
        const isFinalizado = stDisplay.includes("FINALIZADO") || stDisplay.includes("CONCLUÍDO");

        let EstiloBadge = isFinalizado ? "color: #198754; border: 1.5px solid #198754;" : "color: #003366; border: 1.5px solid #003366;";

        let filaHtml = "";
        if (isEmAndamento && processo._posicaoFila) {
            const dPrev = new Date();
            dPrev.setDate(dPrev.getDate() + (processo._diasEstimados || 60));
            filaHtml = `
            <div class="mt-3 p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 d-flex align-items-center justify-content-between">
                <div>
                    <span class="d-block small text-muted fw-bold" style="font-size:0.6rem;">FILA DE ANÁLISE</span>
                    <span class="fs-5 fw-bold text-dark">${processo._posicaoFila}º Lugar</span>
                </div>
                <div class="text-end">
                    <span class="d-block small text-muted fw-bold" style="font-size:0.6rem;">PREVISÃO</span>
                    <span class="fs-5 fw-bold text-primary">${dPrev.toLocaleDateString('pt-BR')}</span>
                </div>
            </div>`;
        }

        const card = `
            <div class="col-12 animate__animated animate__zoomIn">
                <div class="card mb-4 shadow-sm" style="border-radius: 12px; border-left: 8px solid #003366 !important; border: 1px solid #dee2e6; background: white;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge position-absolute top-0 end-0 m-3 px-3 py-2 rounded-3" style="font-size: 0.72rem; background: white; ${EstiloBadge}">
                            ${stDisplay}
                        </span>
                        
                        <h4 class="fw-bold mb-1 text-dark">${interessado}</h4>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-2 fw-bold" style="font-size: 0.8rem; color: #868e96;">
                            <span class="badge bg-light text-secondary border me-2">TEMA: ${tema}</span>
                            <span>PROT: <span class="text-primary">${protocoloVal}</span></span>
                            <span class="mx-2 text-muted">|</span>
                            <span>ENTRADA: <span class="text-primary">${dataEntrada}</span></span>
                        </div>

                        ${filaHtml}
                        
                        <div class="d-flex justify-content-between align-items-center pt-3 mt-3 border-top">
                            <p class="mb-0 small text-secondary">
                                <i class="bi bi-building me-1 text-primary"></i> ${exibicaoEscola}
                            </p>
                            <button class="btn btn-sm btn-light rounded-pill px-3 fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${processo.id}">
                                Ver Detalhes <i class="bi bi-chevron-down ms-1"></i>
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapse_${processo.id}">
                            <div class="p-4 rounded-3 border-start border-3 bg-light shadow-sm" style="border-left: 6px solid #003366 !important;">
                                <p class="mb-0 text-dark" style="line-height: 1.6; font-size: 0.95rem;">
                                    ${gerarMensagemHumanizada(processo)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += card;
    });
}
