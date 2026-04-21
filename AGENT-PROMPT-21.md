# İterasyon-21 — Provenance binding (içerik > görünüm, halüsinasyon sıfıra)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-20 ezberi kırdı: drug-name hardcoding silindi (grep boş), KB2 LLM tek-shot extract etti. Ama **içerik doğruluğu** hâlâ mekanik olarak kanıtlanamıyor.

Problemler:

1. **Text field'larda soft warning:** Level A/B trace sayısal değerleri yakalıyor. Ama `condition`, `eligibility_summary`, `body` gibi text field'lar overlap threshold ile geçiyor — LLM KB-yakın ama KB-değil cümle yazsa lint geçer.
2. **Slot-section mapping:** LLM primary_outcome.body'ye Findings narrative'i koysa yakalanmaz (iki section içerikleri benzer).
3. **Provenance yokluğu:** Output JSON'a bakınca "bu değer KB'nin hangi satırından geldi?" cevabı yok.

Kullanıcı odağı netleştirdi: **"görünüm değil, içeriğe odaklan. içeriğin düzgün özetlenip bölümlenmesine."**

Bu iterasyon ikon/chart/CSS polish **pas geçer**. Tek odak: *"Output JSON'daki her değer KB'nin neresinden geldi ve bunu mekanik olarak kanıtlayabilir miyim?"*

`idea.md` rafine edildi: **"Provenance binding — halüsinasyonu kodla imkansız kıl"** bölümü eklendi. Önce bu bölümü oku (idea.md'nin sonuna yakın).

---

## Bu iterasyonda yapılacaklar

### 1. `_metadata.provenance` schema alanı (additive)

Payload yapısı **DEĞİŞMEZ**. Sadece `_metadata` altına yeni alan:

```javascript
{
  "_metadata": {
    "artifact_type": "graphical-abstract",
    "schema_version": "2.0",
    "extraction_mode": "llm" | "rule-based",
    "provenance": {
      "<dot-path>": {
        "source_quote": "<KB'den BİREBİR alıntı>",
        "kb_section": "<KB section başlığı>" | "preamble" | "derived"
      },
      ...
    }
    // mevcut metadata alanları aynen kalır
  },
  "header": { ... },  // değişmeden
  "layout": { ... },   // değişmeden
  "footer": { ... }
}
```

Schema version **2.0 kalır** (additive — breaking değil). `_metadata.provenance` opsiyonel yeni alan, eski tüketici görmezden gelir.

### 2. Provenance path grameri

Path = dot-notation payload yolu. Array'ler için `[i]` index:

- `header.title`
- `header.journal_bar.name`
- `header.study_type_prefix`
- `layout.top_panels[0].primary_number`
- `layout.top_panels[0].condition`
- `layout.top_panels[0].age_summary`
- `layout.top_panels[0].eligibility_summary`
- `layout.top_panels[0].gender_breakdown.male`
- `layout.top_panels[1].arms[0].label`
- `layout.top_panels[1].arms[0].dose`
- `layout.top_panels[1].header_number`
- `layout.bottom_panels[0].primary_number`
- `layout.bottom_panels[0].body`
- `layout.bottom_panels[1].body`
- `layout.hero_panel.body`
- `layout.hero_panel.primary_number`
- `layout.hero_panel.chart.data.points[0].value`
- `layout.hero_panel.chart.data.series[0].values[i]`
- `layout.hero_panel.secondary_numbers[0].value`
- `footer.citation`

**Derivation field'ları** (provenance'ı `kb_section: "derived"` olan):
- `layout.top_panels[0].icon_hint`
- `layout.top_panels[1].arms[*].icon_hint`
- `layout.bottom_panels[0].icon_hint`
- `layout.bottom_panels[1].icon_hint`
- `layout.hero_panel.icon_hint`
- `layout.hero_panel.chart.type`
- `header.journal_bar.color`
- `header.journal_bar.accent`
- `header.study_type_prefix` (opsiyonel — eğer detectStudyTypePrefix kullanıyorsan "derived", eğer LLM literal çekiyorsa gerçek kb_section)

### 3. Lint kuralı: `provenance-binding` (strict)

Yeni lint kuralı `src/lint.mjs` (veya `src/lint/rules/provenance-binding.mjs`):

