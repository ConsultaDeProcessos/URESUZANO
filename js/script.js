/* troca de telas */

/**
 * Alterna a visibilidade das seções (Início, Simulador, etc)
 * Melhora a experiência do usuário fechando menus e limpando resultados.
 */
function mostrar(id) {
    // Mapeamento de IDs para garantir que o assistente de bolso funcione
    const mapaId = {
        'consultar': 'processo',
        'solicitar': 'contagem',
        'documentos': 'documentos',
        'inicio': 'inicio',
        'requisitos': 'requisitos',
        'simulador': 'simulador'
    };

    const targetId = mapaId[id] || id;

    const telas = document.querySelectorAll(".tela");
    telas.forEach(tela => tela.style.display = "none");

    const target = document.getElementById(targetId);
    if (target) {
        target.style.display = "block";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Lógica de visibilidade dos botões de navegação
    const navItemInicio = document.getElementById('nav-item-inicio');
    const navItemRequisitos = document.getElementById('nav-item-requisitos');
    const navItemDocumentos = document.getElementById('nav-item-documentos');

    if (targetId === 'inicio') {
        if (navItemInicio) navItemInicio.style.display = 'none';
        if (navItemRequisitos) navItemRequisitos.style.display = 'none';
        if (navItemDocumentos) navItemDocumentos.style.display = 'none';
    } else {
        if (navItemInicio) navItemInicio.style.display = 'block';
        if (navItemRequisitos) navItemRequisitos.style.display = 'none';
        if (navItemDocumentos) navItemDocumentos.style.display = 'none';
    }

    // Fecha o menu mobile do Bootstrap
    const navBar = document.getElementById('navMenu');
    if (navBar && navBar.classList.contains('show')) {
        const bootstrapCollapse = bootstrap.Collapse.getInstance(navBar);
        if (bootstrapCollapse) bootstrapCollapse.hide();
    }
}

// Lógica para abrir aba específica via parâmetro na URL (?aba=id)
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const aba = urlParams.get('aba');
    if (aba) {
        // Pequeno atraso para garantir que tudo carregou
        setTimeout(() => mostrar(aba), 100);
    }
});

/**
 * Alterna a visibilidade do card de Regras de Paridade e Integralidade
 */
function toggleRegrasFinanceiras() {
    const content = document.getElementById('collapseRegrasFinanceiras');
    const btn = document.getElementById('btnToggleRegras');

    if (content.style.display === "none") {
        content.style.display = "block";
        btn.innerHTML = 'Clique para recolher <i class="bi bi-chevron-up ms-1"></i>';
    } else {
        content.style.display = "none";
        btn.innerHTML = 'Clique para expandir <i class="bi bi-chevron-down ms-1"></i>';
    }
}



/* GERAR REQUERIMENTO WORD (.DOC) E INICIAR PROTOCOLO .NET */

