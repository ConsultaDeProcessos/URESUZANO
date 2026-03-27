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

    // 5. VALIDAÇÃO E SANITIZAÇÃO DO INPUT
    // 5. VALIDAÇÃO E SANITIZAÇÃO DO PROTOCOLO (Novo)
    const { protocolo } = req.query;
    if (!protocolo) {
        return res.status(400).json({ error: "Por favor, digite o número do protocolo." });
    }
    // Limpa espaços e garante que o protocolo esteja em maiúsculas
    const protocoloLimpo = protocolo.trim().toUpperCase();
    // Verificação de segurança básica (mínimo de 5 caracteres para um protocolo real)
    if (protocoloLimpo.length < 5) {
        return res.status(400).json({ error: "O número do protocolo parece curto demais. Verifique se digitou corretamente." });
    }

    // 6. CONEXÃO COM O SUPABASE (Credenciais seguras via ENV)
    const { SUPABASE_URL, SUPABASE_KEY } = process.env;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: "Erro interno no servidor: Credenciais não encontradas." });
    }

    const defaultHeaders = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
             
const [resSefrep, resSeape] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/sefrep_registros?protocolo=eq.${encodeURIComponent(protocoloLimpo)}&select=id,protocolo,status,observacoes,data_entrada,tema,nome`, { headers: defaultHeaders }),
    fetch(`${SUPABASE_URL}/rest/v1/seape_registros?protocolo=eq.${encodeURIComponent(protocoloLimpo)}&select=id,protocolo,status,observacoes,data_entrada,tema,nome`, { headers: defaultHeaders })
]);
        

        if (resSefrep.status === 429 || resSeape.status === 429) {
            return res.status(429).json({ error: "Limite de consultas atingido no Banco de Dados. Aguarde." });
        }

        const dadosSefrep = await resSefrep.json();
        const dadosSeape = await resSeape.json();

        let todosResultados = [
            ...(dadosSefrep || []).map(p => ({ ...p, origem: 'SEFREP' })),
            ...(dadosSeape || []).map(p => ({ ...p, origem: 'SEAPE' }))
        ];

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
            const resFila = await fetch(`${SUPABASE_URL}/rest/v1/sefrep_registros?tema=ilike.*VTC*&or=(status.ilike.*lise*,status.ilike.*andamento*,status.ilike.*exig*)&select=id,data_entrada,created_at`, { headers: defaultHeaders });
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
