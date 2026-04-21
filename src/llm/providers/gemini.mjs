import {
  ProviderUnavailable,
  ProviderRateLimited,
  ProviderError,
} from './errors.mjs';

const MODEL = 'gemini-1.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function callGemini({ systemPrompt, userPrompt, schema }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new ProviderUnavailable('gemini', 'GEMINI_API_KEY not set');
  }

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  };
  if (schema) body.generationConfig.responseSchema = schema;

  let res;
  try {
    res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ProviderError('gemini', `network: ${e.message}`);
  }

  if (res.status === 429) throw new ProviderRateLimited('gemini');
  if (res.status === 401 || res.status === 403)
    throw new ProviderUnavailable('gemini', `auth (HTTP ${res.status})`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new ProviderError('gemini', `HTTP ${res.status} ${txt.slice(0, 120)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ProviderError('gemini', 'empty response');

  return {
    raw: text,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
    cost_estimate_usd: estimateCost(data.usageMetadata),
  };
}

function estimateCost(usage) {
  const input = ((usage?.promptTokenCount ?? 0) / 1_000_000) * 0.075;
  const output = ((usage?.candidatesTokenCount ?? 0) / 1_000_000) * 0.3;
  return +(input + output).toFixed(6);
}
