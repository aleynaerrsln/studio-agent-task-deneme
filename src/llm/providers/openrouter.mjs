import {
  ProviderUnavailable,
  ProviderRateLimited,
  ProviderError,
} from './errors.mjs';

const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export async function callOpenRouter({ systemPrompt, userPrompt }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new ProviderUnavailable('openrouter', 'OPENROUTER_API_KEY not set');
  }

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/studio-agent',
        'X-Title': 'Studio Agent',
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
    throw new ProviderError('openrouter', `network: ${e.message}`);
  }

  if (res.status === 429) throw new ProviderRateLimited('openrouter');
  if (res.status === 401 || res.status === 403)
    throw new ProviderUnavailable('openrouter', `auth (HTTP ${res.status})`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new ProviderError(
      'openrouter',
      `HTTP ${res.status} ${txt.slice(0, 120)}`,
    );
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError('openrouter', 'empty response');

  return {
    raw: text,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
    },
    cost_estimate_usd: 0,
  };
}
