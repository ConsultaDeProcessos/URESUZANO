// ============================================================
// JS PORTAL URE SUZANO — LÓGICA DE CONSULTA & UX
// Versão 11.3 Institutional & SEAPE — Formalidade e Orientação
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
// --- MOTOR DE HUMANIZAÇÃO INTELIGENTE (v11.3) ---
function gerarMensagemHumanizada(processo) {
    const status = (processo.status || "").toUpperCase();
    const tema = (processo.tema || "").toUpperCase();
    const obs = (processo.observacoes || "").toUpperCase();
    const dEntrada = formatarData(processo.data_entrada);
    const dSaida = formatarData(processo.data_saida);
    const context = (tema + " " + obs).toUpperCase();
    
    // CASO 1: DEVOLVIDO / PENDÊNCIA
    if (status.includes("DEVOLVIDO") || context.includes("DEVOLVIDO") || context.includes("CORREÇÃO") || context.includes("CORRECAO")) {
        return `Prezado(a) servidor(a), informamos que em <b>${dSaida || dEntrada}</b> o seu processo foi analisado e foi identificada a necessidade de <b>correção ou complementação de documentos funcionais</b> para prosseguimento. O processo foi devolvido para a sua <b>Unidade Escolar</b> para que as providências necessárias sejam tomadas. Para maiores informações, por favor, entre em contato diretamente com a gerência de sua Unidade Escolar.`;
    }
    
    // CASO 2: CONCLUÍDO / FINALIZADO
    if (status.includes("FINALIZADO") || status.includes("CONCLUÍDO") || status.includes("CONCLUIDO") || context.includes("CONCLUIDO")) {
        
        // Sub-Caso 2.1: ABONO DE PERMANÊNCIA
        if (context.includes("ABONO")) {
            return `Prezado(a) servidor(a), informamos que o seu processo de VTC foi <b>devidamente concluído</b> por esta Diretoria de Ensino em <b>${dSaida || dEntrada}</b>. O resultado oficial já se encontra disponível em sua <b>Unidade Escolar</b> para ciência. Ressaltamos que, para fins de pagamento do Abono de Permanência, é necessário realizar um novo trâmite administrativo e, posteriormente, um novo protocolo para dar andamento à concessão de aposentadoria junto ao setor <b>SEAPE</b>.`;
        }
        
        // Sub-Caso 2.2: APOSENTADORIA / VTC PURO
        if (context.includes("APOSENTADORIA") || context.includes("VTC")) {
            return `Prezado(a) servidor(a), informamos que o seu processo de VTC foi <b>devidamente concluído</b> por esta Diretoria de Ensino em <b>${dSaida || dEntrada}</b>. Orientamos que o(a) servidor(a) agora proceda com o trâmite necessário para solicitar a concessão de sua aposentadoria diretamente junto ao setor <b>SEAPE</b> em sua Unidade Escolar.`;
        }
        // Caso padrão de conclusão
        return `Prezado(a) servidor(a), informamos que o seu processo foi <b>devidamente concluído</b> pela equipe técnica da URE Suzano em <b>${dSaida || dEntrada}</b>. Os documentos resultantes desta análise já foram encaminhados para a sua <b>Unidade Escolar</b> para os devidos registros e ciência oficial.`;
    }
    
    // CASO 3: EM ANÁLISE / ANDAMENTO
    return `Prezado(a) servidor(a), informamos que seu processo deu entrada nesta Regional em <b>${dEntrada}</b> e encontra-se atualmente em nossa <b>fila de análise técnica</b>. Nossa equipe está processando as solicitações seguindo rigorosamente a ordem cronológica de chegada para garantir a isonomia no atendimento. Recomendamos o acompanhamento periódico por este canal oficial.`;
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
        const isEmAndamento = stDisplay.includes("ANALISE") || stDisplay.includes("ANDAMENTO") || stDisplay.includes("ENTRADA") || obsLower.includes("analise") || obsLower.includes("andamento");
        const isFinalizado = stDisplay.includes("FINALIZADO") || stDisplay.includes("CONCLUÍDO") || stDisplay.includes("CONCLUIDO");
        const isRealmenteDevolvido = stDisplay.includes("DEVOLVIDO") || obsLower.includes("devolvido") || obsLower.includes("correção") || obsLower.includes("pendencia") || obsLower.includes("correcao");
        // --- PALETA INSTITUCIONAL (v11.3) ---
        let corBorda = "#003366"; 
        let EstiloBadge = "";
        let iconeBadge = "";
        if (isFinalizado) {
            // INVERSÃO CROMÁTICA VERDE: Fundo Branco, Borda e Texto Verde #198754
            EstiloBadge = "background-color: white; color: #198754; border: 1.5px solid #198754; font-weight: bold;";
            iconeBadge = "bi-check-circle-fill";
        } else if (isRealmenteDevolvido) {
            // INVERSÃO CROMÁTICA GOLD: Fundo Branco, Borda e Texto Ouro #D39E00
            EstiloBadge = "background-color: white; color: #D39E00; border: 1.5px solid #D39E00; font-weight: bold;"; 
            iconeBadge = "bi-exclamation-triangle-fill";
        } else if (isEmAndamento) {
            // MANTÉM SÓLIDO AZUL: Para destacar processos que ainda estão em trâmite
            EstiloBadge = "background-color: #003366; color: white; font-weight: bold;"; 
            iconeBadge = "bi-hourglass-split";
        } else {
            EstiloBadge = "background-color: #6C757D; color: white;";
            iconeBadge = "bi-shield-fill";
        }
        // Detector de DOE (Aposentadoria)
        let exibicaoDOE = "";
        if (tema.includes("APOSENTADORIA")) {
            const match = obsLimpa.match(/(?:DOE)[\s\-,:]*([\d]{2}\/[\d]{2}\/[\d]{4})/);
            if (match && match[1]) {
                exibicaoDOE = `<span class="mx-2 text-muted fw-normal">|</span><span class="text-secondary small fw-bold"><i class="bi bi-newspaper me-1"></i> DOE: ${match[1]}</span>`;
            }
        }
        const card = `
            <div class="col-12 animate__animated animate__zoomIn">
                <div class="card border-0 mb-4 shadow-sm w-100" style="border-radius: 12px; border-left: 8px solid ${corBorda} !important;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge position-absolute top-0 end-0 m-3 px-3 py-2 rounded-3 shadow-sm" style="font-size: 0.72rem; ${EstiloBadge}">
                            <i class="bi ${iconeBadge} me-1"></i> ${stDisplay}
                        </span>
                        
                        <h4 class="fw-bold mb-1 text-dark" style="letter-spacing: -0.5px;">${interessado}</h4>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-2 fw-bold" style="font-size: 0.8rem; color: #868e96;">
                            <span class="badge bg-light text-secondary border me-2" style="font-size: 0.65rem;">TEMA: ${tema}</span>
                            <span>PROT: <span class="text-primary">${protocoloVal}</span></span>
                            
                            ${dataEntrada ? `
                                <span class="mx-2 text-muted fw-normal">|</span>
                                <span style="color: #868e96; font-weight: bold;">ENTRADA:</span> 
                                <span class="text-primary fw-bold ms-1">${dataEntrada}</span>
                            ` : ""}
                            
                            ${dataSaida ? `
                                <span class="mx-2 text-muted fw-normal">|</span>
                                <span style="color: #868e96; font-weight: bold;">SAÍDA:</span> 
                                <span class="text-primary fw-bold ms-1">${dataSaida}</span>
                            ` : ""}
                            
                            ${exibicaoDOE}
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center pt-3 mt-3 border-top" style="border-top-color: #f1f3f5 !important;">
                            <p class="mb-0 small text-secondary">
                                <i class="bi bi-building me-1 fs-6 text-primary"></i> ${exibicaoEscola}
                            </p>
                            <button class="btn btn-sm shadow-sm font-weight-bold" type="button" data-bs-toggle="collapse" data-bs-target="#collapse_${processo.id}" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 50px; padding: 6px 16px; font-weight: 600;">
                                Mais Detalhes <i class="bi bi-chevron-down ms-1"></i>
                            </button>
                        </div>
                        <div class="collapse mt-3" id="collapse_${processo.id}">
                            <div class="p-4 rounded-3 border-start border-3 border-primary bg-light shadow-sm">
                                <h6 class="fw-bold text-dark mb-2 small"><i class="bi bi-info-square-fill me-1 text-primary"></i> Comunicado Institucional:</h6>
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
