# İterasyon-18 — LLM-based semantic extraction (profile pattern'ın tavanını kırma)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-17'de `src/kb-profiles/` adapter pattern kuruldu. KB1 için `statistical-pre-post`, KB2 için `rct-comparison` profile'ları yazıldı. İkisi de PASS verdi. Ama agent kendi raporunda itiraf etti:

> "rct-comparison profile'ında drug isimleri (Upadacitinib, Dupilumab) hardcoded. Üçüncü RCT KB'sinde ilaç isimleri farklı olacak."

Yani paket **jenerik değil** — N hardcoded adapter'ın bir koleksiyonu. Kullanıcı üçüncü farklı tıbbi KB verdiğinde yine kıracak. Paketin iddiası ise **"herhangi bir tıbbi markdown → JAMA visual abstract"**. Rule-based yol bu iddiayı karşılayamıyor.

**İterasyon-18 çözümü:** LLM semantic extraction. LLM KB'yi okur, JAMA şemasına uygun JSON üretir. Mevcut Level A/B trace lint disiplini halüsinasyonu yakalar — KB'de olmayan değer → lint FAIL → retry loop LLM'e targeted feedback verir. Profile adapter'lar `--mode=rule-based` flag'i ile offline fallback olarak kalır.

`idea.md` rafine edildi: **"LLM-based semantic extraction — profile pattern'ın tavanını kırma"** bölümü eklendi. Önce bu yeni bölümü oku (idea.md'nin sonuna yakın).

---

## Bu iterasyonda yapılacaklar

### 1. Dependency durumu

Node.js 20+ olmalı (user Windows 11, Node zaten kurulu). Yeni npm paketi **yok** — native `fetch` ve `--env-file=.env` kullan.

`package.json`'a dependency ekleme. Sadece `"engines": { "node": ">=20" }` satırı eklenebilir.

### 2. `.env` dosyası — user zaten oluşturdu

Beklenen değişkenler:

```
GEMINI_API_KEY=...
OPENROUTER_API_KEY=...
GROQ_API_KEY=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

**Key'lere dokunma, içeriklerini okuma, logla.** Sadece `process.env.GEMINI_API_KEY` gibi environment variable olarak referansla.

`.gitignore` ve `.env.example` zaten hazır. Kontrol et:
- `.gitignore` içinde `.env` var mı?
- `.env.example` template'i mevcut mu?

Yoksa oluştur. Mevcutsa dokunma.

### 3. Yeni dizin: `src/llm/`

```
src/llm/
├── router.mjs           # Provider cascade (cockpit pattern)
├── prompt.mjs           # KB → JSON prompt template
├── extract.mjs          # Main orchestration + retry loop
└── providers/
    ├── gemini.mjs       # Google AI Studio (primary)
    ├── groq.mjs         # Groq Cloud (Llama 3.3 70B, ultra-fast)
    ├── openrouter.mjs   # OpenRouter :free models
    └── cloudflare.mjs   # Cloudflare Workers AI
```

### 4. Provider implementasyonu — `src/llm/providers/gemini.mjs`

```javascript
// Gemini 1.5 Flash — structured output destekli
const MODEL = 'gemini-1.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export async function callGemini({ systemPrompt, userPrompt, schema }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ProviderUnavailable('gemini', 'GEMINI_API_KEY not set');

  const res = await fetch(`${ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: schema,  // Gemini structured output
      },
    }),
  });

  if (res.status === 429) throw new ProviderRateLimited('gemini');
  if (res.status === 401 || res.status === 403) throw new ProviderUnavailable('gemini', 'auth');
  if (!res.ok) throw new ProviderError('gemini', `HTTP ${res.status}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ProviderError('gemini', 'empty response');

  return {
    raw: text,
    usage: {
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
    cost_estimate_usd: estimateGeminiCost(data.usageMetadata),
  };
}

function estimateGeminiCost(usage) {
  // Gemini 1.5 Flash: $0.075/M input, $0.30/M output (free tier up to quota)
  const input = (usage?.promptTokenCount ?? 0) / 1_000_000 * 0.075;
  const output = (usage?.candidatesTokenCount ?? 0) / 1_000_000 * 0.30;
  return +(input + output).toFixed(6);
}
```

### 5. Provider — `src/llm/providers/openrouter.mjs`

```javascript
// Ücretsiz model öncelik: meta-llama/llama-3.3-70b-instruct:free veya benzeri
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

export async function callOpenRouter({ systemPrompt, userPrompt, schema }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new ProviderUnavailable('openrouter', 'OPENROUTER_API_KEY not set');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/studio-agent',  // optional, OpenRouter best practice
      'X-Title': 'Studio Agent',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },  // Güvenilir değil her modelde, prompt'ta da JSON iste
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (res.status === 429) throw new ProviderRateLimited('openrouter');
  if (res.status === 401 || res.status === 403) throw new ProviderUnavailable('openrouter', 'auth');
  if (!res.ok) throw new ProviderError('openrouter', `HTTP ${res.status}`);

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError('openrouter', 'empty response');

  return {
    raw: text,
    usage: data.usage ?? {},
    cost_estimate_usd: 0,  // :free modeller için
  };
}
```

### 5b. Provider — `src/llm/providers/groq.mjs`

```javascript
// Groq Cloud — Llama 3.3 70B, çok hızlı (~500 tok/sn), OpenAI-compatible API
const MODEL = 'llama-3.3-70b-versatile';
const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

export async function callGroq({ systemPrompt, userPrompt, schema }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new ProviderUnavailable('groq', 'GROQ_API_KEY not set');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },  // Groq JSON mode destekli
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (res.status === 429) throw new ProviderRateLimited('groq');
  if (res.status === 401 || res.status === 403) throw new ProviderUnavailable('groq', 'auth');
  if (!res.ok) throw new ProviderError('groq', `HTTP ${res.status}`);

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError('groq', 'empty response');

  return {
    raw: text,
    usage: data.usage ?? {},
    cost_estimate_usd: 0,  // Free tier içinde
  };
}
```

### 6. Provider — `src/llm/providers/cloudflare.mjs`

```javascript
// Workers AI Llama 3.3
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export async function callCloudflare({ systemPrompt, userPrompt, schema }) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new ProviderUnavailable('cloudflare', 'CLOUDFLARE_* not set');
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_schema', json_schema: schema },
    }),
  });

  if (res.status === 429) throw new ProviderRateLimited('cloudflare');
  if (res.status === 401 || res.status === 403) throw new ProviderUnavailable('cloudflare', 'auth');
  if (!res.ok) throw new ProviderError('cloudflare', `HTTP ${res.status}`);

  const data = await res.json();
  const text = data.result?.response;
  if (!text) throw new ProviderError('cloudflare', 'empty response');

  return {
    raw: text,
    usage: { input_tokens: 0, output_tokens: 0 },  // Workers AI usage yok döndürmüyor
    cost_estimate_usd: 0,  // Free tier içinde
  };
}
```

### 7. Custom error sınıfları — `src/llm/providers/errors.mjs`

```javascript
export class ProviderUnavailable extends Error {
  constructor(provider, reason) {
    super(`${provider} unavailable: ${reason}`);
    this.code = 'PROVIDER_UNAVAILABLE';
    this.provider = provider;
  }
}

