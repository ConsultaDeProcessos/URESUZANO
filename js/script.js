// ============================================================
// JS PORTAL URE SUZANO — LÓGICA DE CONSULTA & UX
// Versão 9.5 Turbo Gold — Sincronizada com API v9.5
// ============================================================

const API_PRODUCTION = "https://admin-ure-privado.vercel.app/api/public_search";

async function consultarProcesso() {
    const pInput = document.getElementById("processoNumero");
    const pResultado = document.getElementById("resultadoProcesso");
    const pNumero = pInput.value.trim().toUpperCase();

    if (!pNumero) {
        pResultado.innerHTML = `<div class="alert alert-warning border-0 animate__animated animate__shakeX">⚠️ Digite o número do protocolo.</div>`;
        return;
    }

    // 1. Verificação do Turnstile (Captcha)
    const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileToken) {
        pResultado.innerHTML = `<div class="alert alert-danger border-0 animate__animated animate__shakeX">⚠️ Verificação de segurança (Anti-Robô) pendente ou expirada.</div>`;
        return;
    }

    pResultado.innerHTML = `<div class="text-center py-4"><span class="spinner-border text-primary"></span><p class="mt-2 text-muted">Consultando no Banco de Dados...</p></div>`;

    try {
        const response = await fetch(`${API_PRODUCTION}?protocolo=${encodeURIComponent(pNumero)}`, {
            method: 'GET',
            headers: { 'X-Turnstile-Token': turnstileToken }
        });

        const data = await response.json();

        if (!response.ok) {
            pResultado.innerHTML = `<div class="alert alert-danger border-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>${data.error || "Erro na consulta."}</div>`;
            return;
        }

        if (!data.resultados || data.resultados.length === 0) {
            pResultado.innerHTML = `<div class="alert alert-info border-0 p-4 text-center">
                <i class="bi bi-search fs-1 d-block mb-3 text-muted"></i>
                <h5 class="fw-bold">Nenhum processo encontrado</h5>
                <p class="small mb-0">Verifique se digitou o protocolo corretamente (Ex: S12345).<br>Lembramos que a busca deve ser <b>EXATA</b> para sua segurança.</p>
            </div>`;
            return;
        }

        renderizarResultados(data.resultados, pResultado);

    } catch (error) {
        pResultado.innerHTML = `<div class="alert alert-danger border-0">❌ Erro de conexão com o servidor. Tente novamente mais tarde.</div>`;
    }
}

function renderizarResultados(resultados, container) {
    container.innerHTML = "";
    
    resultados.forEach(processo => {
        const interessado = processo.nome || "INTERESSADO NÃO INFORMADO";
        const tema = (processo.tema || "NÃO INFORMADO").toUpperCase();
        const statusDisplay = (processo.status || "EM ANÁLISE").toUpperCase();
        const obsLower = (processo.observacoes || "").toLowerCase();
        const dataEntrada = processo.data_entrada ? processo.data_entrada.split('-').reverse().join('/') : "";
        const idCollapse = `details_${processo.id}`;

        // Lógica de Cores e Ícones
        let corBadge = "bg-primary";
        let iconeBadge = "bi-hourglass-split";
        const isEmAndamento = statusDisplay.includes("ANALISE") || statusDisplay.includes("ANDAMENTO") || statusDisplay.includes("ENTRADA");
        
        if (isEmAndamento) {
            corBadge = "bg-warning text-dark";
            iconeBadge = "bi-shield-fill-exclamation";
        } else if (statusDisplay.includes("FINALIZADO")) {
            corBadge = "bg-success";
            iconeBadge = "bi-check-circle-fill";
        }

        // Lógica de Fila (Turbo 9.5)
        let filaHtml = "";
        if (processo._posicaoFila) {
            const dataPrev = new Date();
            dataPrev.setDate(dataPrev.getDate() + (processo._diasEstimados || 60));
            const dataFormatada = dataPrev.toLocaleDateString('pt-BR');

            filaHtml = `
            <div class="mt-3 p-3 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 d-flex align-items-center justify-content-between">
                <div>
                    <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Posição na Fila</span>
                    <span class="fs-5 fw-bold text-dark"><i class="bi bi-people-fill me-1"></i>${processo._posicaoFila}º Lugar</span>
                </div>
                <div class="text-end">
                    <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Previsão de Análise</span>
                    <span class="fs-5 fw-bold text-primary"><i class="bi bi-calendar-check me-1"></i>${dataFormatada}</span>
                </div>
            </div>`;
        }

        const card = `
            <div class="card border-0 shadow-sm mb-4 animate__animated animate__fadeInUp" style="border-radius: 12px; border-left: 5px solid ${isEmAndamento ? '#ffc107' : '#0d6efd'} !important;">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h4 class="fw-bold mb-0 text-dark" style="letter-spacing: -0.5px;">${interessado}</h4>
                        <span class="badge ${corBadge} px-3 py-2 rounded-pill small">
                            <i class="bi ${iconeBadge} me-1"></i> ${statusDisplay}
                        </span>
                    </div>
                    
                    <div class="text-muted small mb-3">
                        <span class="me-3"><i class="bi bi-tag me-1"></i> ${tema}</span>
                        <span class="me-3"><i class="bi bi-hash me-1"></i> ${processo.protocolo}</span>
                        ${dataEntrada ? `<span><i class="bi bi-calendar3 me-1"></i> ENTRADA: ${dataEntrada}</span>` : ""}
                    </div>

                    ${filaHtml}

                    <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                        <span class="text-secondary small"><i class="bi bi-building me-1"></i> ${processo.escola || "URE SUZANO"}</span>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" type="button" data-bs-toggle="collapse" data-bs-target="#${idCollapse}">
                            Ver Detalhes do Processo <i class="bi bi-chevron-down ms-1"></i>
                        </button>
                    </div>

                    <div class="collapse mt-3" id="${idCollapse}">
                        <div class="p-3 bg-light rounded-3 small text-dark border">
                            <h6 class="fw-bold border-bottom pb-2 mb-2"><i class="bi bi-info-circle me-1"></i> Observações da Análise:</h6>
                            ${processo.observacoes || "Nenhuma observação adicional no momento. O processo segue o fluxo normal de análise."}
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += card;
    });
}