```javascript
export const provenanceBindingRule = {
  id: 'provenance-binding',
  severity: 'error',
  check: (artifact, { kb }) => {
    const provenance = artifact._metadata?.provenance ?? {};
    const errors = [];

    // 1. Her non-derived payload field'ı için provenance var mı?
    const requiredPaths = extractRequiredPaths(artifact);
    for (const path of requiredPaths) {
      if (!(path in provenance)) {
        errors.push(`${path}: provenance eksik`);
      }
    }

    // 2. Her provenance entry için zinciri doğrula
    for (const [path, prov] of Object.entries(provenance)) {
      const value = getValueAtPath(artifact, path);
      if (value == null || value === '') continue;  // null alanlar atlanır

      // "derived" ise value-derivation validation yapma, sadece kb_section'ı kontrol et
      if (prov.kb_section === 'derived') continue;

      // Value → source_quote
      const valueStr = String(value);
      const quoteStr = String(prov.source_quote ?? '');
      if (!normalizedIncludes(quoteStr, valueStr)) {
        errors.push(`${path}: value "${valueStr}" source_quote'da yok`);
      }

      // Source_quote → KB
      const kbRaw = kb.raw;
      if (!normalizedIncludes(kbRaw, quoteStr)) {
        errors.push(`${path}: source_quote "${quoteStr.slice(0, 60)}..." KB'de literal bulunamadı`);
      }

      // kb_section KB'de var mı?
      const validSections = new Set(['preamble', 'title', 'derived', ...kb.sections.map((s) => s.title)]);
      if (!validSections.has(prov.kb_section)) {
        // Partial match: KB section başlığı substring match
        const hasMatch = kb.sections.some((s) => s.title.includes(prov.kb_section) || prov.kb_section.includes(s.title));
        if (!hasMatch) {
          errors.push(`${path}: kb_section "${prov.kb_section}" KB'de bulunamadı`);
        }
      }
    }

    if (errors.length) return { error: errors.join('; ') };
    return true;
  },
};

function normalizedIncludes(haystack, needle) {
  const norm = (s) => s.replace(/\s+/g, ' ').replace(/\*{1,2}/g, '').trim().toLowerCase();
  return norm(haystack).includes(norm(needle));
}
```

**`extractRequiredPaths(artifact)`** — payload'daki non-null, non-derived meaningful field'ların listesi. Derived list'i hardcoded exclude edilir.

### 4. LLM prompt genişletmesi

`src/llm/prompt.mjs` SYSTEM_PROMPT sonuna ek:

```
=== PROVENANCE ZORUNLU ===

Her ürettiğin field için _metadata.provenance objesine şunu ekle:

{
  "_metadata": {
    "provenance": {
      "<dot-path>": {
        "source_quote": "<KB markdown'dan BİREBİR alıntı>",
        "kb_section": "<KB section başlığı veya 'preamble'>"
      }
    }
  }
}

KATI KURALLAR:
1. source_quote MUTLAKA KB markdown'da LİTERAL substring olarak geçmeli.
2. Özetleme, parafraz, ÇEVİRİ YASAK. Türkçe KB'den Türkçe alıntı al, İngilizce KB'den İngilizce.
3. Eğer bir field için KB'de karşılık bulamazsan: O FIELD'I PAYLOAD'A YAZMA (null bırak, yok say).
4. kb_section değeri ya KB'deki H2 başlığından biri olmalı (örn. "1. GENEL BİLGİLER"), ya "preamble" (KB'nin H1 üstü kısmı), ya "derived" (ikon/chart/renk gibi türetim alanları).
5. Derived alanlar (icon_hint, chart.type, journal_bar.color/accent) için kb_section: "derived", source_quote: "" (boş).

ÖRNEK DOĞRU:
{
  "header": { "title": "Heads Up — Upadacitinib vs Dupilumab Klinik Çalışması" },
  "_metadata": {
    "provenance": {
      "header.title": {
        "source_quote": "Heads Up — Upadacitinib vs Dupilumab Klinik Çalışması",
        "kb_section": "preamble"
      }
    }
  }
}

ÖRNEK YANLIŞ (PARAFRAZ — YASAK):
{
  "layout": { "top_panels": [{ "condition": "atopic dermatitis" }] },
  "_metadata": {
    "provenance": {
      "layout.top_panels[0].condition": {
        "source_quote": "atopic dermatitis study",  // ❌ KB'de "moderate-to-severe atopic dermatitis" yazıyor
        "kb_section": "1. GENEL BİLGİLER"
      }
    }
  }
}