export class ProviderRateLimited extends Error {
  constructor(provider) {
    super(`${provider} rate limited`);
    this.code = 'RATE_LIMIT';
    this.provider = provider;
  }
}

export class ProviderError extends Error {
  constructor(provider, message) {
    super(`${provider}: ${message}`);
    this.code = 'PROVIDER_ERROR';
    this.provider = provider;
  }
}
```

### 8. Router — `src/llm/router.mjs`

```javascript
import { callGemini } from './providers/gemini.mjs';
import { callGroq } from './providers/groq.mjs';
import { callOpenRouter } from './providers/openrouter.mjs';
import { callCloudflare } from './providers/cloudflare.mjs';

// Sıralama: structured-output destekli + en stabil önce
const CHAIN = [
  { name: 'gemini', call: callGemini },        // responseSchema, en güvenilir JSON
  { name: 'groq', call: callGroq },             // JSON mode, çok hızlı
  { name: 'openrouter', call: callOpenRouter }, // :free modeller
  { name: 'cloudflare', call: callCloudflare }, // Workers AI, Llama
];

export async function callLLM(payload, { preferredProvider = null } = {}) {
  const chain = preferredProvider
    ? [CHAIN.find((p) => p.name === preferredProvider), ...CHAIN.filter((p) => p.name !== preferredProvider)]
    : CHAIN;

  const attempts = [];
  for (const provider of chain) {
    if (!provider) continue;
    try {
      const result = await provider.call(payload);
      return { ...result, provider: provider.name, attempts };
    } catch (err) {
      attempts.push({ provider: provider.name, error: err.code ?? err.message });
      if (err.code === 'PROVIDER_UNAVAILABLE' || err.code === 'RATE_LIMIT') continue;
      if (err.code === 'PROVIDER_ERROR') continue;
      throw err;  // beklenmeyen hata → yukarı at
    }
  }
  throw new Error(`All providers exhausted: ${JSON.stringify(attempts)}`);
}
```

### 9. Prompt — `src/llm/prompt.mjs`

```javascript
export const SYSTEM_PROMPT = `Sen tıbbi literatür analisti asistansın. Kullanıcı sana bir knowledge-base markdown'ı verecek. Görevin: bu KB'yi JAMA Internal Medicine visual abstract şemasına uygun JSON'a dönüştürmek.

ZORUNLU KURALLAR:
1. Her sayısal değer KB'de birebir geçmeli. UYDURMA. KB'de yoksa null veya "N/A" kullan.
2. body alanları en fazla 15 kelime.
3. primary_number "sayı + birim" formatında: "n = 673", "+9.8 puan", "%50.3 azalma", "EASI75".
4. hero_panel.chart.type: "slope" (iki zaman noktası — pre/post) veya "bar" (grup karşılaştırması — A vs B).
5. study_type_prefix: "RCT" | "Cohort" | "Meta-analysis" | "Cross-sectional" | "Case-Control" | "Statistical Analysis".
6. Sadece geçerli JSON döndür — markdown wrapper YOK, açıklama YOK.

ŞEMA:
{
  "header": {
    "title": string,
    "study_type_prefix": string
  },
  "layout": {
    "top_panels": [
      { "role": "population", "title": "Population", "primary_number": string, "body": string, "icon_hint": string },
      { "role": "intervention", "title": "Intervention", "primary_number": string, "body": string, "icon_hint": string }
    ],
    "bottom_panels": [
      { "role": "settings", "title": "Settings / Locations", "primary_number": string, "body": string, "icon_hint": string },
      { "role": "primary_outcome", "title": "Primary Outcome", "primary_number": string, "body": string, "icon_hint": string, "secondary_numbers": [{ "label": string, "value": string }] }
    ],
    "hero_panel": {
      "role": "findings", "title": "Findings", "primary_number": string, "body": string, "icon_hint": string,
      "chart": {
        "type": "slope" | "bar",
        "data": { "metric": string, "unit": string|null, "points": [{ "label": string, "value": number }] },
        "annotations": [{ "type": "delta", "value": string, "position": "between-points" }]
      },
      "secondary_numbers": [{ "label": string, "value": string }]
    }
  },
  "footer": {
    "citation": string | null,
    "disclaimer": "Otomatik üretildi; tıbbi içerik — publish öncesi insan onayı önerilir."
  }
}

İCON HINT SEÇENEKLERİ:
- patients-cohort, trial, bar-comparison, downward-trend, lab-setting, outcome-measure, before-after-comparison`;

