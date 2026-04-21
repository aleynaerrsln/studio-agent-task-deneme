# İterasyon-20 — Structural 8-slot recipe (ezberi kırma, section-aware extraction)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-19 schema 2.0 görsel zenginliğini getirdi ama **ezberi kırmadı**. Agent kendi raporunda itiraf etti:

> "rct-comparison profile hâlâ 'Upadacitinib' ve 'Dupilumab' isimlerini hardcoded çağırıyor"

Ayrıca LLM path iki denemede de provider'lar tükenip rule-based fallback'e düştü. Sonuç: güzel KB2 output aslında **KB2'ye özel ezber**. Farklı bir paper (farklı ilaçlar/alan) kırardı.

Kullanıcı üç farklı JAMA visual abstract'ını (Upadacitinib/Dermatology, MI Training/Network Open, ETC Dialysis/Health Forum) paper'larıyla eşleştirip analiz etti. Sonuç: **8 sabit slot × sabit paper bölümü** mapping'i. Paper ne hakkında olursa olsun aynı recipe.

`idea.md`'ye bu recipe eklendi: **"Structural recipe — JAMA'nın 8-slot haritası"** bölümü. Önce bu bölümü oku (idea.md'nin sonuna yakın).

Bu iterasyon **ezberi kırar**. Test: KB2 LLM mode'da **fallback'e düşmeden** tek başına PASS vermeli.

---

## 8-slot × paper bölümü mapping (referans tablo)

| # | Visual Abstract Slot | Paper Bölümü (Sabit) |
|---|---|---|
| 1 | Journal bar | İlk sayfa header + citation satırı |
| 2 | Title + RCT/Cohort prefix | Paper ana başlığı + alt başlığı |
| 3a | Population gender breakdown | RESULTS §1 (ilk paragraf) |
| 3b | Population condition | DESIGN, SETTING, AND PARTICIPANTS |
| 3c | Population age summary | RESULTS §1 veya Table 1 |
| 3d | Population eligibility | DESIGN veya Methods |
| 4a | Intervention total N header | CONSORT veya RESULTS §1 |
| 4b | Intervention arms[] | INTERVENTIONS bölümü |
| 5 | Settings/locations | DESIGN, SETTING, AND PARTICIPANTS ilk cümle |
| 6 | Primary outcome (definition) | MAIN OUTCOMES AND MEASURES (sonuç değil tanım) |
| 7a | Findings narrative | Key Points → Findings |
| 7b | Findings chart data | RESULTS + Table (chart.type outcome yapısına göre) |
| 7c | Findings statistics | RESULTS → Primary Outcome paragrafı |
| 8 | Footer citation | Paper bibliografik satır |

## Chart type selection rules

```
slope  : iki zaman noktası, tek seri (pre/post — paired)
bar    : iki grup, tek zaman, anlamlı fark
line   : çoklu zaman noktası, iki+ grup (efficacy over time)
donut  : iki grup, tek zaman, NULL result (p > 0.05)  [YENİ]
```

## Icon taxonomy

- **Population:** condition keyword → organ icon (skin/kidney/heart/lung) veya demographic (users-group for pediatri)
- **Intervention arm:** modality keyword → route icon (pill/syringe/iv-drip) veya non-drug (conversation/clipboard/money/scalpel) veya null (prohibition)
- **Settings:** scope keyword → single (hospital) / multi (network) / international (globe)

---

## Bu iterasyonda yapılacaklar

### 1. `src/artifacts/graphical-abstract.mjs` — schema 2.0'a minor patch

Schema version KALIR 2.0 (breaking değişiklik yok, sadece alan genişlemesi). Yeni alanlar:

- `hero_panel.chart.type` enum'una `'donut'` eklenir
- `hero_panel.chart.data.groups[]` donut için yeni yapı (label + value + total)

`numeric_fields` path'leri:
```javascript
{ path: 'layout.hero_panel.chart.data.groups[].value', required: false, ... }
```

### 2. Yeni modül: `src/renderer/icon-taxonomy.mjs`

