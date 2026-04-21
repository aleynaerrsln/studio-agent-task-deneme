# İterasyon-19 — JAMA-sadık görsel kimlik (schema 2.0 breaking refactor)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-18 LLM extraction'ı devreye aldı. Teknik pipeline çalışıyor. Ama kullanıcı gerçek dünya testi yaptı: **JAMA Dermatology'nin bu makale için yayınladığı resmi visual abstract** ile bizim output'u yan yana koydu. Dramatik fark:

- Bizim: MAVİ "JAMA Internal Medicine" bar (hardcoded, yanlış — bu JAMA Dermatology makalesi)
- Bizim: Jenerik `patients-cohort` / `trial` / `lab-setting` ikonları
- Bizim: Tek panel intervention "Upadacitinib 30mg vs Dupilumab 300mg"
- Bizim: Bar chart (iki nokta)

- JAMA: YEŞİL "JAMA Dermatology" bar
- JAMA: Skin cross-section, syringe, pill, globe — **hastalığa/rotaya özgü** ikonlar
- JAMA: **İki ayrı kol** yan yana (syringe + dupilumab detayı | pill + upadacitinib detayı)
- JAMA: **Line chart** zamana göre (week 0-16, iki eğri, significance markers)
- JAMA: Population'da hastalık adı, eligibility, gender breakdown, age range

Kullanıcının geri bildirimi keskin: *"bizimkiyle alakası yok, çok kötü."*