export function buildUserPrompt(kbMarkdown, retryFeedback = null) {
  let prompt = `Knowledge Base:\n\n${kbMarkdown}\n\nŞemaya uygun JSON döndür.`;
  if (retryFeedback) {
    prompt += `\n\nÖNCEKI DENEMEN LINT HATASI ALDI:\n${retryFeedback}\n\nSadece KB'de birebir geçen değerleri kullan. Tekrar dene.`;
  }
  return prompt;
}

// Gemini structured output için JSON schema (simplified — full schema kod içinde)
export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    header: { type: 'object', properties: {
      title: { type: 'string' },
      study_type_prefix: { type: 'string' },
    }, required: ['title', 'study_type_prefix'] },
    layout: { type: 'object' },  // Full schema kod içinde, burası kısaltıldı
    footer: { type: 'object' },
  },
  required: ['header', 'layout', 'footer'],
};
```

### 10. Extract orchestrator — `src/llm/extract.mjs`

```javascript
import { callLLM } from './router.mjs';
import { SYSTEM_PROMPT, buildUserPrompt, RESPONSE_SCHEMA } from './prompt.mjs';
import { runLint } from '../lint.mjs';  // veya runGraphicalAbstractLint — mevcut path

const MAX_RETRIES = 3;
const BUDGET_USD = 0.10;