DOĞRUSU:
{
  "layout": { "top_panels": [{ "condition": "Moderate-to-Severe Atopic Dermatitis" }] },
  "_metadata": {
    "provenance": {
      "layout.top_panels[0].condition": {
        "source_quote": "Moderate-to-Severe Atopic Dermatitis (AD)",
        "kb_section": "1. GENEL BİLGİLER"
      }
    }
  }
}
```

### 5. Rule-based extractor'lara provenance

Profile adapter'lardaki her build fonksiyonu artık `{ payload, provenance }` ikilisi döndürür.

**Örnek — buildPopulation içinde:**

```javascript
function buildPopulation(wiki) {
  const general = findSection(wiki, /genel-bilgiler|general/i);
  const content = general?.content ?? '';

  // Condition extraction + provenance
  const conditionMatch = content.match(/\*\*(?:Condition|Hastal[ıi]k):\*\*\s*(.+?)(?:\n|$)/i);
  const condition = conditionMatch?.[1]?.trim() ?? null;
  const conditionQuote = conditionMatch?.[0] ?? null;

  // Gender extraction
  const genderMatch = content.match(/(\d[\d\s]*)\s*Men[, ]+(\d[\d\s]*)\s*Women/i);
  const genderQuote = genderMatch?.[0] ?? null;

  const payload = {
    role: 'population',
    title: 'Population',
    condition,
    primary_number: genderMatch ? `${genderMatch[1]} Men, ${genderMatch[2]} Women` : null,
    icon_hint: detectPopulationIcon(condition ?? ''),
    // ...
  };

  const provenance = {};
  if (condition) provenance['layout.top_panels[0].condition'] = {
    source_quote: conditionQuote,
    kb_section: general.title,
  };
  if (genderMatch) provenance['layout.top_panels[0].primary_number'] = {
    source_quote: genderQuote,
    kb_section: general.title,
  };
  provenance['layout.top_panels[0].icon_hint'] = {
    source_quote: '',
    kb_section: 'derived',
  };

  return { payload, provenance };
}
```

`compile()` dispatcher tüm build fonksiyonlarının provenance'ını birleştirip `_metadata.provenance`'a koyar.

### 6. Compile dispatcher güncellemesi

`src/artifacts/graphical-abstract.mjs`:

```javascript
export async function compile({ wiki, mode = 'llm' }) {
  if (mode === 'rule-based') {
    const profile = await loadProfile(detectKbProfile(wiki));
    const populationResult = profile.buildPopulation(wiki);
    const interventionResult = profile.buildIntervention(wiki);
    const settingsResult = profile.buildSettings(wiki);
    const primaryOutcomeResult = profile.buildPrimaryOutcome(wiki);
    const findingsResult = profile.buildFindings(wiki);

    const payload = {
      header: { ... },
      layout: {
        top_panels: [populationResult.payload, interventionResult.payload],
        bottom_panels: [settingsResult.payload, primaryOutcomeResult.payload],
        hero_panel: findingsResult.payload,
      },
      footer: { ... },
    };

    const provenance = {
      ...populationResult.provenance,
      ...interventionResult.provenance,
      ...settingsResult.provenance,
      ...primaryOutcomeResult.provenance,
      ...findingsResult.provenance,
      // header provenance'ı için ayrı bir buildHeader ekle
    };

    return { payload, spec, _metadata_extra: { provenance } };
  }

  // LLM mode
  const result = await extractWithLLM({ wiki, spec });
  return {
    payload: result.payload,
    spec,
    _metadata_extra: {
      extraction_mode: 'llm',
      llm_provider: result.llm_provider,
      llm_retries: result.llm_retries,
      provenance: result.payload._metadata?.provenance ?? {},
    },
  };
}
```

### 7. LLM retry feedback — provenance hatası özel format

`src/llm/extract.mjs` retry feedback'i provenance hatalarını özel göstersin:

```javascript
function formatRetryFeedback(lintResult, artifact, kb) {
  const feedback = [];

  for (const err of lintResult.errors) {
    if (err.rule === 'provenance-binding') {
      const paths = parseProvenancePaths(err.message);
      for (const { path, issue, quote } of paths) {
        if (issue === 'source_quote not in KB') {
          // KB'de yakın içeren satırı bul — LLM'e göster
          const nearest = findNearestKbPhrase(kb.raw, quote);
          feedback.push(
`SLOT ${pathToSlot(path)}: source_quote "${quote.slice(0, 80)}..." KB'de literal bulunamadı.
KB'deki yakın ifade: "${nearest.slice(0, 100)}..."
Yeniden dene: source_quote'u KB'den BİREBİR kopyala (özet veya çeviri yapma).`
          );
        } else if (issue === 'value not in source_quote') {
          feedback.push(
`SLOT ${pathToSlot(path)}: value source_quote'da yok.
Muhtemelen value'yu özetlemişsin. source_quote'dan daha kısa/aynı bir substring kullan.`
          );
        } else if (issue === 'kb_section invalid') {
          feedback.push(
`SLOT ${pathToSlot(path)}: kb_section değeri KB'deki section başlıklarından biri olmalı.
KB'de şu section'lar var: ${kb.sections.map((s) => `"${s.title}"`).join(', ')}`
          );
        }
      }
    }
  }

  return feedback.join('\n\n');
}
```

### 8. Renderer dokunma

`src/renderer/html.mjs` **değişmez**. Payload yapısı aynı, provenance sadece `_metadata` altında ve renderer `_metadata`'yı okumuyor. HTML output birebir aynı kalır.

### 9. extractRequiredPaths — derivation hariç tutma

```javascript
const DERIVED_PATH_PATTERNS = [
  /icon_hint$/,
  /chart\.type$/,
  /journal_bar\.color$/,
  /journal_bar\.accent$/,
  /chart_slot$/,
  /grid_position/,
  /role$/,
  /title$/,  // slot title'ları ("Population", "Intervention" vs) derived
  /hero$/,
];