`idea.md` rafine edildi: **"JAMA-sadık görsel kimlik — gerçek visual abstract'a yakınsa"** bölümü eklendi. Önce bu yeni bölümü oku (idea.md'nin sonuna yakın, `### JAMA-sadık görsel kimlik` başlığı altında).

`knowledge-base-2.md` de zenginleştirildi:
- Gender total: 375 Men, 298 Women
- Disease + eligibility bölümü
- Age range (18-76)
- Section 4.5 + 4.6: EASI75 + Pruritus NRS haftalık timeline verisi (line chart için)

Bu iterasyon **büyük ve breaking** — schema 1.2 → 2.0, profile adapters + LLM prompt + renderer + lint kuralları hepsi güncellenir. Risk yüksek, sıkı test et.

---

## Bu iterasyonda yapılacaklar

### 1. Schema bump — 2.0

`src/artifacts/graphical-abstract.mjs`:

```javascript
export const spec = {
  type: 'graphical-abstract',
  schema_version: '2.0',  // BREAKING — intervention.arms[], chart.type:'line', population enrichment
  subdomain: 'medical-graphical-abstract',
  format: 'jama-asymmetric-v1',
  // numeric_fields path'leri yeni şemaya göre güncelle
  numeric_fields: [
    { path: 'layout.top_panels[].primary_number', required: false, extract_numeric_core: true, context_window: {...} },
    { path: 'layout.top_panels[].arms[].n', required: false, ... },             // YENİ
    { path: 'layout.top_panels[].gender_breakdown.male', required: false, ... }, // YENİ
    { path: 'layout.top_panels[].gender_breakdown.female', required: false, ... }, // YENİ
    { path: 'layout.bottom_panels[].primary_number', required: false, ... },
    { path: 'layout.hero_panel.primary_number', required: true, ... },
    { path: 'layout.hero_panel.chart.data.points[].value', required: false, ... },
    { path: 'layout.hero_panel.chart.data.series[].values[]', required: false, ... },  // YENİ — line chart
    { path: 'layout.hero_panel.secondary_numbers[].value', required: false, ... },
  ],
  soft_trace_fields: [
    { path: 'layout.top_panels[].body', severity: 'warning', ... },
    { path: 'layout.top_panels[].condition', severity: 'warning', ... },        // YENİ
    { path: 'layout.top_panels[].eligibility_summary', severity: 'warning', ... }, // YENİ
    { path: 'layout.top_panels[].age_summary', severity: 'warning', ... },      // YENİ
    { path: 'layout.bottom_panels[].body', severity: 'warning', ... },
    { path: 'layout.hero_panel.body', severity: 'warning', ... },
  ],
  strict_lint: { reject_warnings: true },
};
```

### 2. Dinamik journal kimliği

`header.journal_bar` şu an hardcoded "JAMA Internal Medicine / #2b6ca3". Dinamik olmalı:

```javascript
// src/journal-detect.mjs
const JOURNAL_COLORS = {
  'JAMA Dermatology':       { color: '#046e45', accent: '#059669' },  // yeşil
  'JAMA Internal Medicine': { color: '#2b6ca3', accent: '#0369a1' },  // mavi
  'JAMA Oncology':          { color: '#7c3aed', accent: '#8b5cf6' },  // mor
  'JAMA Pediatrics':        { color: '#ea580c', accent: '#f97316' },  // turuncu
  'JAMA Cardiology':        { color: '#dc2626', accent: '#ef4444' },  // kırmızı
  'JAMA Neurology':         { color: '#4f46e5', accent: '#6366f1' },  // indigo
  'JAMA Surgery':           { color: '#475569', accent: '#64748b' },  // gri
  'JAMA Psychiatry':        { color: '#0891b2', accent: '#06b6d4' },  // turkuaz
  'JAMA Ophthalmology':     { color: '#be185d', accent: '#ec4899' },  // pembe
  'JAMA':                   { color: '#1e40af', accent: '#2563eb' },  // ana JAMA mavi
};

export function detectJournal(preambleOrMarkdown) {
  // Preamble'da 'JAMA Xxx' ara
  for (const name of Object.keys(JOURNAL_COLORS)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(preambleOrMarkdown)) {
      return { name, ...JOURNAL_COLORS[name] };
    }
  }
  // Fallback: JAMA kelimesi geçiyorsa ana JAMA; yoksa gri generic
  if (/\bJAMA\b/i.test(preambleOrMarkdown)) {
    return { name: 'JAMA', ...JOURNAL_COLORS['JAMA'] };
  }
  return { name: 'Medical Journal', color: '#64748b', accent: '#475569' };
}
```

Rule-based mode'da `compile()` bunu çağırır. LLM mode'da prompt'a journal detection ipuçları eklenir; LLM `header.journal_bar.name` field'ini doldurur, sonra `detectJournal` ile renk map'lenir (LLM rengi tahmin etmesin — name yeter).

**Renderer:** `journal_bar.color` CSS değişkenine yazılır:

```css
.journal-bar { background: var(--journal-color); color: white; }
.panel-hero .panel-primary { color: var(--journal-accent); }
```

### 3. Intervention paneli → arms[] array

**Breaking change.** Mevcut:

```javascript
{
  role: 'intervention',
  primary_number: 'Upadacitinib 30 mg',
  body: 'Upadacitinib 30 mg vs Dupilumab 300 mg',
  icon_hint: 'trial',
}
```

Yeni:

```javascript
{
  role: 'intervention',
  title: 'Intervention',
  header_number: 673,         // toplam, arm n'lerinin toplamı
  header_label: 'Patients randomized and analyzed',
  arms: [
    {
      label: 'Dupilumab',
      n: 331,
      dose: '300 mg',
      route: 'subcutaneous',
      schedule: 'every other week',
      icon_hint: 'syringe',
    },
    {
      label: 'Upadacitinib',
      n: 342,
      dose: '30 mg',
      route: 'oral',
      schedule: 'once daily',
      icon_hint: 'pill',
    },
  ],
  grid_position: { column: 2, rowStart: 1, rowSpan: 1 },
}
```

**Renderer:** Panel içi iki sub-block yan yana, CSS flex row:

```html
<div class="panel panel-intervention">
  <h3 class="panel-title">Intervention</h3>
  <div class="panel-header-number">673 Patients randomized and analyzed</div>
  <div class="arms-row">
    <div class="arm">
      <div class="arm-icon">{{icon:syringe}}</div>
      <div class="arm-label">331 Dupilumab</div>
      <div class="arm-detail">Subcutaneous dupilumab, 300 mg, every other week</div>
    </div>
    <div class="arm">
      <div class="arm-icon">{{icon:pill}}</div>
      <div class="arm-label">342 Upadacitinib</div>
      <div class="arm-detail">Oral tablet of upadacitinib, 30 mg, once daily</div>
    </div>
  </div>
</div>
```

**Backward compatibility — single-arm fallback:** Eğer `arms` yoksa veya boşsa, renderer eski `primary_number + body` alanlarını kullanır. Bu KB1 (statistical pre-post) için gerekli — "Tek Örneklem T-test" tek kol bile değil, mevcut davranış korunur.

Profile adapters (`statistical-pre-post.mjs`, `rct-comparison.mjs`) güncellenir:

- `statistical-pre-post`: arms YOK, eski single-panel davranışı.
- `rct-comparison`: arms[] iki eleman (KB'den drug+dose+route parse et).

### 4. Population enrichment

Mevcut:

```javascript
{
  role: 'population',
  primary_number: 'n = 673',
  body: '673 hasta randomize edildi',
  icon_hint: 'patients-cohort',
}
```

Yeni (opsiyonel alanlar eklenir, backward-compat):

```javascript
{
  role: 'population',
  title: 'Population',
  primary_number: '375 Men, 298 Women',  // veya 'n = 673' fallback
  gender_breakdown: { male: 375, female: 298 },   // YENİ opsiyonel
  condition: 'moderate-to-severe atopic dermatitis',  // YENİ opsiyonel
  eligibility_summary: 'Adults 18-75 y, EASI ≥16, ≥3 y symptoms',  // YENİ opsiyonel
  age_summary: 'Mean 36.3 (SD 14.1) y, range 18-76',  // YENİ opsiyonel
  icon_hint: 'skin-cross-section',  // veya generic fallback
  body: 'Adults aged 18-75 y with atopic dermatitis',  // opsiyonel (eski alan)
  grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
}
```

**Renderer:** Opsiyonel alanları varsa gösterir, yoksa eski tek satır body davranışı:

```html
<div class="panel panel-population">
  <h3 class="panel-title">Population</h3>
  <div class="panel-primary-large">{{primary_number}}</div>
  <div class="panel-icon-large">{{icon:skin-cross-section}}</div>
  {{#if condition}}<div class="panel-context">Adults with {{condition}}</div>{{/if}}
  {{#if eligibility_summary}}<div class="panel-subtext">{{eligibility_summary}}</div>{{/if}}
  {{#if age_summary}}<div class="panel-subtext panel-age">{{age_summary}}</div>{{/if}}
</div>
```

### 5. Line chart desteği

`hero_panel.chart.type` enum'ına `'line'` eklenir:

```javascript
chart: {
  type: 'line',
  data: {
    metric: 'EASI75 achievement',
    unit: '%',
    x_axis: { label: 'Week', values: [0, 1, 2, 4, 16] },
    y_axis: { label: 'Proportion of patients (%)', min: 0, max: 100 },
    series: [
      { label: 'Upadacitinib (n=342)', values: [0, 16.1, 44.3, 71.1, 72.4], accent: true },
      { label: 'Dupilumab (n=331)', values: [0, 5.8, 18.2, 37.3, 62.6], accent: false },
    ],
  },
  annotations: [
    { type: 'delta', value: '+9.7pp (P=.007)', position: 'week-16' },
  ],
}
```

**Renderer — inline SVG line chart:**

```javascript
function renderLineChart({ data, annotations }, journalAccent) {
  const width = 400, height = 220, padding = 40;
  const { x_axis, y_axis, series } = data;
  const xRange = x_axis.values;
  const yMin = y_axis.min ?? 0;
  const yMax = y_axis.max ?? 100;

  const xScale = (x) => padding + ((x - xRange[0]) / (xRange[xRange.length-1] - xRange[0])) * (width - 2*padding);
  const yScale = (y) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2*padding);

  const seriesSvg = series.map((s, i) => {
    const color = s.accent ? journalAccent : '#888';
    const points = s.values.map((v, idx) => `${xScale(xRange[idx])},${yScale(v)}`).join(' ');
    const dots = s.values.map((v, idx) =>
      `<circle cx="${xScale(xRange[idx])}" cy="${yScale(v)}" r="4" fill="${color}" />`
    ).join('');
    const labelX = xScale(xRange[xRange.length-1]) + 6;
    const labelY = yScale(s.values[s.values.length-1]);
    return `
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />
      ${dots}
      <text x="${labelX}" y="${labelY}" font-size="10" fill="${color}" alignment-baseline="middle">${s.label}</text>
    `;
  }).join('');

  // Axes
  const xTicks = xRange.map((x) =>
    `<text x="${xScale(x)}" y="${height - padding + 14}" font-size="10" text-anchor="middle" fill="#666">${x}</text>`
  ).join('');
  const yTicks = [0, 20, 40, 60, 80, 100].map((y) =>
    `<text x="${padding - 6}" y="${yScale(y)}" font-size="10" text-anchor="end" fill="#666" alignment-baseline="middle">${y}</text>`
  ).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart chart-line" role="img" aria-label="${data.metric}">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ccc" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ccc" />
      ${yTicks}
      ${xTicks}
      ${seriesSvg}
      <text x="${width/2}" y="${height - 8}" font-size="10" text-anchor="middle" fill="#555">${x_axis.label}</text>
    </svg>
  `;
}
```

Slope ve bar chart renderer'ları mevcut kalır — line eklenmesi additive.

### 6. Icon library — `src/renderer/icons.mjs`

Yaklaşık 25-40 icon. Lucide'dan SVG path'leri alıp inline yerleştir (MIT lisans, isc-license.txt'e not düş).

Minimum şu setler:

**Population/disease:**
- `patients-cohort` (users icon)
- `skin-cross-section` — custom (Lucide'de yok, basit SVG çiz: dikdörtgen cilt kesiti + patch)
- `brain` (brain icon — psikiyatri)
- `heart` (heart — kardiyoloji)
- `lungs` — custom SVG
- `baby` (baby icon — pediatri)
- `bone` (skeletal)

**Intervention/route:**
- `syringe` (syringe icon)
- `pill` (pill icon)
- `capsule`
- `iv-drip` (droplets icon)
- `inhaler` — custom
- `scalpel` — custom (lucide'de yok)
- `stethoscope`

**Outcome/chart:**
- `downward-trend` (trending-down)
- `upward-trend` (trending-up)
- `bar-comparison` (bar-chart)
- `line-chart` (line-chart)
- `activity` (activity / vital signs)

**Settings:**
- `globe` (globe icon — multi-country)
- `hospital` (building-2)
- `map-pin`

**Generic:**
- `clipboard` (clipboard)
- `flask` (flask-conical)
- `microscope`

Her icon bir `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">...</svg>` string'i.

```javascript
export const ICON_LIBRARY = {
  'patients-cohort': `<svg viewBox="0 0 24 24" ...>...</svg>`,
  'syringe': `<svg viewBox="0 0 24 24" ...>...</svg>`,
  // ... 30+ ikon
};

export function renderIcon(hint, size = 48) {
  const svg = ICON_LIBRARY[hint] ?? ICON_LIBRARY['clipboard'];  // fallback
  return `<span class="icon-wrapper" style="width:${size}px;height:${size}px">${svg}</span>`;
}
```

Lucide SVG'leri kopyalamak için [lucide.dev/icons](https://lucide.dev/icons) → icon seç → Copy SVG.

### 7. LLM prompt güncellemesi — icon enum + chart type + arms

`src/llm/prompt.mjs` SYSTEM_PROMPT:

```
...
KURALLAR:
...
7. icon_hint şu listeden seç (uydurma): patients-cohort, skin-cross-section, brain, heart, lungs, baby, bone, syringe, pill, capsule, iv-drip, inhaler, scalpel, stethoscope, downward-trend, upward-trend, bar-comparison, line-chart, activity, globe, hospital, map-pin, clipboard, flask, microscope.

8. Chart type seç:
   - "slope" = iki zaman noktası (pre/post)
   - "bar" = iki grup, tek zaman noktası
   - "line" = çoklu zaman noktası, iki+ grup (week 1, 2, 4, 8, 16 gibi)

9. Intervention iki kol varsa arms[] array kullan. Her arm: label, n, dose, route ("oral"|"subcutaneous"|"intravenous"|"topical"), schedule, icon_hint.

10. Population panelinde gender_breakdown varsa ({male, female}), condition (hastalık adı), age_summary doldur.

11. header.journal_bar.name — KB'den çıkar. "JAMA Dermatology", "JAMA Internal Medicine" vb. Renk alanını BOŞ bırak, runtime ekleyecek.
```

Schema genişletilir — RESPONSE_SCHEMA içindeki intervention/population/chart tanımları güncellenir.

### 8. Lint güncellemeleri

Yeni kural: `icon-hint-in-library`

```javascript
{
  id: 'icon-hint-in-library',
  check: (artifact) => {
    const hints = collectAllIconHints(artifact);
    const invalid = hints.filter((h) => !(h in ICON_LIBRARY));
    if (invalid.length) return { error: `Geçersiz icon_hint: ${invalid.join(', ')}` };
    return true;
  },
}
```

`collectAllIconHints` population.icon_hint + intervention.arms[].icon_hint + bottom_panels[].icon_hint + hero_panel.icon_hint tümünü toplar.

Mevcut `icon-hint-not-empty` kuralı kalır (boşsa error).

### 9. Profile adapter güncellemeleri

**`statistical-pre-post.mjs`:**
- `buildIntervention` — arms yok, eski davranış (tek panel). `icon_hint: 'clipboard'` (statistical test için jenerik).
- `buildPopulation` — condition yok, gender_breakdown yok. Sadece `primary_number: 'n = 240'`.
- `journal` detection rule-based mode'da: KB1 preamble'da JAMA geçmez → fallback 'Medical Journal' gri.

**`rct-comparison.mjs`:**
- `buildIntervention` — arms[] **drug-name agnostic**. İLAÇ İSMİNİ HARDCODE ETME. Tablo tabanlı extractor:
  1. `genel-bilgiler` section'ında "Tedavi Kolları" veya "Intervention" içerikli markdown tablosu ara
  2. Tablo başlık kolonları: `İlaç` / `Drug`, `Dozaj` / `Dose`, `n` / `N`
  3. Her data row → bir arm: `{ label: <kolon İlaç>, n: <kolon n>, dose: <kolon Dozaj>, ... }`
  4. Dozaj string'inden rota tespit (ilaç ismine bakma):
     - `/\b(oral|tablet|once\s*daily|po\b)/i` → `route: 'oral', icon_hint: 'pill'`
     - `/\b(subcutaneous|subq|sc|injection|every.*week)/i` → `route: 'subcutaneous', icon_hint: 'syringe'`
     - `/\b(intravenous|iv|infusion)/i` → `route: 'intravenous', icon_hint: 'iv-drip'`
     - `/\b(inhaled|nebulized|inhaler)/i` → `route: 'inhalation', icon_hint: 'inhaler'`
     - `/\b(topical|cream|ointment)/i` → `route: 'topical', icon_hint: 'clipboard'`
     - Fallback: `route: 'unknown', icon_hint: 'pill'`
  5. Schedule: `once daily`, `every other week`, `every 2 weeks` vb pattern'ları.

  **Test:** Bu extractor KB2 (Upadacitinib/Dupilumab) için çalışmalı ama herhangi bir RCT (ör. Methotrexate/Adalimumab, Pembrolizumab/Nivolumab) için de çalışmalı — sadece KB markdown'daki tablo yapısına bağlı.
- `buildPopulation` — **drug-name/disease-name agnostic** generic extractor:
  - Gender: `/(\d+)\s*(?:Men|Erkek|Male)[^\d]+(\d+)\s*(?:Women|Kadın|Female)/i` → `{male, female}`
  - Condition: KB preamble'daki `**Hastalık:**\s*(.+)` satırı VEYA H1 title'dan extract
  - Eligibility: KB section 1'deki `### Eligibility` veya `Adults aged \d+ to \d+` pattern'ı
  - Age summary: `/Mean.*?(\d+\.\d+).*?SD\s*(\d+\.\d+).*?range\s*(\d+)-(\d+)/i` → "Mean X (SD Y) y, range A-B"
  - Icon: condition içeriğine göre dinamik seç:
    - `/dermatitis|skin|psoriasis|eczema/i` → `'skin-cross-section'`
    - `/cardiac|cardio|heart|myocard/i` → `'heart'`
    - `/pulmonary|lung|asthma|copd/i` → `'lungs'`
    - `/pediatric|children|infant/i` → `'baby'`
    - `/psychiatric|depression|anxiety|schizophrenia/i` → `'brain'`
    - `/oncolog|cancer|carcinoma|tumor/i` → `'activity'` veya generic
    - Fallback: `'patients-cohort'`
- `buildFindings` — KB'de timeline verisi varsa (section 4.5/4.6 gibi) `chart.type: 'line'` üret, yoksa mevcut bar chart.
- `journal` detection: KB2 preamble'da "JAMA Dermatology" geçiyor → yeşil.

### 10. Test matrisi

```bash
# KB1 rule-based — slope chart, single-arm intervention, statistical profile
node bin/studio-agent.mjs compile --source knowledge-base.md --mode=rule-based --out output

# KB1 LLM — aynı seviyede output
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base.md --out output-llm

# KB2 rule-based — bar veya line chart, iki arm, rct profile, yeşil JAMA Dermatology
node bin/studio-agent.mjs compile --source knowledge-base-2.md --mode=rule-based --out output-kb2

# KB2 LLM — JAMA benzeri output, line chart, skin icon, syringe+pill arms
node --env-file=.env bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2-llm
```

Her biri lint PASS vermeli.

### 11. Görsel doğrulama

Tarayıcıda `output-kb2-llm/graphical-abstract.html` aç. Orijinal JAMA Dermatology visual abstract ile yan yana koy. Kontrol et:

- [x] Journal bar yeşil ("JAMA Dermatology")
- [x] "RCT:" prefix + tam başlık
- [x] Population'da gender breakdown (375 Men, 298 Women)
- [x] Population'da disease adı (atopic dermatitis)
- [x] Population'da skin-cross-section icon
- [x] Population'da eligibility + age summary
- [x] Intervention'da iki arm (syringe + pill yan yana)
- [x] Her arm doz + rota + schedule ile
- [x] Findings'te line chart (zamana göre iki eğri)
- [x] Settings'te globe icon + "129 merkez, 22 ülke"
- [x] Primary outcome metin (icon yok)
- [x] Footer minimal (citation + brand)

### 12. Clinical-summary dokunma

Bu iterasyonda **sadece graphical-abstract** schema 2.0'a geçer. `clinical-summary.mjs` şu an KB2 için FAIL veriyor (iter-17'den beri), aynen kalır. İter-20'de schema 2.0 uyumu ve LLM adaptasyonu.

