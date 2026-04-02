// ============================================================
// JS PORTAL URE SUZANO — LÓGICA DE CONSULTA & UX
// Versão 10.0 Evolution Platinum — Azul & Gold Harmony
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

    const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value;
    if (!turnstileToken) {
        pResultado.innerHTML = `<div class="alert alert-danger border-0 animate__animated animate__shakeX">⚠️ Verificação de segurança (Anti-Robô) pendente ou expirada.</div>`;
        return;
    }

    pResultado.innerHTML = `<div class="text-center py-4"><span class="spinner-border text-primary"></span><p class="mt-2 text-muted">Buscando na base URE Suzano...</p></div>`;

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
            pResultado.innerHTML = `<div class="alert alert-info border-0 p-4 text-center shadow-sm" style="border-radius: 12px; border-left: 8px solid #003366 !important;">
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
        const interessado = (processo.nome || "INTERESSADO NÃO INFORMADO").toUpperCase();
        const tema = (processo.tema || "NÃO INFORMADO").toUpperCase();
        const protocoloValue = processo.protocolo || "---";
        const stDisplay = (processo.status || "EM ANÁLISE").toUpperCase();
        const obsLimpa = (processo.observacoes || "").toUpperCase();
        const obsLower = obsLimpa.toLowerCase();
        const dataEntrada = processo.data_entrada ? processo.data_entrada.split('-').reverse().join('/') : "";
        const exibicaoEscola = (processo.escola || "URE SUZANO").toUpperCase();

        const isVTC = tema.includes("VTC");
        const isQuinquenio = tema.includes("QUINQUÊNIO") || tema.includes("QUINQUENIO");
        const isContagemTempo = tema.includes("CONTAGEM") && tema.includes("TEMPO");
        
        let isRealmenteDevolvido = obsLower.includes("devolvido") || obsLower.includes("correção") || obsLower.includes("pendencia");
        let isEmAndamento = stDisplay.includes("ANALISE") || stDisplay.includes("ANDAMENTO") || stDisplay.includes("ENTRADA") || obsLower.includes("analise") || obsLower.includes("andamento");
        let isFinalizado = stDisplay.includes("FINALIZADO") || stDisplay.includes("CONCLUÍDO") || stDisplay.includes("CONCLUIDO");

        // --- COLORS EVOLUTION V10.0 ---
        let corBorda = "#003366"; // Azul Marinho solicitado
        let corBadge = isFinalizado ? "bg-success text-white" : (isEmAndamento ? "bg-warning text-dark" : "bg-primary text-white");
        let iconeBadge = isFinalizado ? "bi-check-circle-fill" : (isEmAndamento ? "bi-shield-fill-exclamation" : "bi-hourglass-split");

        // Detector de DOE (Aposentadoria)
        let exibicaoDataDOE = "";
        if (tema.includes("APOSENTADORIA")) {
            const match = obsLimpa.match(/(?:DOE)[\s\-,:]*([\d]{2}\/[\d]{2}\/[\d]{4})/);
            if (match && match[1]) {
                exibicaoDataDOE = `<span class="mx-2 text-muted fw-normal">|</span><span class="text-secondary small fw-bold"><i class="bi bi-newspaper me-1"></i> DOE: ${match[1]}</span>`;
            }
        }

        // --- BOX DE FILA (TEMA AZUL HARMONY) ---
        let filaHtml = "";
        if (isVTC && isEmAndamento && processo._posicaoFila) {
            const dPrev = new Date();
            dPrev.setDate(dPrev.getDate() + (processo._diasEstimados || 60));
            const dataFmt = dPrev.toLocaleDateString('pt-BR');

            filaHtml = `
            <div class="mt-3 p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 d-flex align-items-center justify-content-between shadow-sm animate__animated animate__fadeIn">
                <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                        <i class="bi bi-people-fill fs-5"></i>
                    </div>
                    <div>
                        <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Fila Estimada</span>
                        <span class="fs-5 fw-bold text-dark text-nowrap">${processo._posicaoFila}º Lugar</span>
                    </div>
                </div>
                <div class="text-end border-start ps-3 border-primary border-opacity-25">
                    <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Previsão de Análise</span>
                    <span class="fs-5 fw-bold text-primary text-nowrap"><i class="bi bi-calendar-check me-1"></i>${dataFmt}</span>
                </div>
            </div>`;
        }

        const card = `
            <div class="col-12 animate__animated animate__zoomIn">
                ${isQuinquenio || isContagemTempo ? `
                <div class="alert border-0 shadow-sm mb-3 text-start alert-info" style="border-radius: 12px; border-left: 5px solid #003366 !important;">
                    <div class="d-flex align-items-center">
                        <i class="bi bi-info-circle-fill me-2 fs-5 text-primary"></i>
                        <div class="small mt-1 text-dark"><b>Aviso Legal:</b> Alta demanda para Contagem/Quinquênio (LC 173/2020).</div>
                    </div>
                </div>` : ""}

                <div class="card border-0 mb-4 shadow-sm" style="border-radius: 12px; border-left: 8px solid ${corBorda} !important;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge ${corBadge} position-absolute top-0 end-0 m-3 px-3 py-2 rounded-3 shadow-sm" style="font-size: 0.75rem;">
                            <i class="bi ${iconeBadge} me-1"></i> ${stDisplay}
                        </span>
                        
                        <h4 class="fw-bold mb-1 text-dark" style="letter-spacing: -0.5px;">${interessado}</h4>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-2 fw-bold" style="font-size: 0.8rem; color: #868e96;">
                            <span class="badge bg-light text-secondary border me-2" style="font-size: 0.65rem;">TEMA: ${tema}</span>
                            <span>PROT: <span class="text-primary">${protocoloValue}</span></span>
                            ${dataEntrada ? `<span class="mx-2 text-muted fw-normal">|</span><span>ENTRADA: ${dataEntrada}</span>` : ""}
                            ${exibicaoDataDOE}
                        </div>
                        
                        ${filaHtml}
                        
                        <div class="d-flex justify-content-between align-items-center pt-3 mt-3 border-top" style="border-top-color: #f1f3f5 !important;">
                            <p class="mb-0 small text-secondary">
                                <i class="bi bi-building me-1 fs-6 text-primary"></i> ${exibicaoEscola}
                            </p>
                            <button class="btn btn-sm shadow-sm font-weight-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${processo.id}" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 50px; padding: 6px 16px; font-weight: 600;">
                                Detalhes <i class="bi bi-chevron-down ms-1"></i>
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapse_${processo.id}">
                            <div class="p-3 rounded-3 border-start border-3 border-primary ${isEmAndamento ? 'bg-warning bg-opacity-10' : 'bg-light'} shadow-sm">
                                <h6 class="fw-bold text-dark mb-2 small"><i class="bi bi-chat-left-dots-fill me-1 text-primary"></i> Observações da Unidade:</h6>
                                <p class="mb-0 text-dark" style="line-height: 1.6; font-size: 0.9rem;">
                                    ${processo.observacoes || "Fila de análise técnica seguindo o fluxo cronológico da URE Suzano."}
                                </p>
                                ${isRealmenteDevolvido ? `<div class="mt-2 p-2 bg-danger bg-opacity-10 text-danger rounded border border-danger small"><i class="bi bi-info-circle-fill me-1"></i> Atenção: Necessita de Correções!</div>` : ""}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += card;
    });
}
