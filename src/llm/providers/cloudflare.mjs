import {
  ProviderUnavailable,
  ProviderRateLimited,
  ProviderError,
} from './errors.mjs';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export async function callCloudflare({ systemPrompt, userPrompt, schema }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId?.trim() || !token?.trim()) {
    throw new ProviderUnavailable(
      'cloudflare',
      'CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not set',
    );
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;
  const body = {
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  };
  if (schema) {
    body.response_format = { type: 'json_schema', json_schema: schema };
  }

  let res;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new ProviderError('cloudflare', `network: ${e.message}`);
  }

  if (res.status === 429) throw new ProviderRateLimited('cloudflare');
  if (res.status === 401 || res.status === 403)
    throw new ProviderUnavailable('cloudflare', `auth (HTTP ${res.status})`);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new ProviderError(
      'cloudflare',
      `HTTP ${res.status} ${txt.slice(0, 120)}`,
    );
  }

  const data = await res.json();
  const text = data.result?.response;
  if (!text) throw new ProviderError('cloudflare', 'empty response');

  return {
    raw: text,
    usage: { input_tokens: 0, output_tokens: 0 },
    cost_estimate_usd: 0,
  };
}