### 13. Kısa rapor (ayrıntılı istiyorum)

- idea.md'nin yeni "JAMA-sadık görsel kimlik" bölümü yeterince netti mi? Hangi kısım belirsizdi?
- **Journal renk haritası** doğru çalıştı mı? KB2 preamble'daki "JAMA Dermatology" yakalandı mı → yeşil bar mı geldi?
- **Intervention arms[]** renderer iki subpanel'i yan yana doğru dizdi mi? CSS flex çakışmaları?
- **Line chart SVG** görsel olarak doğru mu? Line'lar doğru eğim, nokta yerleri doğru, label overlap yok?
- **Icon library** kaç icon eklendi? Lucide'dan kaç tanesi ithal edildi, kaç tanesi custom çizildi?
- **KB1 regresyon** — slope chart hâlâ doğru mu? Intervention eski tek-panel davranışı korundu mu? Yoksa fallback renderer tek-arm için farklı bir şey mi yaptı?
- **KB2 LLM output** — orijinal JAMA Dermatology visual abstract ile yan yana ne kadar benziyor? Hangi alanlarda hâlâ fark var?
- **LLM arms[] üretimi** — LLM KB'den Upadacitinib/Dupilumab doğru ayıklayıp iki arm yazdı mı, yoksa hâlâ tek panel mi?
- **Line chart veri doğruluğu** — lint `layout.hero_panel.chart.data.series[].values[]` path'ini trace etti mi? KB2 section 4.5'teki (16.1, 44.3, 71.1, 72.4) sayıları KB'den yakalandı mı?
- **Gender breakdown** — population'da 375/298 doğru çıktı mı?
- **Schema 2.0 breaking** — eski output-kb2-llm/graphical-abstract.json ile yeni sürüm arasındaki farklar net mi? JSON tüketicisi için migration note gerekir mi?
- 20. iterasyon (PNG export veya KB3 jenerik test) için zemin temiz mi?

