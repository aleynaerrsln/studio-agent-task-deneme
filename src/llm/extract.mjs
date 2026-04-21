import { callLLM } from './router.mjs';
import { SYSTEM_PROMPT, buildUserPrompt, RESPONSE_SCHEMA } from './prompt.mjs';

const MAX_RETRIES = 5;
const BUDGET_USD = 0.1;
const PROVIDER_ROTATION = ['gemini', 'groq', 'openrouter', 'cloudflare'];

const SLOT_TO_SECTION = {
  'SLOT 1 (journal_bar)': 'KB preamble > **Kaynak:** satırı',
  'SLOT 2 (title)': 'KB H1 (# ile başlayan ilk satır)',
  'SLOT 3 (study_type_prefix)': 'KB preamble + design section',
  'SLOT 4 (POPULATION)': 'KB section 1 GENEL BİLGİLER + section 2 TANIMLAYICI İSTATİSTİKLER',
  'SLOT 5 (INTERVENTION)': "KB section 1'deki Tedavi Kolları tablosu",
  'SLOT 6 (SETTINGS)': "KB section 1'deki Lokasyon / Çalışma Tasarımı",
  'SLOT 7 (PRIMARY OUTCOME)': 'KB PRIMARY ENDPOINT bölümünün başlığı + ilk paragrafı (DEFINITION)',
  'SLOT 8 (FINDINGS)': 'KB PRIMARY ENDPOINT Results tablosu + RANKED SECONDARY (timeline) + ANAHTAR MESAJLAR',
};

function guessSlot(message) {
  const m = String(message ?? '');
  if (/journal_bar/.test(m)) return 'SLOT 1 (journal_bar)';
  if (/header\.title/.test(m)) return 'SLOT 2 (title)';
  if (/study_type_prefix/.test(m)) return 'SLOT 3 (study_type_prefix)';
  if (/population|gender_breakdown|condition|eligibility|age_summary|top_panels\[\]:\s*"(?:adults|male|female|aged)/i.test(m))
    return 'SLOT 4 (POPULATION)';
  if (/intervention|arms\[\]|top_panels\[\].*?(?:dose|route|schedule|n)|arms\./i.test(m))
    return 'SLOT 5 (INTERVENTION)';
  if (/bottom_panels\[\]:\s*"(?:\d+\s*(?:merkez|center)|multi|single)/i.test(m) || /settings/i.test(m))
    return 'SLOT 6 (SETTINGS)';
  if (/primary_outcome|bottom_panels\[\]/i.test(m)) return 'SLOT 7 (PRIMARY OUTCOME)';
  if (/hero_panel|findings|chart/i.test(m)) return 'SLOT 8 (FINDINGS)';
  if (/footer|citation/i.test(m)) return 'footer';
  return 'bilinmeyen';
}

function formatRetryFeedback(lint) {
  const items = [];
  for (const e of lint.errors ?? []) {
    const slot = guessSlot(e.message);
    items.push(
      `- [error] ${slot}: ${truncate(e.message, 220)}\n  KAYNAK: ${SLOT_TO_SECTION[slot] ?? 'paper bölümünü yeniden oku'}`,
    );
  }
  for (const w of lint.warnings ?? []) {
    const slot = guessSlot(w.message);
    items.push(
      `- [warning] ${slot}: ${truncate(w.message, 220)}\n  KAYNAK: ${SLOT_TO_SECTION[slot] ?? 'paper bölümünü yeniden oku'}`,
    );
  }
  return items.join('\n\n');
}

function cleanJsonText(text) {
  let t = String(text ?? '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  return t.trim();
}

export async function extractWithLLM({ wiki, validate }) {
  let retryFeedback = null;
  let totalCost = 0;
  const history = [];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (totalCost > BUDGET_USD) {
      const err = new Error(`LLM budget exceeded: $${totalCost.toFixed(4)} > $${BUDGET_USD}`);
      err.history = history;
      throw err;
    }

    const preferred = PROVIDER_ROTATION[attempt % PROVIDER_ROTATION.length];
    const userPrompt = buildUserPrompt(wiki.rawText, retryFeedback);

    let result;
    try {
      result = await callLLM(
        { systemPrompt: SYSTEM_PROMPT, userPrompt, schema: RESPONSE_SCHEMA },
        { preferredProvider: preferred },
      );
    } catch (e) {
      history.push({
        attempt,
        preferred,
        error: e.message,
        provider_attempts: e.attempts,
      });
      const err = new Error(e.message);
      err.history = history;
      err.attempts = e.attempts;
      throw err;
    }
    history.lastProvider = result.provider;
    totalCost += result.cost_estimate_usd ?? 0;

    let payload;
    try {
      payload = JSON.parse(cleanJsonText(result.raw));
    } catch (e) {
      history.push({
        attempt,
        provider: result.provider,
        error: 'json-parse',
        raw_preview: result.raw.slice(0, 160),
      });
      retryFeedback = `JSON parse hatası (önceki cevap geçerli JSON değildi). Sadece geçerli tek bir JSON objesi döndür, markdown fence yazma.`;
      continue;
    }

    const lint = validate(payload);
    history.push({
      attempt,
      provider: result.provider,
      preferred,
      lint_errors: lint.errors?.length ?? 0,
      lint_warnings: lint.warnings?.length ?? 0,
      lint_detail: (lint.errors ?? [])
        .concat(lint.warnings ?? [])
        .slice(0, 3)
        .map((e) => `${e.rule}: ${truncate(e.message, 120)}`),
      cost: result.cost_estimate_usd,
    });

    if (lint.passed) {
      return {
        payload,
        provider: result.provider,
        retries: attempt,
        cost: +totalCost.toFixed(6),
        history,
      };
    }

    retryFeedback = formatRetryFeedback(lint);
  }

  const err = new Error(`LLM extraction failed after ${MAX_RETRIES} attempts`);
  err.history = history;
  throw err;
}

function truncate(s, n) {
  const str = String(s ?? '');
  return str.length > n ? str.slice(0, n) + '…' : str;
}
