// ============================================================
// JS PORTAL URE SUZANO — LÓGICA DE CONSULTA & UX
// Versão 11.0 Humanizada — Inteligência de Mensagens
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

    pResultado.innerHTML = `<div class="text-center py-4"><span class="spinner-border text-primary"></span><p class="mt-2 text-muted">Acessando base URE Suzano...</p></div>`;

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
            pResultado.innerHTML = `<div class="alert alert-info border-0 p-4 text-center shadow-sm w-100" style="border-radius: 12px; border-left: 8px solid #003366 !important; background: white;">
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

function formatarData(dataStr) {
    if (!dataStr) return "";
    return dataStr.split('-').reverse().join('/');
}

// --- MOTOR DE HUMANIZAÇÃO DIGITAL ---
function gerarMensagemHumanizada(processo) {
    const status = (processo.status || "").toUpperCase();
    const obs = (processo.observacoes || "").toUpperCase();
    const dEntrada = formatarData(processo.data_entrada);
    const dSaida = formatarData(processo.data_saida);
    
    // CASO 1: DEVOLVIDO / PENDÊNCIA
    if (status.includes("DEVOLVIDO") || obs.includes("DEVOLVIDO") || obs.includes("CORREÇÃO") || obs.includes("PENDÊNCIA") || obs.includes("AJUSTE")) {
        return `Prezado(a) servidor(a), informamos que em <b>${dSaida || dEntrada}</b> o seu processo foi analisado e foi identificada a necessidade de <b>correção ou complementação de documentos funcionais</b> para prosseguimento. O processo foi devolvido para a sua <b>Unidade Escolar</b> para que as providências necessárias sejam tomadas. Para maiores informações e orientações detalhadas, por favor, entre em contato diretamente com a gerência de sua Unidade Escolar.`;
    }
    
    // CASO 2: FINALIZADO / CONCLUÍDO
    if (status.includes("FINALIZADO") || status.includes("CONCLUÍDO") || obs.includes("CONCLUIDA") || obs.includes("CONCLUÍDO")) {
        return `Prezado(a) servidor(a), temos a satisfação de informar que seu processo foi <b>concluído com sucesso</b> pela equipe técnica da URE Suzano em <b>${dSaida || dEntrada}</b>. O resultado oficial já foi devidamente encaminhado para a sua <b>Unidade Escolar</b> para os devidos registros e ciência. Parabenizamos pela conclusão deste ciclo administrativo!`;
    }
    
    // CASO 3: EM ANÁLISE / ANDAMENTO
    return `Prezado(a) servidor(a), seu processo deu entrada nesta Regional em <b>${dEntrada}</b> e encontra-se atualmente em nossa <b>fila de análise técnica</b>. Fique tranquilo(a), nossa equipe está trabalhando com cuidado para processar sua solicitação seguindo rigorosamente a ordem cronológica de chegada. Continue acompanhando por este canal para novas atualizações automáticas.`;
}

function renderizarResultados(resultados, container) {
    container.innerHTML = "";
    
    resultados.forEach(processo => {
        const interessado = (processo.nome || "INTERESSADO NÃO INFORMADO").toUpperCase();
        const tema = (processo.tema || "NÃO INFORMADO").toUpperCase();
        const protocoloVal = processo.protocolo || "---";
        const stDisplay = (processo.status || "EM ANÁLISE").toUpperCase();
        const obsLimpa = (processo.observacoes || "").toUpperCase();
        const obsLower = obsLimpa.toLowerCase();
        
        const dataEntrada = formatarData(processo.data_entrada);
        const dataSaida = formatarData(processo.data_saida);
        const exibicaoEscola = (processo.escola || "URE SUZANO").toUpperCase();

        const isVTC = tema.includes("VTC");
        const isQuinquenio = tema.includes("QUINQUÊNIO") || tema.includes("QUINQUENIO");
        const isContagemTempo = tema.includes("CONTAGEM") && tema.includes("TEMPO");
        
        let isRealmenteDevolvido = obsLower.includes("devolvido") || obsLower.includes("correção") || obsLower.includes("pendencia");
        let isEmAndamento = stDisplay.includes("ANALISE") || stDisplay.includes("ANDAMENTO") || stDisplay.includes("ENTRADA") || obsLower.includes("analise") || obsLower.includes("andamento");
        let isFinalizado = stDisplay.includes("FINALIZADO") || stDisplay.includes("CONCLUÍDO") || stDisplay.includes("CONCLUIDO");

        // Borda fixa Azul Marinho (#003366) Evolution
        let corBorda = "#003366";
        let corBadge = isFinalizado ? "bg-success text-white" : (isEmAndamento ? "bg-warning text-dark" : "bg-primary text-white");
        let iconeBadge = isFinalizado ? "bi-check-circle-fill" : (isEmAndamento ? "bi-shield-fill-exclamation" : "bi-hourglass-split");

        // Detector de DOE
        let exibicaoDOE = "";
        if (tema.includes("APOSENTADORIA")) {
            const match = obsLimpa.match(/(?:DOE)[\s\-,:]*([\d]{2}\/[\d]{2}\/[\d]{4})/);
            if (match && match[1]) {
                exibicaoDOE = `<span class="mx-2 text-muted fw-normal">|</span><span class="text-secondary small fw-bold"><i class="bi bi-newspaper me-1"></i> DOE: ${match[1]}</span>`;
            }
        }

        // Box de Fila Azul Harmony
        let filaHtml = "";
        if (isVTC && isEmAndamento && processo._posicaoFila) {
            const dPrev = new Date();
            dPrev.setDate(dPrev.getDate() + (processo._diasEstimados || 60));
            const dataEstimada = dPrev.toLocaleDateString('pt-BR');

            filaHtml = `
            <div class="mt-3 p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 d-flex align-items-center justify-content-between shadow-sm animate__animated animate__fadeIn">
                <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                        <i class="bi bi-people-fill fs-5"></i>
                    </div>
                    <div>
                        <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Fila de Análise</span>
                        <span class="fs-5 fw-bold text-dark text-nowrap">${processo._posicaoFila}º Lugar</span>
                    </div>
                </div>
                <div class="text-end border-start ps-3 border-primary border-opacity-25">
                    <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Análise Estimada</span>
                    <span class="fs-5 fw-bold text-primary text-nowrap"><i class="bi bi-calendar-check me-1"></i>${dataEstimada}</span>
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

                <div class="card border-0 mb-4 shadow-sm w-100" style="border-radius: 12px; border-left: 8px solid ${corBorda} !important;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge ${corBadge} position-absolute top-0 end-0 m-3 px-3 py-2 rounded-3 shadow-sm" style="font-size: 0.75rem;">
                            <i class="bi ${iconeBadge} me-1"></i> ${stDisplay}
                        </span>
                        
                        <h4 class="fw-bold mb-1 text-dark" style="letter-spacing: -0.5px;">${interessado}</h4>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-2 fw-bold" style="font-size: 0.8rem; color: #868e96;">
                            <span class="badge bg-light text-secondary border me-2" style="font-size: 0.65rem;">TEMA: ${tema}</span>
                            <span>PROT: <span class="text-primary">${protocoloVal}</span></span>
                            ${dataEntrada ? `<span class="mx-2 text-muted fw-normal">|</span><span>ENTRADA: ${dataEntrada}</span>` : ""}
                            ${dataSaida ? `<span class="mx-2 text-muted fw-normal">|</span><span class="text-success fw-bold">SAÍDA: ${dataSaida}</span>` : ""}
                            ${exibicaoDOE}
                        </div>
                        
                        ${filaHtml}
                        
                        <div class="d-flex justify-content-between align-items-center pt-3 mt-3 border-top" style="border-top-color: #f1f3f5 !important;">
                            <p class="mb-0 small text-secondary">
                                <i class="bi bi-building me-1 fs-6 text-primary"></i> ${exibicaoEscola}
                            </p>
                            <button class="btn btn-sm shadow-sm font-weight-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${processo.id}" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 50px; padding: 6px 16px; font-weight: 600;">
                                Mais Detalhes <i class="bi bi-chevron-down ms-1"></i>
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapse_${processo.id}">
                            <div class="p-3 rounded-3 border-start border-3 border-primary ${isEmAndamento ? 'bg-warning bg-opacity-10' : 'bg-light'} shadow-sm">
                                <h6 class="fw-bold text-dark mb-2 small"><i class="bi bi-chat-left-dots-fill me-1 text-primary"></i> Comunicado ao Servidor:</h6>
                                <p class="mb-0 text-dark" style="line-height: 1.6; font-size: 0.9rem;">
                                    ${gerarMensagemHumanizada(processo)}
                                </p>
                                <hr class="my-2 opacity-10">
                                <p class="small text-muted mb-0" style="font-size: 0.75rem;"><b>Nota Técnica:</b> ${(processo.observacoes || "Fila cronológica normal.").toUpperCase()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += card;
    });
}
