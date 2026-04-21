# İterasyon-16 — Slope chart + secondary_numbers + footer temizlik

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-15'te asimetrik JAMA layoutu kuruldu. Hero panel FINDINGS sağda tam yükseklik, chart-slot hazır ama içinde hala placeholder var.

**Kullanıcının iki yeni geri bildirimi:**

1. **Footer'daki `key_stats` badge'leri saçma duruyor** — `p<0.001`, `r=-0.613`, `d=4.186` altta ayrı durmasınlar, ait oldukları panellerin içine gitsinler. JAMA örneğinde de istatistikler panel içinde.

2. **Generic hatırlatma:** Sistem sadece bu knowledge-base için değil, **herhangi bir tıbbi KB için** çalışmalı. Hardcoded değer minimuma indirilmeli, KB'den regex/parse ile çıkarılmalı.

Bu iterasyonda **üç iş birlikte**:

**A) Gerçek slope chart** — hero panel için SVG chart
**B) `secondary_numbers` field'ı** — her panele alt istatistik badge'leri
**C) Footer `key_stats` kaldır** — değerler ait oldukları panellere taşındı

Knowledge-base'deki veriler (**bu KB'ye özel, hardcoded bırakma** — regex ile çek):
- Zaman 1 ortanca: 70.456 (KB section 4 tablosu)
- Zaman 2 ortanca: 35.047 (aynı tablo)
- Düşüş: %50.3 (KB section 7)
- p < 0.001 (KB section 4)
- r = -0.613 (KB section 4)
- d = 4.186 (KB section 3)

`idea.md` rafine edildi: **"Slope chart — FINDINGS'in hero görseli"** bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Spec genişlet — chart field

`src/artifacts/graphical-abstract.mjs` içindeki `buildFindingsPanel()` (hero panel) return'ünü güncelle:

```javascript
function buildFindingsPanel(wiki) {
  // Mevcut alanlar...
  const dependent = findSection(wiki, 'bagimli veri');

  // Zaman 1 & Zaman 2 ortanca değerleri KB section 4 tablosundan çek
  const time1Match = dependent?.content.match(/Ortanca\s*\|\s*\*{0,2}(\d+\.?\d*)\*{0,2}\s*\|\s*\*{0,2}(\d+\.?\d*)\*{0,2}/);
  const time1Value = time1Match ? parseFloat(time1Match[1]) : null;
  const time2Value = time1Match ? parseFloat(time1Match[2]) : null;

  return {
    role: 'findings',
    title: 'Findings',
    primary_number: '%50.3 azalma',
    body: 'Zaman 1\'den Zaman 2\'ye ortanca değer %50.3 azalmış',
    icon_hint: 'downward-trend',  // İcon fallback için kalsın
    hero: true,
    chart_slot: 'slope',  // placeholder → 'slope'
    chart: {
      type: 'slope',
      data: {
        metric: 'Ortanca',
        unit: null,
        points: [
          { label: 'Zaman 1', value: time1Value ?? 70.456 },
          { label: 'Zaman 2', value: time2Value ?? 35.047 },
        ],
      },
      annotations: [
        { type: 'delta', value: '-%50.3', position: 'between-points' },
      ],
    },
    grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
  };
}
```

`schema_version` → `1.2` (minor bump, additive).

### 2. Chart SVG renderer

`src/renderer/html.mjs` içinde yeni fonksiyon:

```javascript
function renderSlopeChart(chart) {
  const { data, annotations = [] } = chart;
  const points = data.points;
  if (!points || points.length < 2) return '<div class="chart-empty">Chart verisi yetersiz</div>';

  // SVG boyutları
  const W = 300, H = 200;
  const padding = { top: 24, right: 40, bottom: 40, left: 56 };
  const plotW = W - padding.left - padding.right;
  const plotH = H - padding.top - padding.bottom;

  // Y ekseni scale (min/max + %10 headroom)
  const values = points.map((p) => p.value);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const range = vMax - vMin;
  const yMin = vMin - range * 0.1;
  const yMax = vMax + range * 0.1;

  // X pozisyonları (iki nokta için basit: sol ve sağ)
  const x1 = padding.left + plotW * 0.15;
  const x2 = padding.left + plotW * 0.85;

  const yScale = (v) => padding.top + plotH * (1 - (v - yMin) / (yMax - yMin));

  const y1 = yScale(points[0].value);
  const y2 = yScale(points[1].value);

  // Y ekseni tick'leri (3 tick: min, orta, max)
  const yTicks = [yMin, (yMin + yMax) / 2, yMax].map((v) => ({
    value: v.toFixed(1),
    y: yScale(v),
  }));

  // Delta annotation
  const deltaText = annotations.find((a) => a.type === 'delta')?.value;
  const deltaX = (x1 + x2) / 2;
  const deltaY = (y1 + y2) / 2 - 12;

  return `
    <svg viewBox="0 0 ${W} ${H}" class="slope-chart">
      <!-- Y axis -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotH}"
            stroke="#d1d5db" stroke-width="1"/>
      ${yTicks.map((t) => `
        <text x="${padding.left - 8}" y="${t.y + 4}" text-anchor="end"
              fill="#6b7280" font-size="10">${t.value}</text>
        <line x1="${padding.left}" y1="${t.y}" x2="${padding.left - 4}" y2="${t.y}"
              stroke="#d1d5db" stroke-width="1"/>
      `).join('')}

      <!-- Slope line -->
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="#059669" stroke-width="3" stroke-linecap="round"/>

      <!-- Points -->
      <circle cx="${x1}" cy="${y1}" r="6" fill="#059669"/>
      <circle cx="${x2}" cy="${y2}" r="6" fill="#059669"/>

      <!-- Point values -->
      <text x="${x1}" y="${y1 - 12}" text-anchor="middle"
            fill="#111827" font-size="12" font-weight="600">${points[0].value.toFixed(2)}</text>
      <text x="${x2}" y="${y2 - 12}" text-anchor="middle"
            fill="#111827" font-size="12" font-weight="600">${points[1].value.toFixed(2)}</text>

      <!-- X axis labels -->
      <text x="${x1}" y="${padding.top + plotH + 20}" text-anchor="middle"
            fill="#374151" font-size="11">${points[0].label}</text>
      <text x="${x2}" y="${padding.top + plotH + 20}" text-anchor="middle"
            fill="#374151" font-size="11">${points[1].label}</text>

      <!-- Delta annotation -->
      ${deltaText ? `
        <text x="${deltaX}" y="${deltaY}" text-anchor="middle"
              fill="#059669" font-size="14" font-weight="700">${deltaText}</text>
      ` : ''}
    </svg>
  `;
}
```

Bu kod referans — agent daha iyi SVG yazabilir. Önemli olan:
- Inline SVG, dependency yok
- Accent renk `#059669` (mevcut)
- 2 nokta + arasında çizgi + değer label'ları + delta annotation

### 3. Hero panel render'ı güncelle

Mevcut `renderHeroPanel` içindeki chart-slot alanı:

```javascript
// Eski:
<div class="chart-slot">
  <!-- icon placeholder -->
</div>

// Yeni:
<div class="chart-slot">
  ${panel.chart ? renderSlopeChart(panel.chart) : renderIconFallback(panel.icon_hint)}
</div>
```

Yani chart varsa slope chart çizilir, yoksa icon fallback kalır.

### 4. CSS — slope chart boyutlama

```css
.panel-hero .chart-slot {
  min-height: 200px;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.slope-chart {
  width: 100%;
  max-width: 320px;
  height: auto;
}
```

### 5. Lint — chart değerlerini trace'le

`numeric_fields` genişlet:

```javascript
numeric_fields: [
  ...mevcut...,
  {
    path: 'layout.hero_panel.chart.data.points[].value',  // YENİ
    required: true,
    extract_numeric_core: true,
    context_window: { strategy: 'tokens', tokens_before: 2, tokens_after: 2,
      match_method: 'overlap', overlap_threshold: 0.5,
      kb_extended_radius: 5, all_matches: true, match_selection: 'best' },
  },
],
```

`collectValuesAtPath` `layout.hero_panel.chart.data.points[].value` gibi derin path'i desteklemeli — generic resolver zaten çalışıyor (iter-13'te kanıtlandı), test et.