### 14. Önemli notlar

- Bu **major version bump** (schema 2.0). Breaking change. Eski output artık geçersiz.
- Profile adapter'lar **davranış değiştirmek** zorunda (arms[], enriched population). Bu iter-17 kontratını tamamen yenilemek demek.
- Risk çok yüksek — KB1 regresyonu kolay kaçırılır. Her commit öncesi 4 test (KB1/KB2 × rule-based/LLM) çalıştır.
- Icon library Lucide MIT lisans: `src/renderer/icons.mjs` dosyasının en üstüne şu comment ekle:
  ```javascript
  /*
   * Icon SVG paths derived from Lucide (https://lucide.dev), MIT License.
   * Custom icons (skin-cross-section, scalpel, inhaler) are original minimal SVGs.
   */
  ```
- Line chart için `series[].values[]` trace edilmesi gerekiyor — mevcut `numeric-fields-traceable` lint path'inin array içinde array'i desteklediğinden emin ol. Desteklemiyorsa `collectValuesAtPath` genişlet.
- **Görsel kimliği JAMA'ya benzetmek**: CSS detaylarına dikkat. Typography (Helvetica Neue benzeri sans-serif), panel divider rengi (#e5e7eb gri), başlık rengi (accent yeşil), body text (14px #333). Abartma — minimal, profesyonel.

---

Başla. Önce idea.md'nin yeni "JAMA-sadık görsel kimlik" bölümünü oku, knowledge-base-2.md'nin yeni bölümlerine (1. GENEL BİLGİLER disease/gender, 4.5/4.6 timeline) bak, schema 2.0 yapısını kur, journal detection + arms[] + line chart + icon library ekle, profile adapter'ları güncelle, LLM prompt'ı genişlet, lint kuralı ekle, 4-test matrisi çalıştır, KB2 LLM output'u orijinal JAMA visual abstract ile karşılaştır, ayrıntılı raporla.