async function gerarRequerimentoWord() {
    // 1. Captura de Dados do Formulário
    const btnGerar = document.querySelector("#formRequerimento button");
    const nome = document.getElementById("reqNome").value.trim();
    const rg = document.getElementById("reqRG").value.trim();
    const endereco = document.getElementById("reqEndereco").value.trim();
    const telefone = document.getElementById("reqTelefone").value.trim();
    const email = document.getElementById("reqEmail").value.trim();
    const cargo = document.getElementById("reqCargo").value.trim();
    const escola = document.getElementById("reqEscola").value.trim();
    const tipo = document.getElementById("reqTipo").value;
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    // 2. Validação Básica
    if (!nome || !rg || !escola || !email) {
        alert("⚠️ Por favor, preencha todos os campos corretamente.");
        return;
    }

    try {
        // Feedback Visual
        btnGerar.disabled = true;
        btnGerar.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;

        let protocoloGerado = "";
        let isOffline = false;

        // 3. Envio para a API C# (.NET)
        try {
            const respostaNET = await fetch('/api/Email/enviar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nome: nome,
                    rg: rg,
                    endereco: endereco,
                    telefone: telefone,
                    email: email,
                    cargo: cargo,
                    escola: escola,
                    tipo: tipo
                })
            });

            const resultado = await respostaNET.json();

            if (!resultado.sucesso) {
                throw new Error(resultado.mensagem || "Falha lógica.");
            }
            protocoloGerado = resultado.protocolo; // Pegamos o REQ gerado na API

        } catch (erroFetch) {
            console.warn("⚠️ Servidor API inacessível. Entrando em Modo Local/Offline.", erroFetch);
            isOffline = true;

            // Geração de protocolo manual para o modo offline
            const d = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            protocoloGerado = `REQ-OFF-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        }

        // 4. Montagem do Template HTML para o Word
        // O Word reconhece HTML básico quando o arquivo é salvo como .doc
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Requerimento</title><style>body{font-family:'Arial',sans-serif;line-height:1.5;padding:40px;}.titulo{text-align:center;font-weight:bold;text-decoration:underline;margin-bottom:30px;}.texto{text-align:justify;margin-bottom:40px;}.assinatura{text-align:center;margin-top:60px;}.protocolo{text-align:right;font-size:12px;color:#666;}</style></head><body>";

        const body = `
            <div class='protocolo'>Protocolo de Envio: <b>${protocoloGerado}</b></div>
            <div class='titulo'>
                <h2>REQUERIMENTO DE CONTAGEM DE TEMPO</h2>
            </div>
            <div class='texto'>
                <p>Eu, <b>${nome.toUpperCase()}</b>, RG nº <b>${rg}</b>, residente no endereço <b>${endereco}</b>, 
                contato telefônico <b>${telefone}</b> e e-mail <b>${email}</b>, servidor público estadual no cargo de 
                <b>${cargo}</b>, classificado na unidade escolar <b>${escola}</b>, venho respeitosamente requerer a 
                <b>CONTAGEM DE TEMPO DE CONTRIBUIÇÃO</b> para fins de <b>${tipo.toUpperCase()}</b>.</p>
                
                <p>Solicito análise e providências conforme a legislação vigente.</p>
                <p>Pede Deferimento.</p>
            </div>
            <div class='assinatura'>
                <p>___________________________________________________</p>
                <p><b>${nome.toUpperCase()}</b></p>
                <p style='margin-top:20px;'>Data: ${dataAtual}</p>
            </div>
        `;

        const footer = "</body></html>";
        const conteudoCompleto = header + body + footer;

        // 5. Geração e Download do Arquivo .doc
        const blob = new Blob(['\ufeff', conteudoCompleto], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `Requerimento_${nome.split(' ')[0]}_${tipo.replace(/\s+/g, '')}.doc`;
        document.body.appendChild(link);
        link.click();

        // Limpeza DOC
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // 6. Mensagem de Sucesso na Interface
        const formulario = document.getElementById("formRequerimento");

        let avisoEmail = `Um aviso de confirmação da solicitação (${protocoloGerado}) foi preparado para envio ao seu e-mail pessoal (<b>${email}</b>).`;
        let badgeStatus = ``;

        if (isOffline) {
            badgeStatus = `<span class="badge bg-warning text-dark ms-2 align-middle fs-6">Modo Local</span>`;
            avisoEmail = `<span class="text-warning-emphasis fw-medium"><i class="bi bi-exclamation-triangle-fill"></i> Aviso: Como você está testando o arquivo sem um servidor web, o e-mail de confirmação não foi enviado. No entanto, o seu arquivo Word (.doc) foi gerado e baixado com sucesso!</span>`;
        }

        formulario.innerHTML = `
            <div class="col-12 text-center py-5 animate__animated animate__zoomIn">
                <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                <h3 class="mt-3 fw-bold text-success">Solicitação Registrada!</h3>
                <h5 class="text-secondary mb-4">Protocolo: <b>${protocoloGerado}</b> ${badgeStatus}</h5>
                <p class="text-muted leading-relaxed">
                    O requerimento em formato Word foi baixado em seu computador para assinatura.<br>
                    <br>${avisoEmail}
                </p>
                <button class="btn btn-outline-primary mt-4 px-4 py-2" onclick="location.reload()">Fazer nova solicitação</button>
            </div>
        `;

    } catch (erro) {
        console.error("Erro fatal na geração do requerimento:", erro);
        alert("⚠️ Ocorreu um erro ao gerar o documento: " + erro.message);
    } finally {
        if (btnGerar) {
            btnGerar.disabled = false;
            btnGerar.innerHTML = `<i class="bi bi-file-earmark-word me-2"></i> Gerar Requerimento (.doc)`;
        }
    }
}

/* ======================================================================
   SIMULADOR DE TEMPO DE CONTRIBUIÇÃO - LC 1.354/2020
   ====================================================================== */

/**
 * Tabela progressiva de pontos (Art. 10 e §5º) — LC 1354/2020
 * A partir de 2020, +1 ponto por ano até o limite.
 */
function getPontosExigidos(ano, sexo, categoria) {
    const base = {
        geral: { feminino: { inicio: 86, limite: 100 }, masculino: { inicio: 96, limite: 105 } },
        professor: { feminino: { inicio: 81, limite: 92 }, masculino: { inicio: 91, limite: 100 } }
    };
    const regra = base[categoria][sexo];
    const incremento = Math.max(0, ano - 2019); // +1 por ano a partir de 2020
    return Math.min(regra.inicio + incremento, regra.limite);
}

/**
 * Retorna os parâmetros legais conforme sexo e categoria
 */
function getParametros(sexo, categoria) {
    const tabela = {
        geral: {
            masculino: { idadeMin: 62, contrib: 35, idadePedagio: 60, contribPedagio: 35, servPublico: 20, cargo: 5 },
            feminino: { idadeMin: 57, contrib: 30, idadePedagio: 57, contribPedagio: 30, servPublico: 20, cargo: 5 }
        },
        professor: {
            masculino: { idadeMin: 57, contrib: 30, idadePedagio: 55, contribPedagio: 30, servPublico: 20, cargo: 5 },
            feminino: { idadeMin: 52, contrib: 25, idadePedagio: 52, contribPedagio: 25, servPublico: 20, cargo: 5 }
        }
    };
    return tabela[categoria][sexo];
}

/**
 * Calcula a idade a partir da data de nascimento
 */
function calcularIdade(dataNasc) {
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNasc = nasc.getMonth();
    if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
}

/**
 * Alterna o campo de tempo entre Anos/Meses e Total em Dias
 */
function toggleModo(btn, campo) {
    const divAM = document.getElementById(campo + '_am');
    const divDias = document.getElementById(campo + '_dias');
    const ehDias = divDias.classList.contains('d-none');

    if (ehDias) {
        divAM.classList.add('d-none');
        divDias.classList.remove('d-none');
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Usar Anos/Meses';
    } else {
        divDias.classList.add('d-none');
        divAM.classList.remove('d-none');
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Usar Dias';
    }
}

/**
 * Converte anos e meses em total de meses para facilitar cálculos
 */
function paraMeses(anos, meses) {
    return (parseInt(anos) || 0) * 12 + (parseInt(meses) || 0);
}

/**
 * Lê o tempo de um campo que pode estar em modo Anos/Meses ou Dias
 * Retorna total em meses
 */
function lerTempo(campo) {
    const divDias = document.getElementById(campo + '_dias');
    if (divDias && !divDias.classList.contains('d-none')) {
        // Modo dias: converte dias → meses (30 dias = 1 mês)
        const dias = parseInt(document.getElementById('sim' + campo.charAt(0).toUpperCase() + campo.slice(1) + 'Dias')?.value) || 0;
        return Math.round(dias / 30);
    }
    // Modo padrão: anos + meses (precisa mapear nomes)
    return -1; // fallback — será tratado no caller
}

/**
 * Formata meses em "X anos e Y meses"
 */
function formatarTempo(totalMeses) {
    const anos = Math.floor(totalMeses / 12);
    const meses = totalMeses % 12;
    if (anos === 0 && meses === 0) return '0 meses';
    if (anos === 0) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    if (meses === 0) return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

/**
 * Verifica a data de ingresso para exibir ou ocultar a pergunta sobre quebra de vínculo.
 * Servidores com ingresso até 31/12/2003 (EC 41/2003) podem ter Paridade/Integralidade,
 * desde que não tenham quebra de vínculo superior a 90 dias.
 */
function verificarQuebraVinculo() {
    const input = document.getElementById('simDataIngresso');
    const dataIngresso = input.value;
    const divQuebra = document.getElementById('divQuebraVinculo');

    if (!dataIngresso) {
        divQuebra.classList.add('d-none');
        return;
    }

    // A regra de Integralidade/Paridade vale para quem ingressou até 31/12/2003 (EC 41/2003)
    // Embora a emenda seja de 2003, a nova regra de médias passou a valer em 01/01/2004.
    // Usando apenas os valores de ano/mês/dia para evitar problemas de fuso horário
    const [ano, mes, dia] = dataIngresso.split('-').map(Number);
    const ingressoDate = new Date(ano, mes - 1, dia); // mes é 0-indexed
    const limiteDate = new Date(2003, 11, 31); // 31 de Dezembro de 2003

    if (ingressoDate <= limiteDate) {
        divQuebra.classList.remove('d-none');
        // Adicionar um pequeno efeito para chamar atenção
        divQuebra.classList.add('animate__animated', 'animate__flash');
    } else {
        divQuebra.classList.add('d-none');
        // Se ocultar, volta para o padrão "Não"
        const radioNao = document.getElementById('quebraNao');
        if (radioNao) radioNao.checked = true;
    }
}

/**
 * Função principal do Simulador
 */
function simularContribuicao() {
    // 1. Coletar dados do formulário
    const sexo = document.querySelector('input[name="sexo"]:checked')?.value;
    const categoria = document.querySelector('input[name="categoria"]:checked')?.value;
    const dataNasc = document.getElementById('simDataNasc').value;
    const dataIngresso = document.getElementById('simDataIngresso').value;

    // Helper para ler campo dual (anos/meses ou dias)
    function lerCampoDual(campoId, anosId, mesesId, diasId) {
        const divDias = document.getElementById(campoId + '_dias');
        if (divDias && !divDias.classList.contains('d-none')) {
            const dias = parseInt(document.getElementById(diasId)?.value) || 0;
            return Math.round(dias / 30); // 30 dias ≈ 1 mês
        }
        return paraMeses(
            document.getElementById(anosId)?.value,
            document.getElementById(mesesId)?.value
        );
    }

    const servPublicoMeses = lerCampoDual('servPublico', 'simServPublicoAnos', 'simServPublicoMeses', 'simServPublicoDias');
    const cargoMeses = lerCampoDual('cargo', 'simCargoAnos', 'simCargoMeses', 'simCargoDias');
    const contrib2020Meses = lerCampoDual('contrib2020', 'simContrib2020Anos', 'simContrib2020Meses', 'simContrib2020Dias');
    const contribAtualMeses = lerCampoDual('contribAtual', 'simContribAtualAnos', 'simContribAtualMeses', 'simContribAtualDias');

    // 2. Validação
    if (!sexo || !categoria || !dataNasc || !dataIngresso) {
        alert('⚠ Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    // 3. Calcular idade e parâmetros legais
    const idade = calcularIdade(dataNasc);
    const params = getParametros(sexo, categoria);
    const anoAtual = new Date().getFullYear();
    const pontosExigidos = getPontosExigidos(anoAtual, sexo, categoria);
    const sexoLabel = sexo === 'masculino' ? 'Masculino' : 'Feminino';
    const catLabel = categoria === 'professor' ? 'Professor(a) - Magistério' : 'QAE / QSE - Geral';

    // 4. Calcular Regra de Pontos (Art. 10)
    const contribAtualAnos = contribAtualMeses / 12;
    const pontosAtuais = Math.floor((idade + contribAtualAnos) * 10) / 10; // 1 decimal
    const pontosFaltam = Math.max(0, pontosExigidos - pontosAtuais);
    const atingiuPontos = pontosAtuais >= pontosExigidos && idade >= params.idadeMin;

    // Projeção: em qual ano atinge os pontos
    let anoProjetado = anoAtual;
    let pontosProj = pontosAtuais;
    let idadeProj = idade;
    while (pontosProj < getPontosExigidos(anoProjetado, sexo, categoria) || idadeProj < params.idadeMin) {
        anoProjetado++;
        pontosProj += 2; // +1 ano de idade + ~1 de contribuição = +2 pontos
        idadeProj++;
        if (anoProjetado > anoAtual + 30) break; // segurança
    }

    // 5. Calcular Pedágio 100% (Art. 11)
    const contribMinPedagioMeses = params.contribPedagio * 12;
    const faltavaMeses = Math.max(0, contribMinPedagioMeses - contrib2020Meses);
    const pedagioMeses = faltavaMeses; // 100% do que faltava
    const totalExigidoPedagioMeses = contribMinPedagioMeses + pedagioMeses;
    const faltaPedagioMeses = Math.max(0, totalExigidoPedagioMeses - contribAtualMeses);
    const atingiuPedagio = contribAtualMeses >= totalExigidoPedagioMeses && idade >= params.idadePedagio;

    // 6. Verificar requisitos comuns
    const servPublicoOK = servPublicoMeses >= params.servPublico * 12;
    const cargoOK = cargoMeses >= params.cargo * 12;

    // 6.5 Determinar Fundamento do Cálculo (Base legal dos proventos)
    // Nota: A EC 41/2003 (publicada em 31/12/2003) alterou a forma de cálculo.
    // Ingressantes até 31/12/2003 mantêm Integralidade/Paridade (se sem quebra de vínculo > 90 dias).
    // Ingressantes a partir de 01/01/2004 entram na regra de médias.
    const quebraVinculo = document.querySelector('input[name="quebraVinculo"]:checked')?.value || 'nao';
    const dataIngressoObj = new Date(dataIngresso);
    const dataCorteEC41 = new Date('2003-12-31');
    const dataReforma2020 = new Date('2020-03-07');

    let fundamentoTitulo = "";
    let fundamentoDesc = "";
    let fundamentoIcone = "";
    let fundamentoCor = "";

    if (dataIngressoObj <= dataCorteEC41 && quebraVinculo === 'nao') {
        fundamentoTitulo = "Integral c/ Paridade";
        fundamentoDesc = "Proventos iguais à última remuneração e reajustes iguais aos ativos (EC 41/2003).";
        fundamentoIcone = "bi-award-fill";
        fundamentoCor = "success";
    } else if (dataIngressoObj < dataReforma2020) {
        fundamentoTitulo = "Média 100%";
        fundamentoDesc = "Proventos baseados na média de 100% das contribuições desde 07/1994, sem paridade.";
        fundamentoIcone = "bi-percent";
        fundamentoCor = "info";
    } else {
        fundamentoTitulo = "Regra Permanente";
        fundamentoDesc = "Cálculo de 60% da média + 2% por ano que exceder 20 anos de contribuição.";
        fundamentoIcone = "bi-slash-circle";
        fundamentoCor = "secondary";
    }

    // 7. Renderizar resultado
    const area = document.getElementById('resultadoSimulador');
    area.style.display = 'block';
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });

    area.innerHTML = `
        <!-- Cabeçalho do Resultado -->
        <div class="border-bottom pb-3 mb-4">
            <h4 class="fw-bold text-dark mb-1"><i class="bi bi-clipboard-data me-2 text-primary"></i>Resultado da Simulação</h4>
            <span class="badge bg-${sexo === 'masculino' ? 'primary' : 'danger'} me-1">${sexoLabel}</span>
            <span class="badge bg-dark me-1">${catLabel}</span>
            <span class="badge bg-secondary">Idade: ${idade} anos</span>
        </div>

        <!-- Requisitos Comuns -->
        <div class="alert ${servPublicoOK && cargoOK ? 'alert-success' : 'alert-warning'} mb-4" role="alert">
            <h6 class="fw-bold mb-2"><i class="bi bi-check2-square me-1"></i> Requisitos Comuns (Art. 10 e 11)</h6>
            <div class="d-flex gap-4 flex-wrap">
                <span>${servPublicoOK ? '✅' : '❌'} Serviço Público: <strong>${formatarTempo(servPublicoMeses)}</strong> (mín. ${params.servPublico} anos)</span>
                <span>${cargoOK ? '✅' : '❌'} Tempo no Cargo: <strong>${formatarTempo(cargoMeses)}</strong> (mín. ${params.cargo} anos)</span>
            </div>
        </div>

        <!-- Cards Art. 10 e Art. 11 -->
        <div class="row g-4 mb-4">
            <!-- Art. 10 — Pontos -->
            <div class="col-md-6">
                <div class="card h-100 border-${atingiuPontos ? 'success' : 'primary'} shadow-sm">
                    <div class="card-header bg-${atingiuPontos ? 'success' : 'primary'} text-white py-3">
                        <h5 class="mb-0 fw-bold"><i class="bi bi-123 me-2"></i>Regra de Pontos</h5>
                        <small>Art. 10, LC 1.354/2020</small>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Idade Mínima:</span>
                            <span class="fw-bold ${idade >= params.idadeMin ? 'text-success' : 'text-danger'}">${idade} / ${params.idadeMin} anos ${idade >= params.idadeMin ? '✅' : '❌'}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Contribuição Mínima:</span>
                            <span class="fw-bold">${formatarTempo(contribAtualMeses)} / ${params.contrib} anos</span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Seus Pontos Atuais:</span>
                            <span class="fw-bold fs-5">${pontosAtuais.toFixed(1)} pts</span>
                        </div>
                        <div class="d-flex justify-content-between mb-3">
                            <span>Pontos Exigidos (${anoAtual}):</span>
                            <span class="fw-bold fs-5">${pontosExigidos} pts</span>
                        </div>
                        <div class="alert ${atingiuPontos ? 'alert-success' : 'alert-light border'} text-center py-2 mb-0">
                            ${atingiuPontos
            ? '<i class="bi bi-check-circle-fill text-success me-1"></i> <strong>Requisitos atingidos!</strong>'
            : `<i class="bi bi-hourglass-split text-muted me-1"></i> Faltam <strong>${pontosFaltam.toFixed(1)} pontos</strong>. Projeção: <strong>${anoProjetado}</strong>`
        }
                        </div>
                    </div>
                    <div class="card-footer bg-light text-center small text-muted">
                        Fundamento: <strong>Art. 10</strong>${categoria === 'professor' ? ', §4° e §5°' : ''} da LC 1.354/2020
                    </div>
                </div>
            </div>

            <!-- Art. 11 — Pedágio 100% -->
            <div class="col-md-6">
                <div class="card h-100 border-${atingiuPedagio ? 'success' : 'info'} shadow-sm">
                    <div class="card-header bg-${atingiuPedagio ? 'success' : 'info'} text-${atingiuPedagio ? 'white' : 'dark'} py-3">
                        <h5 class="mb-0 fw-bold"><i class="bi bi-clock-history me-2"></i>Pedágio 100%</h5>
                        <small>Art. 11, LC 1.354/2020</small>
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between mb-2">
                            <span>Idade Mínima:</span>
                            <span class="fw-bold ${idade >= params.idadePedagio ? 'text-success' : 'text-danger'}">${idade} / ${params.idadePedagio} anos ${idade >= params.idadePedagio ? '✅' : '❌'}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Contribuição em 07/03/2020:</span>
                            <span class="fw-bold">${formatarTempo(contrib2020Meses)}</span>
                        </div>
                        <hr>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Faltava em 07/03/2020:</span>
                            <span class="fw-bold text-warning">${formatarTempo(faltavaMeses)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span>Pedágio (100%):</span>
                            <span class="fw-bold text-info">+ ${formatarTempo(pedagioMeses)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-3">
                            <span>Total Exigido:</span>
                            <span class="fw-bold fs-5">${formatarTempo(totalExigidoPedagioMeses)}</span>
                        </div>
                        <div class="alert ${atingiuPedagio ? 'alert-success' : 'alert-light border'} text-center py-2 mb-0">
                            ${atingiuPedagio
            ? '<i class="bi bi-check-circle-fill text-success me-1"></i> <strong>Requisitos atingidos!</strong>'
            : `<i class="bi bi-hourglass-split text-muted me-1"></i> Faltam <strong>${formatarTempo(faltaPedagioMeses)}</strong> de contribuição`
        }
                        </div>
                    </div>
                    <div class="card-footer bg-light text-center small text-muted">
                        Fundamento: <strong>Art. 11</strong>${categoria === 'professor' ? ', §1°' : ''} da LC 1.354/2020
                    </div>
                </div>
            </div>
        </div>

        <!-- Card Extra: Fundamento do Cálculo -->
        <div class="card border-${fundamentoCor} shadow-sm mb-4">
            <div class="card-body d-flex align-items-center gap-3">
                <div class="bg-${fundamentoCor}-subtle p-3 rounded-circle">
                    <i class="bi ${fundamentoIcone} fs-3 text-${fundamentoCor}"></i>
                </div>
                <div>
                    <h6 class="fw-bold text-${fundamentoCor} mb-1">Fundamento do Cálculo dos Proventos</h6>
                    <h5 class="fw-bold mb-1">${fundamentoTitulo}</h5>
                    <p class="small text-muted mb-0">${fundamentoDesc}</p>
                </div>
            </div>
        </div>

        <!-- Rodapé Legal -->
        <div class="alert alert-secondary mt-4 text-center small mb-0">
            <i class="bi bi-shield-exclamation me-1"></i>
            Esta simulação é meramente informativa. A confirmação oficial dos fundamentos legais depende da <strong>Validação de Tempo de Contribuição - VTC</strong> junto ao órgão competente.
        </div>
    `;
}
