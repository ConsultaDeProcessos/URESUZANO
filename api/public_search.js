// ============================================================
// API VERCEL — ENDPOINT DE CONSULTA SEGURA 
// Versão 2.0 — Pós-Pentest (Todas as correções aplicadas)
// ============================================================

// === RATE LIMIT POR IP (10 consultas por minuto) ===
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 10;              // Máximo 10 consultas por IP

function checarRateLimit(ip) {
    const agora = Date.now();
    const registro = rateLimitMap.get(ip);

    if (!registro || (agora - registro.inicio) > RATE_LIMIT_WINDOW_MS) {
        // Primeira requisição ou janela expirou: reseta
        rateLimitMap.set(ip, { inicio: agora, contagem: 1 });
        return { bloqueado: false, restante: RATE_LIMIT_MAX - 1 };
    }

    registro.contagem++;
    if (registro.contagem > RATE_LIMIT_MAX) {
        return { bloqueado: true, restante: 0 };
    }

    return { bloqueado: false, restante: RATE_LIMIT_MAX - registro.contagem };
}

// Limpeza periódica para não acumular IPs antigos na memória
setInterval(() => {
    const agora = Date.now();
    for (const [ip, registro] of rateLimitMap) {
        if ((agora - registro.inicio) > RATE_LIMIT_WINDOW_MS * 2) {
            rateLimitMap.delete(ip);
        }
    }
}, RATE_LIMIT_WINDOW_MS * 2);

// === VERIFICAÇÃO TURNSTILE (Server-Side) ===
async function verificarTurnstile(token) {
    if (!token) return false;
    const { TURNSTILE_SECRET_KEY } = process.env;
    if (!TURNSTILE_SECRET_KEY) {
        console.error("[SEGURANÇA] TURNSTILE_SECRET_KEY não configurada no servidor.");
        return true; // Bypass de segurança se a chave não estiver lá (para não quebrar o site)
    }

    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `secret=${encodeURIComponent(TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(token)}`
        });
        const data = await res.json();
        return data.success;
    } catch (e) {
        console.error("Erro ao validar Turnstile:", e);
        return false;
    }
}