```javascript
/*
 * Keyword-based icon selector. KB içeriğine göre (drug name/disease name ezbersiz)
 * uygun icon_hint döndürür. LLM ve rule-based extractor'lar bunu kullanır.
 */

export function detectPopulationIcon(conditionText) {
  const t = (conditionText ?? '').toLowerCase();
  if (/dermatit|psoriasis|eczema|atopic|skin/.test(t)) return 'skin-cross-section';
  if (/kidney|renal|esrd|eskd|dialys|nephro/.test(t)) return 'kidney';
  if (/cardi|heart|myocard|coronary/.test(t)) return 'heart';
  if (/pulmonar|lung|asthma|copd|respirat/.test(t)) return 'lungs';
  if (/diabet|glyc|insulin/.test(t)) return 'activity';
  if (/pediatr|adolescent|youth|child|infant/.test(t)) return 'users-group';
  if (/psychiatr|depression|anxiety|mental/.test(t)) return 'brain';
  if (/oncolog|cancer|carcinoma|tumor|malign/.test(t)) return 'activity';
  if (/gastro|intestin|bowel|ibd/.test(t)) return 'activity';
  if (/neuro|parkinson|alzheimer|dementia/.test(t)) return 'brain';
  return 'patients-cohort';
}

export function detectInterventionIcon(armText) {
  const t = (armText ?? '').toLowerCase();
  // Control / null arms
  if (/no\s+intervention|no\s+treatment|untreated/.test(t)) return 'prohibition';
  if (/placebo|sham/.test(t)) return 'prohibition';
  // Drug route
  if (/oral|tablet|once\s+daily|by\s+mouth|\bpo\b/.test(t)) return 'pill';
  if (/capsule/.test(t)) return 'capsule';
  if (/subcutaneous|\bsc\b|injection|every\s+(?:other|\d+)\s+week/.test(t)) return 'syringe';
  if (/intravenous|\biv\b|infusion/.test(t)) return 'iv-drip';
  if (/inhaled|inhaler|nebuli/.test(t)) return 'inhaler';
  if (/topical|cream|ointment/.test(t)) return 'clipboard';
  // Non-drug interventions
  if (/training|course|workshop|educat/.test(t)) return 'conversation';
  if (/counseling|interview|therapy|behavior/.test(t)) return 'conversation';
  if (/financial|incentive|payment|reimburse/.test(t)) return 'money';
  if (/surgery|surgical|operation|procedure/.test(t)) return 'scalpel';
  if (/usual\s+care|standard\s+care|\btau\b|routine/.test(t)) return 'clipboard';
  return 'clipboard';
}

export function detectSettingsIcon(scopeText) {
  const t = (scopeText ?? '').toLowerCase();
  if (/\d+\s*countri|international|multi-?countr/.test(t)) return 'globe';
  if (/\d+\s*center|multi-?cent|nationwide|across\s+the\s+us|across\s+europe/.test(t)) return 'network';
  if (/single-?cent|one\s+hospital|university\s+\w+\s+hospital/.test(t)) return 'hospital';
  return 'hospital';
}

export function detectStudyTypePrefix(titleSubtitle) {
  const t = (titleSubtitle ?? '').toLowerCase();
  if (/cluster\s+randomi/.test(t)) return 'Cluster RCT';
  if (/randomi[sz]ed\s+clinical\s+trial|randomi[sz]ed\s+controlled\s+trial/.test(t)) return 'RCT';
  if (/meta-?analysis|systematic\s+review/.test(t)) return 'Meta-analysis';
  if (/cohort\s+study/.test(t)) return 'Cohort';
  if (/cross-?sectional/.test(t)) return 'Cross-sectional';
  if (/case-?control/.test(t)) return 'Case-Control';
  if (/case\s+series/.test(t)) return 'Case Series';
  return 'Study';
}
```

### 3. Icon library'ye yeni iconlar

`src/renderer/icons.mjs` dosyasına şu iconlar eklenir (yoksa):

