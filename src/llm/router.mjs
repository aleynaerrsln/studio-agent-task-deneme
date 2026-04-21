import { callGemini } from './providers/gemini.mjs';
import { callGroq } from './providers/groq.mjs';
import { callOpenRouter } from './providers/openrouter.mjs';
import { callCloudflare } from './providers/cloudflare.mjs';

const CHAIN = [
  { name: 'gemini', call: callGemini },
  { name: 'groq', call: callGroq },
  { name: 'openrouter', call: callOpenRouter },
  { name: 'cloudflare', call: callCloudflare },
];

export function hasAnyProvider() {
  return (
    !!process.env.GEMINI_API_KEY?.trim() ||
    !!process.env.GROQ_API_KEY?.trim() ||
    !!process.env.OPENROUTER_API_KEY?.trim() ||
    (!!process.env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
      !!process.env.CLOUDFLARE_API_TOKEN?.trim())
  );
}

export async function callLLM(payload, { preferredProvider = null } = {}) {
  const chain = preferredProvider
    ? [
        CHAIN.find((p) => p.name === preferredProvider),
        ...CHAIN.filter((p) => p.name !== preferredProvider),
      ].filter(Boolean)
    : CHAIN;

  const attempts = [];
  for (const provider of chain) {
    try {
      const result = await provider.call(payload);
      return { ...result, provider: provider.name, attempts };
    } catch (err) {
      attempts.push({
        provider: provider.name,
        code: err.code ?? 'UNKNOWN',
        error: err.message,
      });
      if (
        err.code === 'PROVIDER_UNAVAILABLE' ||
        err.code === 'RATE_LIMIT' ||
        err.code === 'PROVIDER_ERROR'
      ) {
        continue;
      }
      throw err;
    }
  }
  const err = new Error(`All providers exhausted`);
  err.attempts = attempts;
  throw err;
}
