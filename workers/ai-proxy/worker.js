// Student Toolkit AI proxy. Holds the Groq key server-side and limits abuse.
// The key is a Cloudflare secret (GROQ_API_KEY), never committed to the repo.

const ALLOWED_ORIGINS = new Set(['https://studenttoolkit.online', 'https://www.studenttoolkit.online']);
const MODEL = 'llama-3.3-70b-versatile';
const MAX_CHARS = 16000;
const MAX_TOKENS = 4096;
const LIMIT_PER_HOUR = 20;

// Best effort: counts live per Worker instance, so this slows abuse but is not a hard cap.
const hits = new Map();

function overLimit(ip, now = Date.now()) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMIT_PER_HOUR;
}

function reply(status, body, origin) {
  const headers = { 'Content-Type': 'application/json', Vary: 'Origin' };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function validMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 4) return false;
  let total = 0;
  for (const m of messages) {
    if (!m || !['system', 'user'].includes(m.role) || typeof m.content !== 'string') return false;
    total += m.content.length;
  }
  return total > 0 && total <= MAX_CHARS;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!ALLOWED_ORIGINS.has(origin)) return reply(403, { error: 'Origin not allowed.' }, origin);
    if (request.method === 'OPTIONS') return reply(204, null, origin);
    if (request.method !== 'POST') return reply(405, { error: 'Use POST.' }, origin);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (overLimit(ip)) return reply(429, { error: 'Too many requests. Please try again in an hour.' }, origin);

    const body = await request.json().catch(() => null);
    if (!body || !validMessages(body.messages)) return reply(400, { error: 'Invalid request.' }, origin);

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: body.messages,
        max_tokens: Math.min(Number(body.max_tokens) || 1000, MAX_TOKENS),
        temperature: Math.min(Math.max(Number(body.temperature) || 0.5, 0), 1),
      }),
    });
    if (!upstream.ok) return reply(502, { error: 'The AI service is busy. Please try again.' }, origin);

    const data = await upstream.json();
    return reply(200, { content: data.choices?.[0]?.message?.content || '' }, origin);
  },
};
