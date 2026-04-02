// ============================================================
// JS PORTAL URE SUZANO — LÓGICA DE CONSULTA & UX
// Versão 9.7 PLATINUM UX — Sincronizada com API v9.7
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
        const interessado = (processo.nome || "INTERESSADO NÃO INFORMADO").toUpperCase();
        const tema = (processo.tema || "NÃO INFORMADO").toUpperCase();
        const protocolo = processo.protocolo || "---";
        const statusDisplay = (processo.status || "EM ANÁLISE").toUpperCase();
        const obsLimpa = (processo.observacoes || "").toUpperCase();
        const obsLower = obsLimpa.toLowerCase();
        const dataEntrada = processo.data_entrada ? processo.data_entrada.split('-').reverse().join('/') : "";
        const dataSaida = processo.data_saida ? processo.data_saida.split('-').reverse().join('/') : "";
        const exibicaoEscola = (processo.escola || "URE SUZANO").toUpperCase();

        const isVTC = tema.includes("VTC");
        const isQuinquenio = tema.includes("QUINQUÊNIO") || tema.includes("QUINQUENIO");
        const isContagemTempo = tema.includes("CONTAGEM") && tema.includes("TEMPO");
        
        let isRealmenteDevolvido = obsLower.includes("devolvido") || obsLower.includes("correção") || obsLower.includes("pendencia");
        let isEmAndamento = statusDisplay.includes("ANALISE") || statusDisplay.includes("ANDAMENTO") || statusDisplay.includes("ENTRADA");
        let isFinalizado = statusDisplay.includes("FINALIZADO") || statusDisplay.includes("CONCLUÍDO") || statusDisplay.includes("CONCLUIDO");

        // Definição de Cores Premium (Bordas de 8px e Vibrantes)
        let classeCorLateral = "border-left-primary";
        let corBadge = "bg-primary text-white";
        let iconeBadge = "bi-hourglass-split";

        if (isRealmenteDevolvido) {
            classeCorLateral = "border-left-danger";
            corBadge = "bg-danger text-white";
            iconeBadge = "bi-exclamation-octagon-fill";
        } else if (isEmAndamento) {
            classeCorLateral = "border-left-warning";
            corBadge = "bg-warning text-dark";
            iconeBadge = "bi-shield-fill-exclamation";
        } else if (isFinalizado) {
            classeCorLateral = "border-left-success";
            corBadge = "bg-success text-white";
            iconeBadge = "bi-check-circle-fill";
        }

        // Lógica de Datas e DOE (Detector Automático)
        let exibicaoDataDOE = "";
        if (tema.includes("APOSENTADORIA")) {
            const regexDOE = /(?:DOE)[\s\-,:]*([\d]{2}\/[\d]{2}\/[\d]{4})/i;
            const match = obsLimpa.match(regexDOE);
            if (match && match[1]) {
                exibicaoDataDOE = `<span class="mx-2 text-muted fw-normal">|</span><span class="text-secondary"><i class="bi bi-newspaper me-1"></i> PUBLICAÇÃO EM DOE: <span class="fw-bold text-dark">${match[1]}</span></span>`;
            }
        }

        // Lógica de Fila (Turbo 9.7 Platinum)
        let infoFilaHtml = "";
        if (isVTC && isEmAndamento && processo._posicaoFila) {
            const dataPrev = new Date();
            dataPrev.setDate(dataPrev.getDate() + (processo._diasEstimados || 60));
            const dataFormatada = dataPrev.toLocaleDateString('pt-BR');

            infoFilaHtml = `
            <div class="mt-3 p-3 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded-3 d-flex align-items-center justify-content-between shadow-sm animate__animated animate__fadeIn">
                <div class="d-flex align-items-center">
                    <div class="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                        <i class="bi bi-people-fill fs-5"></i>
                    </div>
                    <div>
                        <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Posição na Fila</span>
                        <span class="fs-5 fw-bold text-dark">${processo._posicaoFila}º Lugar</span>
                    </div>
                </div>
                <div class="text-end border-start ps-3 border-warning border-opacity-25">
                    <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Previsão Estimada</span>
                    <span class="fs-5 fw-bold text-primary"><i class="bi bi-calendar-check me-1"></i>${dataFormatada}</span>
                </div>
            </div>`;
        }

        const card = `
            <div class="col-12 animate__animated animate__zoomIn">
                ${isQuinquenio || isContagemTempo ? `
                <div class="alert border-0 shadow-sm mb-3 text-start animate__animated animate__flash" style="background-color: #fff4e5; border-radius: 12px; border-left: 5px solid #ff9800 !important;">
                    <div class="d-flex">
                        <i class="bi bi-info-circle-fill me-2 fs-5 text-warning"></i>
                        <div class="small text-dark mt-1">
                            <b>Aviso Legal (LC 173/2020):</b> Devido ao recente descongelamento do tempo de serviço, há uma alta demanda de processos de Contagem de Tempo e Quinquênio. Agradecemos a compreensão.
                        </div>
                    </div>
                </div>
                ` : ""}

                <div class="card border-0 mb-4 mx-auto shadow-sm text-start w-100" style="border-radius: 12px; border-left: 8px solid ${isRealmenteDevolvido ? '#dc3545' : (isEmAndamento ? '#ffc107' : '#198754')} !important;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge ${corBadge} position-absolute top-0 end-0 m-3 px-3 py-2 rounded-3 shadow-sm animate__animated animate__bounceIn" style="font-size: 0.75rem; letter-spacing: 0.5px;">
                            <i class="bi ${iconeBadge} me-1"></i> ${statusDisplay}
                        </span>
                        
                        <h4 class="fw-bold mb-1 text-dark" style="letter-spacing: -0.5px;">${interessado}</h4>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-2 fw-bold" style="font-size: 0.8rem; color: #868e96; letter-spacing: 0.2px;">
                            <span class="badge bg-light text-secondary border border-secondary-subtle me-2" style="font-size: 0.70rem; letter-spacing: 0.5px;">TEMA: ${tema}</span>
                            <span>PROT: <span class="text-primary">${protocolo}</span></span>
                            ${dataEntrada ? `<span class="mx-2 text-muted fw-normal">|</span><span>ENTRADA: <span class="text-secondary fw-normal">${dataEntrada}</span></span>` : ""}
                            ${exibicaoDataDOE}
                        </div>
                        
                        ${infoFilaHtml}
                        
                        <div class="d-flex justify-content-between align-items-center flex-wrap pt-3 mt-3 border-top" style="border-top-color: #f1f3f5 !important;">
                            <p class="mb-0 d-flex align-items-center" style="font-size: 0.85rem; color: #6c757d; letter-spacing: 0.2px;">
                                <i class="bi bi-building me-2 fs-5 text-primary"></i> ${exibicaoEscola}
                            </p>
                            <button class="btn btn-detalhes shadow-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${processo.id}" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 50px; padding: 6px 18px; font-size: 0.85rem; font-weight: 600; transition: all 0.3s ease;">
                                Detalhes do Processo <i class="bi bi-chevron-down ms-1"></i>
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapse_${processo.id}">
                            <div class="p-3 bg-light rounded-3 border-start border-3 border-primary shadow-sm" style="min-height: 80px;">
                                <h6 class="fw-bold text-dark mb-2" style="font-size: 0.9rem;"><i class="bi bi-chat-left-dots-fill me-1 text-primary"></i> Observações da Unidade:</h6>
                                <p class="mb-0 text-secondary" style="line-height: 1.6; font-size: 0.9rem;">
                                    ${processo.observacoes || "Processo seguindo o fluxo normal de análise documental pela equipe técnica da URE Suzano."}
                                </p>
                                ${isRealmenteDevolvido ? `<div class="mt-2 p-2 bg-danger bg-opacity-10 text-danger rounded border border-danger border-opacity-25 small"><i class="bi bi-info-circle-fill me-1"></i> Atenção: Sua unidade precisa realizar correções conforme as observações acima.</div>` : ""}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += card;
    });
}