- `users-group` (iki figür — pediatri/adolescent)
- `money` (dolar bill/banknote)
- `prohibition` (daire içi çapraz çizgi — null/no intervention)
- `network` (bağlı node'lar — multi-center network)
- `conversation` (iki figür konuşuyor — counseling/training)
- `kidney` (böbrek anatomy)

Lucide'dan SVG path kopyala, MIT lisans notu mevcutsa ekleme. Custom çizilmesi gerekenler (skin-cross-section gibi) minimal SVG olarak.

### 4. Chart selector — `src/chart-selector.mjs`

```javascript
/**
 * Outcome yapısına göre chart tipini seçer.
 * Rule-based ve LLM path'i ikisi de bunu kullanır.
 */
export function selectChartType(outcomeData) {
  const { timePoints, groups, pValue, pre, post } = outcomeData;

  // Line: çoklu zaman noktası
  if (timePoints && timePoints.length > 2) return 'line';

  // Slope: paired pre/post
  if (pre != null && post != null && !groups) return 'slope';

  // Donut: null result 2-group (p > 0.05)
  if (groups === 2 && typeof pValue === 'number' && pValue > 0.05) return 'donut';

  // Bar: 2-group significant comparison
  if (groups === 2) return 'bar';

  return 'bar';  // fallback
}
```

### 5. Donut chart renderer — `src/renderer/html.mjs`

Mevcut `renderChart(chart)` fonksiyonuna case ekle:

```javascript
function renderChart(chart, journalAccent) {
  if (!chart) return '';
  if (chart.type === 'slope') return renderSlopeChart(chart, journalAccent);
  if (chart.type === 'bar') return renderBarChart(chart, journalAccent);
  if (chart.type === 'line') return renderLineChart(chart, journalAccent);
  if (chart.type === 'donut') return renderDonutChart(chart, journalAccent);
  return '';
}

function renderDonutChart({ data, annotations }, accent) {
  // data.groups: [{ label, value, total? }, ...]
  // İki donut yan yana, her biri value/100 oranını dolu yay olarak
  const donuts = data.groups.map((g, i) => {
    const pct = g.value;  // 0-100 arası yüzde
    const cx = 80 + i * 160;
    const cy = 100;
    const r = 55;
    const circumference = 2 * Math.PI * r;
    const dash = (pct / 100) * circumference;
    const gap = circumference - dash;
    const color = i === 0 ? '#dc2626' : accent;  // control kırmızı, treatment accent
    return `
      <g transform="translate(${cx}, ${cy})">
        <circle r="${r}" fill="none" stroke="#fce7e7" stroke-width="24" />
        <circle r="${r}" fill="none" stroke="${color}" stroke-width="24"
          stroke-dasharray="${dash} ${gap}" transform="rotate(-90)" />
        <text text-anchor="middle" y="8" font-size="18" font-weight="700" fill="#111">${pct.toFixed(2)}%</text>
        <text text-anchor="middle" y="${r + 30}" font-size="11" fill="#555">${g.label}</text>
      </g>
    `;
  }).join('');

  return `
    <svg viewBox="0 0 320 200" class="chart chart-donut" role="img" aria-label="${data.metric}">
      ${donuts}
    </svg>
  `;
}
```

### 6. `rct-comparison.mjs` — section-aware refactor (drug-agnostic)

**Mevcut:** drug ismi hardcoded (11 yerde Upadacitinib/Dupilumab). Yeni: sadece paper yapısına bağlı.

```javascript
import { detectPopulationIcon, detectInterventionIcon, detectSettingsIcon, detectStudyTypePrefix } from '../renderer/icon-taxonomy.mjs';
import { selectChartType } from '../chart-selector.mjs';

function findSection(wiki, pattern) {
  const lower = pattern.source.toLowerCase();
  return wiki.sections.find((s) => pattern.test(s.id) || pattern.test(s.title.toLowerCase())) ?? null;
}

function buildPopulation(wiki) {
  const general = findSection(wiki, /genel-bilgiler|general|design-setting/i);
  const demo = findSection(wiki, /tanimlayici|demographic|baseline/i);
  const content = (general?.content ?? '') + '\n' + (demo?.content ?? '');

  // Gender — drug/disease bağımsız
  const genderM = content.match(/(\d[\d\s]*)\s*Men\s*,\s*(\d[\d\s]*)\s*Women/i)
    ?? content.match(/Gender.*?(\d[\d\s]*)\s*Men.*?(\d[\d\s]*)\s*Women/i);
  const genderBreakdown = genderM ? {
    male: parseInt(genderM[1].replace(/\s/g, ''), 10),
    female: parseInt(genderM[2].replace(/\s/g, ''), 10),
  } : null;

  // Condition — ** Hastalık: ...
  const condition = content.match(/\*\*(?:Condition|Hastal[ıi]k|Disease)[:\*]+\s*(.+?)(?:\n|$)/i)?.[1]?.trim()
    ?? wiki.preamble.match(/\*\*(?:Hastal[ıi]k|Condition|Disease):\*\*\s*(.+?)$/im)?.[1]?.trim();

  // Age — mean (SD) X years
  const ageM = content.match(/[Mm]ean\s*(?:\(SD\))?\s*age[,\s:]+(\d+\.?\d*)\s*\(?\s*(?:SD\s*)?(\d+\.?\d*)?\)?\s*(?:years|y|yıl)?/);
  const ageSummary = ageM ? `Mean age, ${ageM[1]}${ageM[2] ? ` (SD ${ageM[2]})` : ''} y` : null;

  // Eligibility — tek cümle
  const eligibility = content.match(/(?:Adults?|Patients?|Youths?)\s+aged?\s+\d+.*?(?:\n|$)/i)?.[0]?.trim();

  // Primary number — gender breakdown varsa onu, yoksa n=?
  const primary = genderBreakdown
    ? `${genderBreakdown.male.toLocaleString()} Men, ${genderBreakdown.female.toLocaleString()} Women`
    : (content.match(/\*\*n\s*=\s*(\d[\d\s]*)/)?.[1]?.replace(/\s/g, '') ?? '?');

  return {
    role: 'population',
    title: 'Population',
    primary_number: primary,
    gender_breakdown: genderBreakdown,
    condition,
    eligibility_summary: eligibility,
    age_summary: ageSummary,
    body: eligibility ?? '',
    icon_hint: detectPopulationIcon(condition ?? ''),
    grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
  };
}

function buildIntervention(wiki) {
  const general = findSection(wiki, /genel-bilgiler|intervention|tedavi.kollar/i);
  const content = general?.content ?? '';

  // Tedavi Kolları tablosu genel yapı:
  // | Grup | İlaç/Intervention | Dozaj | n |
  // Kol isimleri kolondan dinamik — İLAÇ İSMİ HARDCODE ETME
  const tableMatch = content.match(/\|\s*Grup\s*\|[^\n]+\n\|[-\s|]+\n((?:\|[^\n]+\n)+)/);
  const arms = [];

  if (tableMatch) {
    const rows = tableMatch[1].split('\n').filter((r) => r.startsWith('|'));
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length < 3) continue;
      // Kolonlar: [Grup, İlaç/İntervention, Dozaj, n]  veya benzer
      const label = cells[1] || cells[0];
      const doseOrDesc = cells[2] ?? '';
      const n = cells[cells.length - 1]?.replace(/\D/g, '');
      arms.push({
        label: label.replace(/\*\*/g, '').trim(),
        n: n ? parseInt(n, 10) : null,
        dose: extractDose(doseOrDesc),
        route: extractRoute(doseOrDesc),
        schedule: extractSchedule(doseOrDesc),
        icon_hint: detectInterventionIcon(`${label} ${doseOrDesc}`),
      });
    }
  }

  // Toplam N header
  const totalN = arms.reduce((sum, a) => sum + (a.n ?? 0), 0);
  const unitLabel = detectRandomizationUnit(content);  // 'Patients' | 'HRRs' | 'Clusters' | 'Clinicians'
  const headerNumber = totalN > 0 ? totalN : extractTotalN(content);
  const headerLabel = `${unitLabel} randomized and analyzed`;

  return {
    role: 'intervention',
    title: 'Intervention',
    header_number: headerNumber,
    header_label: headerLabel,
    arms: arms.length > 0 ? arms : null,
    // Backward-compat fallback
    primary_number: arms.length === 0 ? `${headerNumber} ${unitLabel}` : null,
    body: arms.length === 0 ? `Single-arm intervention` : null,
    icon_hint: arms[0]?.icon_hint ?? 'clipboard',
    grid_position: { column: 2, rowStart: 1, rowSpan: 1 },
  };
}

function extractDose(text) {
  return text.match(/(\d+(?:\.\d+)?\s*m?g)/i)?.[1] ?? null;
}

function extractRoute(text) {
  if (/oral|po\b|tablet/i.test(text)) return 'oral';
  if (/subcutaneous|sc\b|injection/i.test(text)) return 'subcutaneous';
  if (/intravenous|iv\b|infusion/i.test(text)) return 'intravenous';
  if (/inhaled|inhaler/i.test(text)) return 'inhalation';
  if (/topical|cream/i.test(text)) return 'topical';
  return null;
}

function extractSchedule(text) {
  return text.match(/(once\s+daily|every\s+(?:other\s+)?\d*\s*weeks?|twice\s+daily|weekly)/i)?.[1] ?? null;
}

function detectRandomizationUnit(content) {
  if (/cluster\s+randomi.*?hospital\s+referral\s+region/is.test(content)) return 'HRRs';
  if (/cluster\s+randomi.*?(clinic|physician|pediatrician)/is.test(content)) return 'Clinicians';
  if (/cluster\s+randomi.*?school/is.test(content)) return 'Schools';
  if (/cluster\s+randomi/i.test(content)) return 'Clusters';
  return 'Patients';
}

function extractTotalN(content) {
  return parseInt(content.match(/n\s*=\s*(\d[\d\s]*)\s*\*?\*?\s*\(?\s*(?:randomized|enrolled|analyzed)/i)?.[1]?.replace(/\s/g, '') ?? '0', 10);
}

function buildSettings(wiki) {
  const design = findSection(wiki, /genel-bilgiler|design/i);
  const content = design?.content ?? '';
  // Center + country extraction, NOT location-specific regex
  const scopeM = content.match(/(\d+)\s*(?:center|merkez)[^\d]*?(\d+)\s*(?:countr|ülke)/i);
  const singleCenter = content.match(/single-?center.*?(?:hospital|clinic)[^,\n]*/i)?.[0];

  let primary, body;
  if (scopeM) {
    primary = `${scopeM[1]} centers`;
    body = `${scopeM[1]} centers, ${scopeM[2]} countries`;
  } else if (singleCenter) {
    primary = singleCenter.slice(0, 40);
    body = singleCenter;
  } else {
    primary = 'Clinical settings';
    body = content.match(/(?:Location|Setting):[^\n]+/i)?.[0] ?? 'Not specified';
  }

  return {
    role: 'settings',
    title: 'Settings / Locations',
    primary_number: primary,
    body,
    icon_hint: detectSettingsIcon(body),
    grid_position: { column: 1, rowStart: 2, rowSpan: 1 },
  };
}

function buildPrimaryOutcome(wiki) {
  const endpoint = findSection(wiki, /primary-endpoint|primary-outcome|main-outcomes/i);
  // İlk cümle — definition
  const firstSentence = endpoint?.content.match(/^(?:###?\s*[^\n]*\n)*([^.\n]+\.)/m)?.[1]?.trim()
    ?? endpoint?.content.split('\n').find((l) => l.trim() && !l.startsWith('#') && !l.startsWith('|'))?.trim();

  // Primary metric adı — başlıktan
  const metric = endpoint?.title?.replace(/^\d+\.\s*/, '').replace(/primary\s+(?:endpoint|outcome)/i, '').trim()
    ?? 'Primary outcome';

  return {
    role: 'primary_outcome',
    title: 'Primary Outcome',
    primary_number: metric.slice(0, 30),
    body: firstSentence ?? 'Primary outcome measure',
    icon_hint: 'outcome-measure',
    secondary_numbers: [],
    grid_position: { column: 2, rowStart: 2, rowSpan: 1 },
  };
}

function buildFindings(wiki) {
  const endpoint = findSection(wiki, /primary-endpoint|primary-outcome/i);
  const keyMessages = findSection(wiki, /infografik|key.messages|anahtar.mesaj/i);
  const content = endpoint?.content ?? '';

  // Narrative — key findings section'dan
  const narrative = keyMessages?.content.match(/Key Finding[:\s]*([^\n]+)/i)?.[1]?.trim()
    ?? content.match(/Result:\s*([^\n]+)/i)?.[1]
    ?? 'Primary outcome result';

  // Chart data — table'dan extract
  const chartData = extractOutcomeData(content);
  const chartType = selectChartType(chartData);

  // Stats — p, OR, CI, diff
  const pMatch = content.match(/p\s*[=<>]\s*\.?\s*(\d+\.?\d*)/i);
  const orMatch = content.match(/(?:adjusted\s+)?(?:odds\s+ratio|OR)\s*[,:]?\s*(\d+\.\d+)\s*\(?(\d+%\s*CI[,:\s]*[^)]+)?\)?/i);
  const ciMatch = content.match(/95%\s*CI[,:\s]+([^;)\n]+)/i);

  const secondary = [];
  if (orMatch) secondary.push({ label: 'OR', value: orMatch[1] });
  if (ciMatch) secondary.push({ label: '95% CI', value: ciMatch[1].trim() });
  if (pMatch) secondary.push({ label: 'p', value: pMatch[1] });

  return {
    role: 'findings',
    title: 'Findings',
    primary_number: chartData.delta ?? 'See chart',
    body: narrative.slice(0, 120),
    icon_hint: 'bar-comparison',
    hero: true,
    chart_slot: chartType,
    chart: buildChartObject(chartType, chartData),
    secondary_numbers: secondary,
    grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
  };
}

function extractOutcomeData(content) {
  // Primary outcome tablosundan groups, percentages, p-value çek
  const rowsMatch = content.match(/\|\s*\*?\*?\s*[^|]*\*?\*?\s*\|\s*\*?\*?(\d+\.?\d*)\s*\(?(\d+\.?\d*)?\)?\*?\*?\s*\|\s*\*?\*?(\d+\.?\d*)\s*\(?(\d+\.?\d*)?\)?\*?\*?\s*\|/g);
  const pMatch = content.match(/p\s*[=<>]\s*\.?\s*(\d+\.?\d*)/i);
  const deltaMatch = content.match(/(\d+\.?\d*)\s*(?:pp|percentage\s+points?)/i);

  // Parsing detayı regex içinde, data nesnesine doldur:
  return {
    groups: 2,
    pValue: pMatch ? parseFloat(pMatch[1].startsWith('.') ? '0' + pMatch[1] : pMatch[1]) : null,
    delta: deltaMatch ? `+${deltaMatch[1]}pp` : null,
    // rawRows parse'ı daha detaylı yapılmalı — iterasyon sırasında genişlet
    timePoints: null,
    pre: null,
    post: null,
  };
}

function buildChartObject(type, data) {
  if (type === 'donut') {
    // Groups array'i primary outcome tablosundan construct edilmeli
    return {
      type: 'donut',
      data: {
        metric: 'Primary outcome',
        unit: '%',
        groups: [
          // value'lar extract edilip doldurulmalı — şimdilik placeholder yapısı
          { label: 'Control', value: 0, total: 100 },
          { label: 'Treatment', value: 0, total: 100 },
        ],
      },
      annotations: [],
    };
  }
  // slope/bar/line mevcut buildChart davranışı
  return null;
}

export const profile = {
  id: 'rct-comparison',
  study_type_prefix: 'RCT',  // detectStudyTypePrefix ile override edilebilir
  required_sections: ['genel-bilgiler'],
  preferred_sections: ['primary-endpoint', 'tanimlayici-istatistikler'],
  buildPopulation,
  buildIntervention,
  buildFindings,
  buildSettings,
  buildPrimaryOutcome,
  buildCitation: (preamble) => {
    const citation = preamble.match(/>\s*\*\*Kaynak:\*\*\s*(.+?)$/m)?.[1]?.trim();
    const authors = preamble.match(/>\s*\*\*Yazarlar:\*\*\s*(.+?)$/m)?.[1]?.trim();
    return authors && citation ? `${authors} · ${citation}` : null;
  },
};
```

**Önemli:** Bu refactor'de `Upadacitinib` ve `Dupilumab` string'leri **YOK**. Grep'le doğrula:

```bash
grep -i "upadacitinib\|dupilumab" src/kb-profiles/rct-comparison.mjs
```

Çıktı **boş olmalı**. Eğer drug adı varsa refactor eksik — düzelt.

### 7. LLM prompt redesign — `src/llm/prompt.mjs`

Mevcut SYSTEM_PROMPT serbest-form. Yeni: **8-slot mapping'i explicit yaz**.

```javascript
export const SYSTEM_PROMPT = `Sen tıbbi literatür analisti asistansın. Kullanıcı JAMA-style bir makalenin knowledge-base markdown'ını verecek. Görevin: bu KB'yi JAMA visual abstract JSON şemasına dönüştürmek.

KATI KURAL: Her slot için SADECE belirtilen paper bölümünden extract et. Başka yerden veri çekme. Her extract ettiğin değer için source_quote zorunlu.

SLOT → PAPER BÖLÜMÜ HARİTASI:

1. header.journal_bar.name
   Kaynak: KB preamble (> **Kaynak:** ...) veya ilk sayfa citation satırı
   Örnek: "JAMA Dermatology", "JAMA Network Open", "JAMA Health Forum"

2. header.title
   Kaynak: KB'nin H1 başlığı (# ile başlayan ilk satır)

3. header.study_type_prefix
   Kaynak: KB preamble veya H1 alt başlığı (alt başlıktaki study design)
   Değerler: "RCT" | "Cluster RCT" | "Cohort" | "Meta-analysis" | "Cross-sectional" | "Case-Control"
   Kural: "Cluster Randomized" → "Cluster RCT"; "Randomized Clinical Trial" → "RCT"

4. layout.top_panels[0] (POPULATION):
   - primary_number: RESULTS §1'deki gender breakdown. Örnek: "375 Men, 298 Women"
   - gender_breakdown: { male, female } sayılar
   - condition: DESIGN bölümünden hastalık adı (tek cümle)
   - age_summary: "Mean (SD) age, X (Y) y" formatında
   - eligibility_summary: DESIGN veya Methods'tan kısa eligibility
   - icon_hint: condition keyword match — skin/kidney/heart/lungs/brain/users-group/activity/patients-cohort

5. layout.top_panels[1] (INTERVENTION):
   - header_number: toplam N (CONSORT veya RESULTS §1)
   - header_label: "Patients randomized and analyzed" VEYA "HRRs randomized" (cluster RCT ise)
   - arms: INTERVENTIONS bölümündeki her kol ayrı obje
     - label: kolun adı (ilaç ismi VEYA intervention tipi)
     - n: kol büyüklüğü
     - dose: varsa doz bilgisi
     - route: "oral" | "subcutaneous" | "intravenous" | "inhalation" | "topical" | "training" | "policy" | "procedure" | null
     - schedule: doz sıklığı
     - icon_hint: modality match — pill/syringe/iv-drip/inhaler/scalpel/conversation/money/clipboard/prohibition

6. layout.bottom_panels[0] (SETTINGS):
   - primary_number: lokasyon özeti ("129 centers", "Outpatient clinics", "US dialysis facilities")
   - body: DESIGN'dan tek cümle lokasyon
   - icon_hint: scope — hospital (tek) / network (çoklu) / globe (uluslararası)

7. layout.bottom_panels[1] (PRIMARY OUTCOME):
   - primary_number: metric adı (örn. "EASI75", "Uptake", "% Home dialysis")
   - body: MAIN OUTCOMES AND MEASURES'ın ilk cümlesi — DEFINITION, sonuç değil
   - icon_hint: "outcome-measure"

8. layout.hero_panel (FINDINGS):
   - body: Key Points → Findings kutusundaki narrative cümle
   - chart:
     - type: outcome yapısına göre
       * "line" çoklu zaman noktası varsa
       * "donut" iki grup null result ise (p > 0.05)
       * "bar" iki grup anlamlı fark ise
       * "slope" paired pre/post ise
     - data: chart tipine uygun structure
   - secondary_numbers: RESULTS → Primary Outcome paragrafından OR/CI/p

9. footer.citation: Preamble'daki yazarlar + journal + yıl birleşimi

JSON dışı metin üretme. Her field için source_quote alanı doldur — KB'den birebir alıntı.`;

export function buildUserPrompt(kbMarkdown, retryFeedback = null) {
  let prompt = `Knowledge Base:\n\n${kbMarkdown}\n\nYukarıdaki 9 slot için JSON üret.`;
  if (retryFeedback) {
    prompt += `\n\nÖNCEKI DENEMEN LINT HATASI ALDI. HATALI SLOTLARı DÜZELT:\n\n${retryFeedback}\n\nSadece belirtilen paper bölümünden extract et. Diğer slotları değiştirme.`;
  }
  return prompt;
}
```

**Yeni RESPONSE_SCHEMA** — her panel için source_quote alanı zorunlu:

```javascript
export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    header: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        study_type_prefix: { type: 'string' },
        journal_bar: { type: 'object', properties: { name: { type: 'string' } } },
      },
      required: ['title', 'study_type_prefix', 'journal_bar'],
    },
    layout: {
      type: 'object',
      properties: {
        top_panels: { type: 'array' },
        bottom_panels: { type: 'array' },
        hero_panel: { type: 'object' },
      },
      required: ['top_panels', 'bottom_panels', 'hero_panel'],
    },
    footer: { type: 'object' },
    _provenance: {
      type: 'object',
      description: 'Her slot için KB source_quote mapping',
      additionalProperties: true,
    },
  },
  required: ['header', 'layout', 'footer'],
};
```

### 8. LLM retry feedback — slot-level targeted

`src/llm/extract.mjs` retry logic'inde feedback'i slot-bazlı yaz:

```javascript
function formatRetryFeedback(lintResult, payload) {
  const errors = lintResult.errors.map((err) => {
    const slot = guessSlotFromPath(err.message);  // "layout.hero_panel.primary_number" → "SLOT 7 (FINDINGS)"
    const section = SLOT_TO_SECTION[slot] ?? 'paper bölümünü yeniden oku';
    return `- ${slot}: ${err.message}\n  DOĞRU KAYNAK: ${section}\n  TEKRAR DENE: Sadece bu bölümden extract et.`;
  });
  return errors.join('\n\n');
}