// === HANDLER PRINCIPAL ===
export default async function handler(req, res) {

    // 1. BLOQUEIO DE MÉTODO HTTP — Apenas GET e OPTIONS são permitidos
    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
        return res.status(405).json({ error: "Método não permitido. Apenas consultas GET são aceitas." });
    }

    // 2. VERIFICAÇÃO DE ORIGEM (CORS Rigoroso)
    const origin = req.headers.origin || "";
    const allowedOrigins = [
        'https://consultadeprocessos.github.io', // Site de Produção Oficial
        'http://127.0.0.1:5500',                // Live Server (Edições Locais)
        'http://localhost:5500',
        'http://localhost:3000'
    ];

    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: "Acesso Negado: Origem não autorizada." });
    }

    // 3. HEADERS CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Turnstile-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 4. RATE LIMIT POR IP
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const { bloqueado, restante } = checarRateLimit(clientIP);

    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', restante);

    if (bloqueado) {
        return res.status(429).json({ error: "Limite de consultas atingido (10 por minuto). Aguarde um momento e tente novamente." });
    }

    // 5. VERIFICAÇÃO DE ROBÔ (TURNSTILE)
    const turnstileToken = req.headers['x-turnstile-token'];
    const isHuman = await verificarTurnstile(turnstileToken);
    
    if (!isHuman) {
        return res.status(401).json({ error: "Verificação Anti-Robô inválida ou expirada. Atualize a página." });
    }

    // 5. VALIDAÇÃO E SANITIZAÇÃO DO INPUT
    // 5. VALIDAÇÃO E SANITIZAÇÃO DO PROTOCOLO (Novo)
    const { protocolo } = req.query;
    if (!protocolo) {
        return res.status(400).json({ error: "Por favor, digite o número do protocolo." });
    }
    // Limpa espaços e garante que o protocolo esteja em maiúsculas
    // ANTI-VAZAMENTO: Removemos caracteres que burlam o SQL LIKE (%)
    const protocoloLimpo = protocolo.trim().toUpperCase().replace(/[%_]/g, "");
    
    if (protocoloLimpo.length < 5) {
        return res.status(400).json({ error: "O número do protocolo parece curto demais. Verifique se digitou corretamente." });
    }

    // 6. CONEXÃO COM O SUPABASE (Credenciais seguras via ENV)
    // Tenta pegar a chave padrão ou a service role (visto no print da Vercel)
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: "Erro interno no servidor: Credenciais não encontradas no ambiente Vercel." });
    }

    // Normalização da URL: remove /rest/v1 se o usuário já tiver colocado na variável de ambiente
    const baseUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const finalUrl = `${baseUrl}/rest/v1`;

    const defaultHeaders = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        // Criamos variantes da busca para ser mais resiliente
        const protocoloSoNumeros = protocoloLimpo.replace(/[^A-Z0-9]/g, '');
        const parteFinal = protocoloLimpo.length > 6 ? protocoloLimpo.slice(-6) : protocoloLimpo;
        
        const queryTerm = encodeURIComponent(protocoloLimpo);
        const queryTermNumeric = encodeURIComponent(protocoloSoNumeros);
        const queryTermFinal = encodeURIComponent(parteFinal);

        // Busca radical: Termo original, versão numérica ou apenas os últimos 6 caracteres
        // CORREÇÃO: PostgREST (Supabase) utiliza '%' como curinga, não '*'
        const searchOR = `or=(protocolo.ilike.%${queryTerm}%,nome.ilike.%${queryTerm}%,protocolo.ilike.%${queryTermNumeric}%,nome.ilike.%${queryTermNumeric}%,protocolo.ilike.%${queryTermFinal}%,nome.ilike.%${queryTermFinal}%)`;

        console.error(`[DIAGNOSTICO] Buscando: ${protocoloLimpo} | Termo Final: ${parteFinal} | URL: ${finalUrl}`);

        const [resSefrep, resSeape] = await Promise.all([
            fetch(`${finalUrl}/sefrep_registros?${searchOR}&select=id,protocolo,status,observacoes,data_entrada,tema,nome,escola`, { headers: defaultHeaders }),
            fetch(`${finalUrl}/seape_registros?${searchOR}&select=id,protocolo,status,observacoes,data_entrada,tema,nome,escola`, { headers: defaultHeaders })
        ]);

        if (resSefrep.status === 429 || resSeape.status === 429) {
            return res.status(429).json({ error: "Limite de consultas atingido no Banco de Dados. Aguarde." });
        }

        const dadosSefrep = resSefrep.ok ? await resSefrep.json() : [];
        const dadosSeape = resSeape.ok ? await resSeape.json() : [];

        console.error(`[RESULTADO] SEFREP: ${Array.isArray(dadosSefrep) ? dadosSefrep.length : 0} registros | SEAPE: ${Array.isArray(dadosSeape) ? dadosSeape.length : 0} registros`);

        let todosResultados = [
            ...(Array.isArray(dadosSefrep) ? dadosSefrep : []).map(p => ({ ...p, origem: 'SEFREP' })),
            ...(Array.isArray(dadosSeape) ? dadosSeape : []).map(p => ({ ...p, origem: 'SEAPE' }))
        ];

        // Se nada foi encontrado, vamos logar os primeiros 1-2 itens da tabela SEFREP apenas para diagnosticar se a tabela existe e tem dados (LIMITADO A DEBUG)
        if (todosResultados.length === 0) {
            const resDebug = await fetch(`${finalUrl}/sefrep_registros?select=protocolo&limit=1`, { headers: defaultHeaders });
            if (resDebug.ok) {
                const debugData = await resDebug.json();
                console.error(`[DEBUG DB] A tabela tem dados? Primeiro protocolo encontrado: ${debugData[0]?.protocolo || 'Nenhum'}`);
            }
        }

        // Fila VTC (apenas se há VTC ativo)
        const temVTCAtivo = todosResultados.some(p => {
            const tema = (p.tema || "").toUpperCase();
            const obs = (p.observacoes || "").toLowerCase();
            return tema.includes("VTC") && 
                   !obs.includes("finalizado") && !obs.includes("analise concluida") && 
                   !obs.includes("devolvido") && !obs.includes("não faz jus") && !obs.includes("nao faz jus");
        });

        let filaAtivaVTC = [];
        if (temVTCAtivo) {
            const resFila = await fetch(`${finalUrl}/sefrep_registros?tema=ilike.%VTC%&or=(status.ilike.%lise%,status.ilike.%andamento%,status.ilike.%exig%)&select=id,data_entrada,created_at`, { headers: defaultHeaders });
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
        // --- CÁLCULO DE POSIÇÃO NA FILA ---
        if (filaAtivaVTC.length > 0) {
            todosResultados = todosResultados.map(p => {
                const index = filaAtivaVTC.findIndex(f => f.id === p.id);
                if (index !== -1) {
                    const posicao = index + 1;
                    return { ...p, _posicaoFila: posicao, _diasEstimados: posicao * 15 };
                }
                return p;
            });
        }

        return res.status(200).json({
            resultados: todosResultados
        });
    } catch (error) {
        console.error("Erro na Vercel API:", error);
        return res.status(500).json({ error: "Erro de comunicação com o banco de dados." });
    }
}