### 6. Test

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
```

Beklenti:
- Lint PASS (0 err, 0 warn) — chart değerleri (70.456, 35.047) KB'de geçiyor
- Exit 0
- HTML güncel — hero panelde gerçek slope chart görünür

### 7. Görsel doğrulama

Tarayıcıda `output/graphical-abstract.html` aç:

- Hero panel sağda, tam yükseklik ✓
- Chart-slot artık icon değil, **slope chart**:
  - Sol nokta: Zaman 1 (70.456, üstte)
  - Sağ nokta: Zaman 2 (35.047, altta)
  - Arasında yeşil düşüş çizgisi
  - `-%50.3` annotation üstte
- Y ekseni tick'leri görünür
- Label'lar okunur boyutta

JAMA Tocilizumab örneğinin Kaplan-Meier'ine benziyor mu? (Elbette bizimki 2 nokta, onlarki çok nokta, ama **chart olduğu hissi** var mı?)

### 8. Clinical-summary dokunma

`src/artifacts/clinical-summary.mjs` **değişmemeli**.

### 9. Kısa rapor

- idea.md'nin yeni "Slope chart" bölümü yeterince netti mi?
- KB'den Zaman 1/Zaman 2 ortanca değerlerini extract edişin regex'i sağlam mı? (Markdown table parsing'i doğru çalıştı mı?)
- SVG slope chart görsel olarak profesyonel duruyor mu, yoksa "amateur" mu? (Senin gözlemin)
- Annotation `-%50.3` konumu iyi mi (iki nokta arası)?
- Chart değerlerinin lint trace'i sorunsuz mu çalıştı?
- 17. iterasyon (PNG dönüşüm) için zemin temiz mi?

### 10. Önemli not

Bu iterasyon **çıktıyı gerçek JAMA hissine** büyük ölçüde yaklaştırıyor. JAMA Tocilizumab örneğinin Kaplan-Meier eğrisi kadar zengin değil (2 nokta vs çok nokta), ama **chart var, veri KB-bağımlı, lint korumalı.**

Hocaya akşam gösterirken: *"Findings panelinde gerçek istatistiksel chart — slope chart, veriler KB'den, lint doğrulamalı, halüsinasyon koruması katmanlı."* 

---

### 11. Yeni — `secondary_numbers` panel field'ı

Her panel nesnesi artık opsiyonel bir `secondary_numbers[]` array'i taşıyabilir:

```javascript
{
  role: 'findings',
  title: 'Findings',
  primary_number: '%50.3 azalma',
  body: 'Zaman 1\'den Zaman 2\'ye ortanca değer %50.3 azalmış',
  secondary_numbers: [           // YENİ
    { label: 'p', value: '<0.001' },
    { label: 'r', value: '-0.613' },
  ],
  // ...
}
```

Primary Outcome paneli için:
```javascript
secondary_numbers: [
  { label: "Cohen's d", value: '4.186' },
],
```

**Diğer paneller için:** KB'de ilgili sayı varsa ekle, yoksa boş `[]` bırak (hardcoded yapma). Örn. Population panelinde ortalama yaş gibi bir veri varsa `{ label: 'Ort. yaş', value: '...' }` şeklinde eklenebilir.

### 12. Footer — `key_stats` kaldır

`buildFooter()` veya eşdeğer fonksiyonda:

**Eski:**
```javascript
footer: {
  key_stats: ['p<0.001', 'r = -0.613', 'd = 4.186'],
  citation: '...',
  disclaimer: '...',
}
```

**Yeni:**
```javascript
footer: {
  // key_stats alanı KALDIRILDI (değerler panellere taşındı)
  citation: '...',
  disclaimer: '...',
}
```

HTML render'da key_stats badge render kısmı da kaldırılsın (artık yok).

### 13. Lint — secondary_numbers trace'i

Her `secondary_numbers[].value` KB'de doğrulanmalı (hard trace):

```javascript
numeric_fields: [
  ...mevcut...,
  { path: 'layout.top_panels[].secondary_numbers[].value', required: false,
    extract_numeric_core: true, context_window: {...} },
  { path: 'layout.bottom_panels[].secondary_numbers[].value', required: false,
    extract_numeric_core: true, context_window: {...} },
  { path: 'layout.hero_panel.secondary_numbers[].value', required: false,
    extract_numeric_core: true, context_window: {...} },
],
```

`required: false` — bu field opsiyonel, boş olabilir.

Önceki `footer.key_stats[]` path'ini kaldır (artık yok).

### 14. HTML render — secondary_numbers badges

Her panel body'sinin altında küçük badge'ler:

```html
<div class="secondary-numbers">
  <span class="stat-badge">p &lt;0.001</span>
  <span class="stat-badge">r = -0.613</span>
</div>
```

CSS:
```css
.secondary-numbers {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.stat-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: #ecfdf5;  /* hafif yeşil (accent) */
  color: #059669;
  border-radius: 4px;
  font-family: monospace;
}
```

### 15. Generic prensip hatırlatması

Bu iterasyonda **hardcoded "%50.3 azalma" gibi string'leri minimuma indir.** KB'den regex/parse ile türet:

- Zaman 1 / Zaman 2 değerleri → KB section 4 tablosundan parse
- p-değeri → KB section 4 tablosundan regex
- r değeri → KB section 4 tablosundan regex
- d değeri → KB section 3 tablosundan regex
- %50.3 → KB section 7 veya section 4 dependent bulgularından

Agent **parse başarısız olursa fallback default** kullanabilir ama **o değerin "bu KB'ye özel" olduğunu `interpreter_notes`'a yazmalı.**

Amaç: İterasyon-18'de farklı bir JAMA makalesi KB'si verildiğinde paket minimum değişiklikle çalışmalı.

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra chart field'ını ekle, SVG slope chart renderer yaz, secondary_numbers field'ını her panele ekle, footer.key_stats'ı kaldır, stat-badge CSS'i yaz, CSS'i güncelle, lint path'leri güncelle, KB'den değerleri regex ile çek (hardcoded minimuma), test et, raporla.