const SLOT_TO_SECTION = {
  'SLOT 1 (journal)': 'KB preamble > **Kaynak:** satırı',
  'SLOT 3 (POPULATION)': 'KB section 1 GENEL BİLGİLER + section 2 TANIMLAYICI İSTATİSTİKLER',
  'SLOT 4 (INTERVENTION)': 'KB section 1\'deki Tedavi Kolları tablosu',
  'SLOT 5 (SETTINGS)': 'KB section 1\'deki Lokasyon satırı',
  'SLOT 6 (PRIMARY OUTCOME)': 'KB section 3\'ün ilk paragrafı (DEFINITION)',
  'SLOT 7 (FINDINGS)': 'KB section 3 Primary Outcome Results tablosu + section 7 ANAHTAR MESAJLAR',
  'SLOT 8 (footer)': 'KB preamble > **Yazarlar:** ve > **Yayın:** satırları',
};

function guessSlotFromPath(message) {
  if (/journal_bar/.test(message)) return 'SLOT 1 (journal)';
  if (/population|top_panels\[0\]/.test(message)) return 'SLOT 3 (POPULATION)';
  if (/intervention|arms|top_panels\[1\]/.test(message)) return 'SLOT 4 (INTERVENTION)';
  if (/settings|bottom_panels\[0\]/.test(message)) return 'SLOT 5 (SETTINGS)';
  if (/primary_outcome|bottom_panels\[1\]/.test(message)) return 'SLOT 6 (PRIMARY OUTCOME)';
  if (/hero_panel|findings|chart/.test(message)) return 'SLOT 7 (FINDINGS)';
  if (/footer|citation/.test(message)) return 'SLOT 8 (footer)';
  return 'bilinmeyen slot';
}
```

Ayrıca `MAX_RETRIES` 3 → **5** yap, **provider rotation** ekle: her retry farklı provider.

### 9. Test — sadece KB2 LLM mode

```bash
# KB1 regresyon — schema 2.0 rule-based (iter-19'dan kalma)
node bin/studio-agent.mjs compile --source knowledge-base.md --mode=rule-based --out output