function extractRequiredPaths(artifact) {
  const paths = [];
  collectLeafPaths(artifact, '', paths);
  return paths.filter((p) => {
    if (p.startsWith('_metadata')) return false;
    if (DERIVED_PATH_PATTERNS.some((re) => re.test(p))) return false;
    return true;
  });
}
```

### 10. Test matrisi

```bash
# KB1 rule-based — provenance populated
node bin/studio-agent.mjs compile --source knowledge-base.md --mode=rule-based --out output

# KB2 rule-based — provenance populated
node bin/studio-agent.mjs compile --source knowledge-base-2.md --mode=rule-based --out output-kb2

# KB2 LLM mode — LLM source_quote disiplinine uyuyor mu?
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2-llm
```

**Başarı kriterleri:**

1. **KB1 + KB2 rule-based:** lint PASS, `_metadata.provenance` her non-derived field için dolu, her source_quote KB'de literal substring
2. **KB2 LLM mode:** lint PASS (mümkünse 0 retry), provenance KB'ye trace edilebilir
3. **Hallucination audit (manuel):** output JSON'da 5 random field seç, value → source_quote → KB zincirini elle doğrula
4. **Renderer output'u değişmedi:** HTML iter-20 ile byte-near identical (sadece _metadata.provenance eklenmiş olabilir)

### 11. Grep doğrulamaları

```bash
# Drug-name temizliği iter-20'den beri korunuyor mu?
grep -ri "upadacitinib\|dupilumab" src/kb-profiles/
# Boş olmalı

# Provenance alanı LLM prompt'a eklendi mi?
grep "provenance" src/llm/prompt.mjs
# En az 3 match

# Provenance-binding lint kuralı bağlandı mı?
grep -r "provenance-binding" src/
# En az 2 match (rule + test)
```

### 12. Clinical-summary dokunma

`src/artifacts/clinical-summary.mjs` bu iterasyonda **değişmez**. Provenance mekanizması önce graphical-abstract'ta kanıtlanır, iter-22'de clinical-summary'ye yayılır.

### 13. Kısa rapor (ayrıntılı)

- idea.md "Provenance binding" bölümü yeterince netti mi? Hangi kısım belirsizdi?
- **KB1 rule-based:** provenance'ta kaç field, kaç tanesi kb_section="derived"? Random 3 field'ın value→quote→KB zincirini el ile doğrula ve rapora koy.
- **KB2 rule-based:** aynı analiz. Drug-agnostic extractor'lar her arm için source_quote üretti mi (tablo satırı)?
- **KB2 LLM mode:** LLM source_quote disiplinine uydu mu? Kaç retry? Retry feedback provenance hatasını explicit iletti mi (örnek bir retry round'u göster).
- **Hallucination:** output'ta `_metadata.provenance` olmayan non-derived field var mı? Varsa hangileri?
- **kb_section mapping doğruluğu:** LLM section başlıklarını KB'de literal kullandı mı, yoksa kısaltma/çeviri yaptı mı?
- **Renderer regresyon:** HTML çıktı iter-20 ile aynı mı? Diff var mı?
- **DERIVED_PATH_PATTERNS** doğru tanımlandı mı? Bypass edilmemesi gereken bir field yanlışlıkla bypass ediliyor mu?
- 22. iterasyon (clinical-summary provenance + 3. KB testi) için zemin temiz mi?

### 14. Önemli notlar

- **Bu iterasyon görsel değil içerik iterasyonu.** CSS, ikon, chart polish YOK. Sadece data integrity.
- `_metadata.provenance` **additive** — schema bump yok (2.0 kalır). Eski tüketici bu alanı görmezden gelir.
- LLM için risk: Türkçe KB'den Türkçe source_quote alması gerekiyor. Çeviri reflexi varsa lint reject eder, retry feedback explicit uyarır.
- **Strict lint — soft warning YOK.** Provenance eksik veya kirli → error, compile abort.
- **Derivation list'ini muhafazakar tut.** Yanlışlıkla bir content field derived olarak işaretlenirse halüsinasyon kapısı açılır. Emin değilsen derived YAPMA.

---

Başla. Önce idea.md'nin yeni "Provenance binding" bölümünü oku, `_metadata.provenance` schema'sını ekle, provenance-binding lint kuralını yaz, rule-based extractor'ları provenance döndürecek şekilde güncelle, LLM prompt'a provenance kontratını ekle, retry feedback'i provenance-aware yap, test matrisini çalıştır (3 komut), grep doğrulamalarını yap, ayrıntılı raporla.