export async function extractWithLLM({ wiki, spec }) {
  let retryFeedback = null;
  let totalCost = 0;
  const history = [];

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (totalCost > BUDGET_USD) {
      throw new Error(`Budget exceeded: $${totalCost.toFixed(4)} > $${BUDGET_USD}`);
    }

    const userPrompt = buildUserPrompt(wiki.raw, retryFeedback);
    const result = await callLLM({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      schema: RESPONSE_SCHEMA,
    });
    totalCost += result.cost_estimate_usd;

    let payload;
    try {
      payload = JSON.parse(result.raw);
    } catch (e) {
      history.push({ attempt, error: 'JSON parse failed', raw_preview: result.raw.slice(0, 200) });
      retryFeedback = `JSON parse hatası. Geçerli JSON döndür.`;
      continue;
    }

    // Lint çalıştır — mevcut infrastructure
    const artifact = { _metadata: {}, ...payload };
    const lintResult = runLint(artifact, spec, wiki);

    history.push({
      attempt,
      provider: result.provider,
      lint_errors: lintResult.errors.length,
      lint_warnings: lintResult.warnings.length,
      cost: result.cost_estimate_usd,
    });

    if (lintResult.passed) {
      return {
        payload,
        extraction_mode: 'llm',
        llm_provider: result.provider,
        llm_retries: attempt,
        llm_cost_estimate_usd: +totalCost.toFixed(6),
        llm_history: history,
      };
    }

    // Lint FAIL → retry feedback hazırla
    const failedFields = lintResult.errors.map((e) => `- ${e.rule}: ${e.message}`).join('\n');
    retryFeedback = `Şu alanlar KB'de doğrulanamadı veya uygunsuz:\n${failedFields}`;
  }

  throw new Error(`LLM extraction failed after ${MAX_RETRIES} attempts. History: ${JSON.stringify(history)}`);
}
```

### 11. `graphical-abstract.mjs` — mode dispatcher

Mevcut `compile()` fonksiyonunu genişlet:

```javascript
import { extractWithLLM } from '../llm/extract.mjs';
import { detectKbProfile, loadProfile } from '../kb-profiles/index.mjs';

export async function compile({ wiki, mode = 'llm' }) {
  if (mode === 'rule-based') {
    return compileRuleBased({ wiki });  // mevcut iter-17 kodu
  }

  // LLM mode
  try {
    const result = await extractWithLLM({ wiki, spec });
    return {
      payload: result.payload,
      spec,
      extraction_mode: 'llm',
      _metadata_extra: {
        extraction_mode: 'llm',
        llm_provider: result.llm_provider,
        llm_retries: result.llm_retries,
        llm_cost_estimate_usd: result.llm_cost_estimate_usd,
      },
    };
  } catch (err) {
    // LLM tamamen fail → fallback rule-based'a düş
    console.warn(`[llm] extraction failed, falling back to rule-based: ${err.message}`);
    const ruleResult = compileRuleBased({ wiki });
    return {
      ...ruleResult,
      extraction_mode: 'rule-based',
      _metadata_extra: {
        extraction_mode: 'rule-based',
        llm_fallback_reason: err.message,
      },
    };
  }
}
```

### 12. CLI flag — `bin/studio-agent.mjs`

```javascript
// Mevcut args parsing'e ekle:
const mode = args['--mode'] ?? 'llm';  // default 'llm'

// compile çağrısına mode'u geç
const result = await compile({ wiki, mode });
```

Kullanım:

```bash
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
# default mode=llm

node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2 --render html --mode=rule-based
```

**Not:** `--env-file=.env` flag'i Node 20.6+ destekler. Kullanıcı Node 20+ çalıştırıyor (önce doğrula: `node --version`).

### 13. Test matrisi

```bash
# KB1 LLM mode — regresyon
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base.md --out output-llm --render html
# BEKLENEN: lint PASS, _metadata.extraction_mode='llm', _metadata.llm_provider='gemini', lint disiplini KB'den değerlerin geldiğini doğrular
# Output rule-based'dan farklı olabilir (LLM tarzı cümle kurar) — KRİTİK: lint PASS olsun, byte-eşit olmasın

# KB2 LLM mode — gerçek test
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2-llm --render html
# BEKLENEN: lint PASS, LLM doğru EASI75 değerlerini çekti

# KB1 rule-based — iter-17 regresyon
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html --mode=rule-based
# BEKLENEN: iter-17 ile birebir aynı output

