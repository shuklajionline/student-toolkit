// AI requests go through a Cloudflare Worker so no API key ever reaches the browser.
// After deploying workers/ai-proxy, paste its URL here. While this is empty, AI features show a friendly error.
window.ST_AI_ENDPOINT = '';

window.stAiChat = async function ({ messages, max_tokens = 1000, temperature = 0.5 }) {
  if (!window.ST_AI_ENDPOINT) {
    throw new Error('AI features are temporarily unavailable. Please try again soon.');
  }
  const res = await fetch(window.ST_AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens, temperature }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `AI service error (${res.status}). Please try again.`);
  return data.content;
};
