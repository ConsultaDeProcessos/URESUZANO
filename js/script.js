// ============================================================ 
// JS PORTAL URE SUZANO — LÓGICA DE CONSULTA & UX 
// Versão 11.9.4 — Restauração Integral das Mensagens
// ============================================================ 

const API_PRODUCTION = "https://admin-ure-privado.vercel.app/api/public_search";

// Função de Sanitização (Escape Seguro)
function sanitizar(str) {
    if (!str) return "";
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', "/": '&#x2F;' };
    return str.toString().replace(/[&<>"'/]/ig, (m) => map[m]);
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
        const listaResultados = data.resultados || data;

        if (!response.ok || !listaResultados || listaResultados.length === 0) {
            pResultado.innerHTML = `<div class="alert alert-info border-0 p-4 text-center shadow-sm w-100" style="border-radius: 12px; border-left: 8px solid #003366 !important; background: white; border: 1px solid #dee2e6;">
                <i class="bi bi-search fs-1 d-block mb-3 text-muted"></i>
                <h5 class="fw-bold">Nenhum processo encontrado</h5>
                <p class="small mb-0">Verifique se digitou o protocolo corretamente (Ex: S12345).<br>Lembramos que a busca deve ser <b>EXATA</b> para sua segurança.</p>
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

// --- MOTOR DE HUMANIZAÇÃO (100% ORIGINAL) ---
function gerarMensagemHumanizada(processo) {
    const status = (processo.status || "").toUpperCase();
    const tema = (processo.tema || "").toUpperCase();
    const obs = (processo.observacoes || "").toUpperCase();
    const dEntrada = formatarData(processo.data_entrada);
    const dSaida = formatarData(processo.data_saida);
    const context = (tema + " " + obs).toUpperCase();
    const posicao = processo._posicaoFila ? `${processo._posicaoFila}º lugar` : "ainda em processamento";

    const FECHO_CONSULTIVO = "Caso necessite de esclarecimentos, orientamos que procure diretamente a gerência de sua unidade escolar para o atendimento necessário.";
    
    // SITUAÇÃO: NÃO FAZ JUS
    if (context.includes("NÃO FAZ JUS") || context.includes("REVISADO") || context.includes("INDEFERIDO") || status.includes("INDEFERIDO")) {
        return `Prezado(a) servidor(a), informamos que o seu processo de VTC foi devidamente analisado por esta Unidade Regional de Ensino em ${dSaida || dEntrada}. Com base na legislação vigente, em especial aos critérios estabelecidos pela Lei Complementar nº 1.354/2020 e pela Emenda Constitucional nº 103/2019, foi identificado que os requisitos necessários para a concessão do benefício pleiteado ainda não foram integralmente preenchidos nesta data. O seu processo, com a devida validação do Tempo de Contribuição, já retornou para a Unidade Escolar. ${FECHO_CONSULTIVO}`;
    }

    // SITUAÇÃO: DEVOLVIDO
    if (status.includes("DEVOLVIDO") || context.includes("DEVOLVIDO") || context.includes("CORREÇÃO") || context.includes("CORRECAO")) {
        return `Prezado(a) servidor(a), informamos que em ${dSaida || dEntrada} o seu processo foi analisado por esta Unidade Regional de Ensino e foi identificada a necessidade de correção ou complementação de documentos funcionais para prosseguimento. O processo retornou para a sua Unidade Escolar para que as providências necessárias sejam tomadas. Caso necessite de orientações detalhadas, por favor, procure a gerência de sua Unidade Escolar para o atendimento necessário.`;
    }
    
    // SITUAÇÃO: CONCLUÍDO
    if (status.includes("FINALIZADO") || (status.includes("ANÁLISE") === false && (status.includes("CONCLUÍDO") || status.includes("CONCLUIDO") || context.includes("CONCLUIDO")))) {
        if (context.includes("ABONO")) {
            return `Prezado(a) servidor(a), informamos que o seu processo de VTC foi devidamente concluído por esta Unidade Regional de Ensino em ${dSaida || dEntrada}. O seu processo, com a devida validação do Tempo de Contribuição, já retornou para a Unidade Escolar para ciência e registros fundamentais. Ressaltamos que, para fins de pagamento do seu Abono de Permanência, é necessário providenciar os ANEXOS e CÓPIAS de documentações pertinentes e encaminhá-los para este setor. Para o prosseguimento quanto à concessão de aposentadoria, por favor, realize a solicitação diretamente junto ao setor SEAPE em sua Unidade Escolar.`;
        }
        if (context.includes("APOSENTADORIA") || context.includes("VTC")) {
            return `Prezado(a) servidor(a), informamos que o seu processo de VTC foi devidamente concluído por esta Unidade Regional de Ensino em ${dSaida || dEntrada}. O seu processo, com a devida validação do Tempo de Contribuição, já retornou para a Unidade Escolar para ciência e registros. Orientamos que o(a) servidor(a) agora proceda com o trâmite necessário para solicitar a concessão de aposentadoria diretamente junto ao setor SEAPE em sua Unidade Escolar.`;
        }
        return `Prezado(a) servidor(a), informamos que o seu processo foi devidamente concluído por esta Unidade Regional de Ensino em ${dSaida || dEntrada}. O seu processo validado já retornou para a Unidade Escolar. ${FECHO_CONSULTIVO}`;
    }
    
    // SITUAÇÃO: EM ANÁLISE
    if (status.includes("ANALISE") || status.includes("ANÁLISE") || status.includes("ANDAMENTO") || status.includes("ENTRADA")) {
        return `Prezado(a) servidor(a), informamos que seu processo deu entrada nesta Unidade Regional de Ensino em ${dEntrada} e encontra-se atualmente na posição ${posicao}, aguardando análise dos documentos pessoais e funcionais. Nossa equipe está processando as solicitações seguindo rigorosamente a ordem cronológica de chegada para garantir a isonomia no atendimento. Recomendamos o acompanhamento periódico por este canal oficial.`;
    }

    return `Prezado(a) servidor(a), informamos que o seu processo encontra-se em trâmite técnico nesta Unidade Regional de Ensino. Por favor, acompanhe regularmente este portal para novas atualizações.`;
}

function renderizarResultados(resultados, container) {
    container.innerHTML = "";
    
    resultados.forEach(processo => {
        // Obter a mensagem original pura
        const mensagemOriginal = gerarMensagemHumanizada(processo);

        // Sanitizar dados para o Card
        const interessado = sanitizar(processo.nome || "INTERESSADO NÃO INFORMADO").toUpperCase();
        const tema = sanitizar(processo.tema || "NÃO INFORMADO").toUpperCase();
        const protocoloVal = sanitizar(processo.protocolo || "---");
        const stDisplay = sanitizar(processo.status || "EM ANÁLISE").toUpperCase();
        const obsLimpa = (processo.observacoes || "").toUpperCase();
        
        const dataEntrada = formatarData(processo.data_entrada);
        const dataSaida = formatarData(processo.data_saida);
        const exibicaoEscola = sanitizar(processo.escola || "URE SUZANO").toUpperCase();

        const isEmAndamento = stDisplay.includes("ANÁLISE") || stDisplay.includes("ANALISE") || stDisplay.includes("ANDAMENTO") || stDisplay.includes("ENTRADA");
        const isFinalizado = stDisplay.includes("FINALIZADO") || stDisplay.includes("CONCLUÍDO") || stDisplay.includes("CONCLUIDO");
        const isNaoFazJus = obsLimpa.includes("NÃO FAZ JUS") || obsLimpa.includes("NAO FAZ JUS") || obsLimpa.includes("INDEFERIDO");
        const isRealmenteDevolvido = stDisplay.includes("DEVOLVIDO") || obsLimpa.includes("DEVOLVIDO");

        let corBorda = "#003366"; 
        let EstiloBadge = isFinalizado ? "background-color: white; color: #198754; border: 1.5px solid #198754; font-weight: bold;" : "background-color: white; color: #003366; border: 1.5px solid #003366; font-weight: bold;";
        let iconeBadge = isFinalizado ? "bi-check-circle-fill" : "bi-hourglass-split";

        const corBordaComunicado = (isRealmenteDevolvido || isNaoFazJus) ? "#dc3545" : "#003366";

        let filaHtml = "";
        if (isEmAndamento && processo._posicaoFila) {
            const diasFila = Math.min(120, 30 + (processo._posicaoFila * 5));
            const dPrev = new Date();
            dPrev.setDate(dPrev.getDate() + diasFila);
            const dataEstimada = dPrev.toLocaleDateString('pt-BR');

            filaHtml = `
            <div class="mt-3 p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 d-flex align-items-center justify-content-between shadow-sm">
                <div class="d-flex align-items-center">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;"><i class="bi bi-people-fill fs-5"></i></div>
                    <div>
                        <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Fila de Análise</span>
                        <span class="fs-5 fw-bold text-dark text-nowrap">${processo._posicaoFila}º Lugar</span>
                    </div>
                </div>
                <div class="text-end border-start ps-3 border-primary border-opacity-25">
                    <span class="d-block small text-muted text-uppercase fw-bold" style="font-size:0.6rem;">Previsão Estimada</span>
                    <span class="fs-5 fw-bold text-primary text-nowrap"><i class="bi bi-calendar-check me-1"></i>${dataEstimada}</span>
                </div>
            </div>`;
        }

        const card = `
            <div class="col-12 animate__animated animate__zoomIn">
                <div class="card mb-4 shadow" style="border-radius: 12px; border-left: 8px solid ${corBorda} !important; border: 1px solid #dee2e6; background: white;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge position-absolute top-0 end-0 m-3 px-3 py-2 rounded-3 shadow-sm" style="font-size: 0.72rem; ${EstiloBadge}">
                            <i class="bi ${iconeBadge} me-1"></i> ${stDisplay}
                        </span>
                        <h4 class="fw-bold mb-1 text-dark" style="letter-spacing: -0.5px;">${interessado}</h4>
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-2 fw-bold" style="font-size: 0.8rem; color: #868e96;">
                            <span class="badge bg-light text-secondary border me-2">TEMA: ${tema}</span>
                            <span>PROT: <span class="text-primary">${protocoloVal}</span></span>
                            <span class="mx-2 text-muted fw-normal">|</span>
                            <span style="color: #868e96; font-weight: bold;">ENTRADA:</span> 
                            <span class="text-primary fw-bold ms-1">${dataEntrada}</span>
                        </div>
                        ${filaHtml}
                        <div class="d-flex justify-content-between align-items-center pt-3 mt-3 border-top">
                            <p class="mb-0 small text-secondary"><i class="bi bi-building me-1 fs-6 text-primary"></i> ${exibicaoEscola}</p>
                            <button class="btn btn-sm shadow-sm font-weight-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${processo.id}" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 50px; padding: 6px 16px;">
                                Mais Detalhes <i class="bi bi-chevron-down ms-1"></i>
                            </button>
                        </div>
                        <div class="collapse mt-3" id="collapse_${processo.id}">
                            <div class="p-4 rounded-3 border-start border-3 bg-light shadow-sm" style="border-left: 6px solid ${corBordaComunicado} !important;">
                                <p class="mb-0 text-dark" style="line-height: 1.6; font-size: 0.95rem;">
                                    ${sanitizar(mensagemOriginal)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += card;
    });
}