# KB2 rule-based — iter-17 regresyon
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2 --render html --mode=rule-based
# BEKLENEN: iter-17 ile birebir aynı output
```

### 14. Debugging — LLM output'u görünür yap

Her LLM call sonrası `compile-report.json` içine detay yaz:

```json
{
  "extraction_mode": "llm",
  "llm_provider": "gemini",
  "llm_retries": 1,
  "llm_cost_estimate_usd": 0.012,
  "llm_history": [
    { "attempt": 0, "lint_errors": 2 },
    { "attempt": 1, "lint_errors": 0 }
  ]
}
```

Retry olursa kullanıcı görür: LLM ilk seferde halüsinasyon yaptı, ikinci seferde düzeldi.

### 15. Hata yönetimi — .env yoksa

Eğer `GEMINI_API_KEY` + `GROQ_API_KEY` + `OPENROUTER_API_KEY` + `CLOUDFLARE_API_TOKEN` dördü de yoksa:

```
ERROR: LLM mode seçildi ama hiçbir provider API key'i bulunamadı.
  .env dosyasında şunlardan en az biri olmalı:
    - GEMINI_API_KEY
    - GROQ_API_KEY
    - OPENROUTER_API_KEY
    - CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
  Ya da --mode=rule-based ile offline çalıştır.
Exit code 2.
```

### 16. Clinical-summary dokunma

Bu iterasyonda **sadece graphical-abstract** LLM'e geçer. `clinical-summary.mjs` iter-17'den kalma hâli korur — KB2 için zaten FAIL veriyor, iter-20'de LLM'e o da geçecek.

### 17. Kısa rapor (detaylı bekliyorum)

- idea.md "LLM-based semantic extraction" bölümü yeterince netti mi? Ekstra açıklama gerekti mi?
- **Gemini structured output (`responseSchema`) çalıştı mı?** Valid JSON ilk seferde geldi mi, yoksa parse error aldın mı?
- **KB1 LLM mode lint PASS mı?** Kaç retry gerekti? (İdeal: 0 retry)
- **KB2 LLM mode lint PASS mı?** Kaç retry gerekti?
- KB1 rule-based + LLM mode output'larını yan yana koyduğunda farklar nerede? (LLM büyük ihtimalle body cümlelerini farklı kurar — bu beklenen)
- LLM hangi provider'dan cevap döndü? (Gemini ilk denemede oldu mu, fallback'a düşüldü mü)
- Retry feedback mekanizması LLM'e etkili oldu mu? (Örnek: ilk attempt'te halüsinasyon → retry'de düzeldi)
- Toplam cost ne oldu? (Free tier'da $0 olmalı, ama estimate tracking çalışıyor mu)
- **Cloudflare Workers AI** JSON schema response_format kabul etti mi? (Llama modelleri structured output'ta Gemini kadar güvenilir değil)
- `--env-file=.env` Node flag'i Windows'ta sorunsuz çalıştı mı?
- 19. iterasyon (PNG export) için zemin temiz mi?

### 18. Önemli notlar

- Bu iterasyon **additive** — schema version bump YOK (1.2 kalıyor). Mevcut JSON schema genişlemiyor, sadece `_metadata.extraction_mode` gibi izleme alanları ekleniyor.
- Rule-based mode **bozulmamalı**. İterasyon sonunda iter-17 test matrisi birebir PASS vermeli.
- API key'leri koda veya log'a koyma. `.env` değişkenleri sadece `process.env.X` referansıyla kullanılmalı.
- LLM maliyeti tez için sıfıra yakın (free tier) ama **budget check** dev açısından önemli — sonsuz retry'de fatura patlamasın.
- **Halüsinasyon güvenlik ağı:** Mevcut Level A/B lint zaten hazır. Yeni lint kuralı yazma — lint LLM'in uydurduğu değeri zaten yakalayacak, retry feedback onu LLM'e geri besleyecek.

### 19. Bekle — `ReferenceError: fetch is not defined` çıkarsa

Node 18+ global `fetch` sağlar. Eğer user Node 16 veya eski çalıştırıyorsa hata verir. İlk adım: `node --version` kontrol et. `<20` ise user'a bildir, iterasyon durdur. Polyfill ekleme — `node-fetch` npm paketi gerektirir, gereksiz dependency.

---

Başla. Önce idea.md'nin yeni "LLM-based semantic extraction" bölümünü oku, Node sürümünü kontrol et, `.env.example` ve `.gitignore` hazır mı teyit et, `src/llm/` dizinini kur (router + 3 provider + prompt + extract), `graphical-abstract.mjs`'e mode dispatcher ekle, CLI'a `--mode` flag'i ekle, test matrisini çalıştır (4 komut), her birinin sonucunu raporla.