# KB2 rule-based — drug-agnostic extractor refactor'unun kanıtı
node bin/studio-agent.mjs compile --source knowledge-base-2.md --mode=rule-based --out output-kb2

# KB2 LLM mode — ASIL TEST, fallback'e düşmeden PASS vermeli
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2-llm
```

**Başarı kriteri:**

- KB1 rule-based: lint PASS, iter-19 çıktısı ile karşılaştırılabilir
- KB2 rule-based: lint PASS + `rct-comparison.mjs` içinde drug ismi **YOK**
- KB2 LLM mode: lint PASS + `_metadata.extraction_mode === 'llm'` (fallback değil) + `_metadata.llm_provider` gerçek provider + `_metadata.llm_retries` 0 veya 1

### 10. Grep doğrulaması

```bash
grep -ri "upadacitinib\|dupilumab" src/kb-profiles/
```

**Çıktı boş olmalı.** Aksi takdirde refactor başarısız — düzelt.

### 11. Clinical-summary dokunma

`src/artifacts/clinical-summary.mjs` bu iterasyonda değişmez. Şu an KB2 için FAIL veriyor; iter-22'de ele alınacak.

### 12. Kısa rapor (ayrıntı bekliyorum)

- idea.md'nin yeni "Structural recipe" bölümü yeterince netti mi?
- **Grep sonucu:** `grep upadacitinib src/kb-profiles/` çıktısı boş mu? Kaç hardcoded referans kaldırıldı?
- **KB2 LLM mode:** gerçek provider cevap döndü mü (fallback değil)? Kaç retry gerekti?
- **Retry feedback:** slot-level feedback LLM'e targeted correction verdi mi? Örnek bir retry round'u rapora koy — ilk attempt lint errors + feedback metni + ikinci attempt success.
- **Icon taxonomy:** KB1 (istatistiksel) ve KB2 (RCT) farklı iconlar mı üretti?
  - KB1 population: `patients-cohort` mu `users-group` mı?
  - KB2 population: `skin-cross-section` geldi mi?
  - KB2 intervention arms: `pill` + `syringe` doğru eşleşti mi?
- **Chart selector:** KB1 için `slope` döndü mü? KB2 için `bar` mı `line` mı? (section 4.5'te timeline var, `line` beklenir)
- **Donut chart:** Bu iterasyonda render edilen bir donut var mı? Yoksa (KB1/KB2'de null result yok) test edilmedi mi — hazır mı?
- **Provider rotation:** Retry'larda farklı provider denendi mi?
- **Source_quote disiplini:** LLM output'unda her slot için source_quote var mı?
- KB1 regresyon: iter-19 output'u ile yeni output arasında fark var mı? (`diff -r output-iter19 output` gibi)
- 21. iterasyon (PNG export veya 3. farklı paper testi) için zemin temiz mi?

### 13. Önemli notlar

- Bu iterasyon schema **2.0 kalır** — additive (donut chart tipi eklenir, breaking değil).
- **Ezber kıran değişiklik:** profile içinde drug/disease/site ismi literal YAZILAMAZ. Hepsi KB'den section-aware extract edilmeli.
- LLM prompt'taki slot mapping **kritik** — iyi yazılırsa LLM paper yapısına göre gider, kötü yazılırsa yine halüsinasyon yapar.
- **Backward compatibility:** Rule-based mode'da KB1 (statistical-pre-post) yine çalışmalı. Eski output yapısı bozulmamalı.
- **Risk yüksek** — rct-comparison refactor'u KB2 rule-based'i kırabilir. Her commit öncesi 3 test (KB1 rule, KB2 rule, KB2 LLM) çalıştır.

---

Başla. Önce idea.md'nin yeni "Structural recipe" bölümünü oku, icon-taxonomy + chart-selector modüllerini kur, rct-comparison'u drug-agnostic'e refactor et, LLM prompt'ı 8-slot mapping ile yeniden yaz, retry feedback slot-level yap, donut chart renderer ekle, test matrisini çalıştır (3 komut), grep ile drug-name temizliğini doğrula, ayrıntılı raporla.
