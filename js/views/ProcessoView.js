/**
 * View Layer: Responsável apenas por atualizar o DOM visualmente
 */
export const ProcessoView = {
    areaResultado: document.getElementById("resultadoProcesso"),

    mostrarCarregando: function() {
        if (!this.areaResultado) this.areaResultado = document.getElementById("resultadoProcesso");
        this.areaResultado.innerHTML = `
            <div class="text-center py-5 w-100 animate__animated animate__fadeIn">
                <div class="spinner-grow text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
                <p class="text-muted fw-medium mb-0">Sincronizando de forma segura...</p>
            </div>
        `;
        this.areaResultado.className = "mt-4 p-4 card-glass border-0 d-flex align-items-center justify-content-center shadow-lg";
    },

    exibirAlerta: function(mensagem, tipo) {
        if (!this.areaResultado) this.areaResultado = document.getElementById("resultadoProcesso");
        this.areaResultado.className = `mt-4 p-3 rounded bg-${tipo}-subtle text-${tipo}-emphasis border-start border-4 border-${tipo === 'light' ? 'primary' : tipo} shadow-sm`;
        this.areaResultado.innerHTML = mensagem;
    },

    formatarDataLocal: function(str) {
        if (!str) return null;
        const partes = str.split('T')[0].split('-');
        return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : null;
    },

    renderizarResultados: function(resultadosFiltrados, filaAtivaVTC) {
        if (!this.areaResultado) this.areaResultado = document.getElementById("resultadoProcesso");
        this.areaResultado.innerHTML = "";
        this.areaResultado.className = "mt-4 row g-4";

        for (const processo of resultadosFiltrados) {
            const tema = (processo.tema || "Processo").toUpperCase();
            const statusReal = (processo.status || "em analise").toLowerCase();
            const observacao = processo.observacoes || "";
            const interessado = (processo.nome || "Não informado").toUpperCase();
            const protocolo = processo.protocolo || "N/D";
            const escola = (processo.escola || "").toUpperCase();
            
            const dataEntrada = this.formatarDataLocal(processo.data_entrada);
            const dataSaida = this.formatarDataLocal(processo.data_saida);

            const isVTC = tema.includes("VTC");
            const isQuinquenio = tema.includes("QUINQUÊNIO") || tema.includes("QUINQUENIO");
            const isContagemTempo = tema.includes("CONTAGEM");
            const isAposentTema = tema.includes("APOSENTADORIA");

            let obsLimpa = (observacao || "").trim();
            const obsLower = obsLimpa.toLowerCase();

            let isRealmenteDevolvido = false;
            let isNaoFazJus = false;
            let isAbono = false;
            let isAposentadoria = false;
            let isEmAnaliseVTC = false;

            const temFinalizado = obsLower.includes("finalizado") || obsLower.includes("finalizada");
            const temPendencia = obsLower.includes("falta") || obsLower.includes("correção") || obsLower.includes("pendente") || obsLower.includes("regularização") || obsLower.includes("devolvido para correção");
            const temConcluido = obsLower.includes("concluido") || obsLower.includes("concluida");

            if (isVTC || isAposentTema) {
                if (obsLower.includes("não faz jus") || obsLower.includes("nao faz jus")) {
                    isNaoFazJus = true;
                } else if (temFinalizado || temConcluido || isAposentTema) {
                    if (obsLower.includes("aposentadoria") || isAposentTema) isAposentadoria = true;
                    else if (obsLower.includes("abono")) isAbono = true;
                    else if (!temPendencia && isVTC) isAposentadoria = true;
                }
                
                if (!isNaoFazJus && !isAbono && !isAposentadoria && (temPendencia || obsLower.includes("devolvido"))) {
                    isRealmenteDevolvido = true;
                }

                if (!isNaoFazJus && !isAbono && !isAposentadoria && !isRealmenteDevolvido && isVTC) {
                    isEmAnaliseVTC = true;
                }
            }

            const stLower = (processo.status || "").toLowerCase();
            const isEmAndamentoStatus = stLower.includes("análise") || stLower.includes("analise") || stLower.includes("andamento") || stLower.includes("exigencia") || stLower.includes("exigência") || stLower.includes("atendendo");

            let classeCorLateral = isEmAndamentoStatus ? "border-left-warning" : "border-left-primary";
            let corBadge = isEmAndamentoStatus ? "bg-warning text-dark" : "bg-primary";
            let iconeBadge = isEmAndamentoStatus ? "bi-hourglass-split" : "bi-activity";
            let statusDisplay = (processo.status || "EM ANÁLISE").toUpperCase();

            if (stLower.includes("finalizado") || stLower.includes("concluido") || stLower.includes("concluída") || stLower.includes("concluído")) {
                classeCorLateral = "border-left-success";
                corBadge = "bg-success";
                iconeBadge = "bi-check-circle-fill";
                statusDisplay = "FINALIZADO";
            } else if (stLower.includes("devolvido") || stLower.includes("correção") || stLower.includes("correcao") || stLower.includes("pendente") || isRealmenteDevolvido) {
                classeCorLateral = "border-left-warning";
                corBadge = "bg-warning text-dark";
                iconeBadge = "bi-arrow-return-left";
                statusDisplay = "DEVOLVIDO / PENDÊNCIA";
            } else if (stLower.includes("não faz jus") || stLower.includes("nao faz jus") || stLower.includes("indeferido") || isNaoFazJus) {
                classeCorLateral = "border-left-danger";
                corBadge = "bg-danger";
                iconeBadge = "bi-x-circle-fill";
                statusDisplay = "NÃO FAZ JUS";
            }
            
            const nomeCorBase = corBadge.replace('bg-', '').replace(' text-dark', '');

            let exibicaoEscola = escola || "SUA UNIDADE ESCOLAR";
            if (isEmAndamentoStatus && processo.origem) {
                exibicaoEscola = `<span class="fw-bold text-primary">SETOR DE ANÁLISE: ${processo.origem}</span>`;
            }

            let exibicaoProtocoloOuSEI = `<span>PROTOCOLO: <span class="text-primary">${protocolo}</span></span>`;
            let exibicaoDataDOE = "";
            let temDOE = false;
            let dataDOEExtraida = "---";

            const isLicenca = tema.includes("LICENÇA") || tema.includes("LICENCA");
            const isEvolucao = tema.includes("EVOLUÇÃO") || tema.includes("EVOLUCAO");

            if (isLicenca || isEvolucao) {
                exibicaoProtocoloOuSEI = `<span>NÚMERO DO SEI: <span class="text-${corBadge.replace('bg-', '')}">${protocolo}</span></span>`;
            }

            if (isAposentTema || obsLower.includes("doe")) {
                // Regex aprimorado para pegar "DOE EM xx/xx/xxxx" ou "PUBLICAÇÃO NO DOE: ..."
                const regexDOE = /(?:PUBLICAÇÃO|PUBLICACAO)?\s*(?:NO\s+)?DOE\s*(?:EM|DE)?\s*[\-,:]*\s*([\d]{2}\/[\d]{2}\/[\d]{4})/i;
                const match = obsLimpa.match(regexDOE);
                if (match && match[1]) {
                    dataDOEExtraida = match[1];
                    exibicaoDataDOE = `<span class="mx-2 text-muted fw-normal">|</span><span class="text-secondary"><i class="bi bi-newspaper me-1"></i> PUBLICAÇÃO EM DOE: <span class="fw-bold text-dark">${dataDOEExtraida}</span></span>`;
                    temDOE = true;
                }
            }

            let linhaDatas = "";
            if (dataEntrada) {
                linhaDatas += `<span class="mx-2 text-muted fw-normal">|</span><span>ENTRADA: <span class="text-secondary fw-normal">${dataEntrada}</span></span>`;
            }
            if (dataSaida && !temDOE) {
                linhaDatas += `<span class="mx-2 text-muted fw-normal">|</span><span>SAÍDA: <span class="text-secondary fw-normal">${dataSaida}</span></span>`;
            }
            linhaDatas += exibicaoDataDOE;

            let infoFilaHtml = "";
            let dataEntradaRealVTC = dataEntrada ? new Date(processo.data_entrada) : new Date();

            if (isEmAnaliseVTC && filaAtivaVTC.length > 0) {
                const indexNaFila = filaAtivaVTC.findIndex(p => p.id === processo.id);
                if (indexNaFila >= 0) {
                    const posicaoReal = indexNaFila + 1;
                    
                    const diasDecorridos = Math.floor((new Date() - dataEntradaRealVTC) / (1000 * 60 * 60 * 24));
                    let diasEst = 60 + Math.floor((indexNaFila >= 0 ? indexNaFila : 0) * 0.25) - diasDecorridos;
                    if (diasEst > 120) diasEst = 120;
                    if (diasEst < 30) diasEst = 30;
                    
                    const dataPrevisao = new Date();
                    dataPrevisao.setDate(dataPrevisao.getDate() + diasEst);
                    const dd = String(dataPrevisao.getDate()).padStart(2, '0');
                    const mm = String(dataPrevisao.getMonth() + 1).padStart(2, '0');
                    const yy = String(dataPrevisao.getFullYear()).slice(-2);
                    const dataFormatada = `${dd}/${mm}/${yy}`;
                    
                    infoFilaHtml = `
                    <div class="mt-2 text-start">
                        <div class="d-inline-flex align-items-center bg-warning bg-opacity-25 border border-warning border-opacity-50 rounded-pill px-3 py-1 mb-1" style="font-size: 0.75rem;">
                            <span class="text-dark fw-bold me-3"><i class="bi bi-people-fill me-1"></i> POSIÇÃO NA FILA: ${posicaoReal}º</span>
                            <span class="text-dark fw-bold"><i class="bi bi-calendar-event me-1"></i> PREVISÃO: ${dataFormatada}</span>
                        </div>
                        <div class="text-muted ms-1" style="font-size: 0.65rem; max-width: 90%;">
                            <i class="bi bi-info-circle"></i> A previsão pode sofrer alterações pontuais.
                        </div>
                    </div>
                    `;
                }
            }

            const colCard = document.createElement("div");
            colCard.className = "col-12 animate__animated animate__zoomIn";

            let conteudoCard = `
                ${isQuinquenio || isContagemTempo ? `
                <div class="alert border-0 shadow-sm mb-3 text-start" style="background-color: #fff4e5; border-radius: 12px;">
                    <div class="d-flex">
                        <i class="bi bi-info-circle-fill me-2 fs-5 text-warning"></i>
                        <div class="small text-dark mt-1">
                            <b>Aviso Legal (LC 173/2020):</b> Alta demanda de processos de Contagem de Tempo e Quinquênio. Agradecemos a compreensão.
                        </div>
                    </div>
                </div>
                ` : ""}

                <div class="card border-0 mb-4 mx-auto shadow-sm text-start w-100" style="border-radius: 12px; ${classeCorLateral.replace('border-left', 'border-left:')} !important;">
                    <div class="card-body p-4 position-relative">
                        <span class="badge ${corBadge} position-absolute top-0 end-0 m-3 px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.75rem;">
                            <i class="bi ${iconeBadge}"></i> ${statusDisplay}
                        </span>
                        
                        <h5 class="fw-bold mb-0 text-dark" style="text-transform: uppercase; letter-spacing: 0.5px; font-size: 1.25rem;">${interessado}</h5>
                        
                        <div class="d-flex align-items-center flex-wrap pt-1 mb-1 fw-bold" style="font-size: 0.8rem; color: #868e96; letter-spacing: 0.2px;">
                            <span class="badge bg-light text-secondary border border-secondary-subtle me-2" style="font-size: 0.70rem; letter-spacing: 0.5px;">TEMA: ${tema}</span>
                            ${exibicaoProtocoloOuSEI}
                            ${linhaDatas}
                        </div>
                        
                        ${infoFilaHtml}
                        
                        <div class="d-flex justify-content-between align-items-center flex-wrap pt-3 mt-2 border-top" style="border-top-color: #f1f3f5 !important;">
                            <p class="mb-0 d-flex align-items-center" style="font-size: 0.85rem; color: #6c757d; letter-spacing: 0.2px;">
                                <i class="bi bi-building me-2 fs-5"></i> ${exibicaoEscola}
                            </p>
                            <button class="collapsed mt-2 mt-sm-0 shadow-sm btn-detalhes" type="button" data-bs-toggle="collapse" data-bs-target="#collapseDetalhe_${processo.id}" aria-expanded="false" style="background: none; border: 1px solid #e9ecef; color: #495057; font-weight: 500; font-size: 0.85rem; padding: 6px 14px; border-radius: 50px; display: inline-flex; align-items: center; cursor: pointer; transition: all 0.2s ease; background-color: #f8f9fa;">
                                Detalhes do Processo <i class="bi bi-chevron-down" style="margin-left: 6px; font-size: 1rem; color: #adb5bd;"></i>
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapseDetalhe_${processo.id}">
                            ${isRealmenteDevolvido ? `
                                <div class="p-3 shadow-sm border-warning-subtle bg-warning-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-warning-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-exclamation-triangle-fill me-1"></i> Processo Analisado, mas devolvido para correções.</h6>
                                    <p class="small text-dark mb-2">Seu processo foi recebido em <strong>${dataEntrada || '---'}</strong> e totalmente analisado.</p>
                                    <p class="small text-dark mb-2">Foi devolvido oficialmente para correção no dia <strong>${dataSaida || '---'}</strong>.</p>
                                    <hr style="border-color: rgba(0,0,0,0.1);">
                                    <p class="mb-0 small text-dark"><strong>O que fazer?</strong> Procure a secretaria da sua Unidade Escolar para refazer o envio.</p>
                                </div>
                            ` : isNaoFazJus ? `
                                <div class="p-3 shadow-sm border-danger-subtle bg-danger-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-danger-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-sign-stop-fill me-1"></i> Requisitos Não Atingidos no Momento</h6>
                                    <p class="small text-dark mb-2">O processo foi indeferido na data de <strong>${dataSaida || '---'}</strong>.</p>
                                    <p class="small text-dark mb-0">O servidor <strong>não faz jus</strong> à concessão pois não atingiu os requisitos da L.C. 1.354/2020.</p>
                                </div>
                            ` : isAbono ? `
                                <div class="p-3 shadow-sm border-info-subtle bg-info-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-primary-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-check-all me-1"></i> Validação de Tempo para Abono</h6>
                                    <p class="small text-dark mb-2">O tempo foi validado no dia <strong>${dataSaida || '---'}</strong>. Você tem direito ao Abono!</p>
                                    <hr style="border-color: rgba(0,0,0,0.1);">
                                    <p class="mb-0 small text-dark"><strong>Próximos Passos:</strong> A Gerência da escola providenciará a documentação financeira.</p>
                                </div>
                            ` : isAposentadoria ? `
                                <div class="p-3 shadow-sm border-info-subtle bg-info-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-primary-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-check-all me-1"></i> ${isAposentTema ? 'Aposentadoria Publicada' : 'VTC Preparada para Aposentadoria'}</h6>
                                    <p class="small text-dark mb-2">${isAposentTema ? 'Seu processo de aposentadoria foi <strong>Aprovado e Finalizado</strong>.' : `A revisão foi deferida no dia <strong>${dataSaida || '---'}</strong>.`}</p>
                                    ${temDOE ? `<p class="small text-dark mb-2"><i class="bi bi-newspaper"></i> Publicação no Diário Oficial do Estado (DOE) em: <strong>${dataDOEExtraida}</strong>.</p>` : ''}
                                    <hr style="border-color: rgba(0,0,0,0.1);">
                                    <p class="mb-0 small text-dark"><strong>Ação:</strong> ${isAposentTema ? 'Procure a gerência da sua Escola para os trâmites finais de afastamento/publicação.' : 'Procure a secretaria da sua Escola para formalizar o Trâmite de Aposentadoria.'}</p>
                                </div>

                            ` : `
                                <div class="p-3 shadow-sm border-${nomeCorBase}-subtle bg-${nomeCorBase}-subtle bg-opacity-10" style="border-radius: 8px; border: 1px solid #dee2e6;">
                                    <h6 class="fw-bold text-${nomeCorBase}-emphasis mb-2" style="font-size: 0.9rem;"><i class="bi bi-chat-left-text-fill me-1"></i> OBSERVAÇÃO:</h6>
                                    <p class="small text-dark mb-0"><i>"${obsLimpa || 'Sem detalhes adicionais disponíveis.'}"</i></p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;

            colCard.innerHTML = conteudoCard;
            this.areaResultado.appendChild(colCard);
        }
    }
};
