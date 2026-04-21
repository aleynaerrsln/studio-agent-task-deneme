import {
  ProviderUnavailable,
  ProviderRateLimited,
  ProviderError,
} from './errors.mjs';

const MODEL = 'llama-3.3-70b-versatile';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export async function callGroq({ systemPrompt, userPrompt }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new ProviderUnavailable('groq', 'GROQ_API_KEY not set');
  }

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
  } catch (e) {
    throw new ProviderError('groq', `network: ${e.message}`);
  }

  if (res.status === 429) throw new ProviderRateLimited('groq');
  if (res.status === 401 || res.status === 403)
    throw new ProviderUnavailable('groq', `auth (HTTP ${res.status})`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new ProviderError('groq', `HTTP ${res.status} ${txt.slice(0, 120)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError('groq', 'empty response');

  return {
    raw: text,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
    cost_estimate_usd: 0,
  };
}
