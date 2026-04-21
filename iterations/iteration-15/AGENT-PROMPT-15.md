# İterasyon-15 — Asimetrik JAMA layoutu (FINDINGS hero konumu)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-14'te 3+2 eşit grid kuruldu. Kullanıcı hocaya gösterdi ve JAMA Tocilizumab COVID örneğiyle karşılaştırma yaptı. İki kritik bulgu çıktı:

1. **JAMA'da FINDINGS paneli hero konumda** — tam yükseklik (2 satır), sağda, chart için ayrılmış alan. Bizim "3+2 eşit grid" yapısı bunu yakalamıyor.

2. **HTML karttaki alt teknik metadata gereksiz** — `schema v1.0 · jama-internal-medicine-v1 · medical-graphical-abstract · 2026-04-20T12:50:53.078Z` görsel karmaşa yaratıyor. Bu bilgi JSON metadata'sında zaten var, HTML'den çıkmalı.

`idea.md` rafine edildi: **"Asimetrik JAMA layoutu — FINDINGS panelinin hero konumu"** bölümü eklendi. Önce bu yeni bölümü oku.

**Bu iterasyon sadece layout refactor ve temizlik odaklı.** Gerçek chart rendering iterasyon-16'da, PNG dönüşümü iterasyon-17'de. Şu an sadece:

- Grid layout: 3x2 simetrik → asimetrik (FINDINGS tam yükseklik)
- Footer: teknik metadata temizlenir
- Chart slot: placeholder ile hazırlanır (iter-16'da doldurulacak)

---

## Bu iterasyonda yapılacaklar

### 1. Spec genişlet — panel hero flag

`src/artifacts/graphical-abstract.mjs` içindeki `buildFindingsPanel()` fonksiyonu yeni alanlar döndürsün:

```javascript
function buildFindingsPanel(...) {
  return {
    role: 'findings',
    title: 'Findings',
    primary_number: '%50.3 azalma',
    body: 'Zaman 1\'den Zaman 2\'ye ortanca değer %50.3 azalmış',
    icon_hint: 'downward-trend',
    hero: true,                // YENİ — renderer bunu tam yükseklik yapar
    chart_slot: 'placeholder', // YENİ — iter-16'da 'slope-chart' olacak
    grid_position: {           // YENİ — renderer-agnostic position hint
      column: 3,
      rowStart: 1,
      rowSpan: 2,
    },
  };
}
```

`schema_version` → `1.1` (minor bump — non-breaking addition).

### 2. Layout JSON yapısı — top_panels/bottom_panels çerçevesi koruyarak hero handle et

Mevcut `layout.top_panels` ve `layout.bottom_panels` yapısı kalsın (breaking change yapmayalım). Sadece FINDINGS panel'i `top_panels`'tan çıkarılıp ayrı bir yer tutsun:

```json
{
  "layout": {
    "type": "jama-asymmetric-v1",   // YENİ format string
    "top_panels": [
      { role: "population", ... },       // col 1
      { role: "intervention", ... }      // col 2
      // FINDINGS artık burada DEĞİL
    ],
    "bottom_panels": [
      { role: "settings", ... },         // col 1
      { role: "primary_outcome", ... }   // col 2
    ],
    "hero_panel": {                       // YENİ — tam yükseklik, sağda
      role: "findings",
      hero: true,
      chart_slot: "placeholder",
      ...
    }
  }
}
```

Bu yapı değişikliği yüzünden:
- `numeric_fields` path'leri güncellenmeli: `layout.hero_panel.primary_number` eklenir
- Lint `panel-count-in-range` kuralı: `top + bottom + 1 (hero)` = 3-6 arası

### 3. CSS / HTML render — grid refactor

`src/renderer/html.mjs`:

```html
<section class="panels-grid">
  <!-- Top row: 2 panel (left + middle kolonlarında) -->
  {{top_panels}}  <!-- panel 1 ve 2 -->

  <!-- Hero panel: column 3, tam yükseklik -->
  {{hero_panel}}

  <!-- Bottom row: 2 panel (left + middle kolonlarında) -->
  {{bottom_panels}}  <!-- panel 1 ve 2 -->
</section>
```

CSS:

```css
.panels-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;  /* sağ kolon biraz geniş, hero için */
  grid-template-rows: auto auto;
}

.panel-top-1    { grid-column: 1; grid-row: 1; }
.panel-top-2    { grid-column: 2; grid-row: 1; }
.panel-hero     { grid-column: 3; grid-row: 1 / span 2; }
.panel-bottom-1 { grid-column: 1; grid-row: 2; }
.panel-bottom-2 { grid-column: 2; grid-row: 2; }

.panel-hero {
  border-left: 1px solid #ddd;
  background: #f8f9fa;  /* hafif belirgin arka plan */
}

.panel-hero .panel-primary {
  font-size: 2.2rem;  /* hero primary daha büyük */
  color: #059669;     /* accent */
}

.panel-hero .chart-slot {
  margin-top: 1rem;
  min-height: 180px;
  /* iter-16'da SVG chart buraya gelecek */
  /* şimdilik mevcut icon'un büyütülmüş hali veya basit placeholder */
}
```

### 4. Footer temizliği

Mevcut footer'da şu teknik satır var:

```
schema v1.0 · jama-internal-medicine-v1 · medical-graphical-abstract · 2026-04-20T12:50:53.078Z
```

Bunu **tamamen çıkar.** HTML'de görünmesin. Ama JSON `_metadata`'da zaten var — JSON tüketicisi için orada kalıyor.

Yeni footer yalnızca:
- Key stats badges (p<0.001, r=-0.613, d=4.186) — mevcut
- Citation satırı (italic, gri) — mevcut
- Disclaimer — mevcut
- Brand (© Studio Agent, sağ alt) — mevcut

### 5. Chart slot placeholder

Hero paneldeki chart-slot için geçici bir placeholder:

**Seçenek A:** Mevcut `downward-trend` icon'u **büyütülmüş** hali (şu an 56x56, hero'da 120x120)

**Seçenek B:** Basit bir SVG "Slope chart gelecek" placeholder:

```html
<div class="chart-slot">
  <svg viewBox="0 0 200 120">
    <text x="100" y="60" text-anchor="middle" fill="#999" font-size="10">
      Slope chart — iter-16
    </text>
  </svg>
</div>
```

Seçenek A daha temiz (placeholder hissi vermez, sadece ikon büyük). Sen karar ver, raporla.

### 6. Lint güncellemeleri

`panel-count-in-range`:
```javascript
const total = (top_panels?.length ?? 0) + (bottom_panels?.length ?? 0) + (hero_panel ? 1 : 0);
```

`panel-roles-valid`: aynı enum, hero_panel da kontrol edilir.

`numeric_fields` path:
```javascript
numeric_fields: [
  { path: 'layout.top_panels[].primary_number', ... },
  { path: 'layout.bottom_panels[].primary_number', ... },
  { path: 'layout.hero_panel.primary_number', required: true, ... },  // YENİ
  { path: 'footer.key_stats[]', ... },
],
```

`collectValuesAtPath()` `layout.hero_panel.primary_number` gibi **object-based path'i** (array değil) destekliyor mu? Eğer etmiyorsa genişlet — generic dot-notation path resolver olmalı.

### 7. Test

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
```

Beklenti:
- Lint PASS (0 err, 0 warn)
- Exit 0
- HTML asimetrik grid, FINDINGS tam yükseklik sağda
- Footer temiz (teknik metadata yok)

### 8. Görsel doğrulama

Tarayıcıda `output/graphical-abstract.html` aç. Kontrol et:

- Sol: POPULATION üstte, SETTINGS altta ✓
- Orta: COMPARISON üstte, PRIMARY OUTCOME altta ✓
- Sağ: FINDINGS tam yükseklik + placeholder chart slot ✓
- Footer: sadece badge'ler + citation + brand ✓ (teknik metadata yok)

JAMA Tocilizumab örneğiyle yan yana koyduğunda benzerlik artmış mı?

### 9. Clinical-summary dokunma

`src/artifacts/clinical-summary.mjs` **değişmemeli** — bu iterasyon sadece graphical-abstract.

### 10. Kısa rapor

- idea.md'nin yeni "Asimetrik JAMA layoutu" bölümü yeterince netti mi?
- `layout.hero_panel` ayrı field yaklaşımı doğru mu, yoksa `top_panels` içinde `hero: true` flag'i daha mı temiz olurdu?
- `collectValuesAtPath` object-based path'i (`layout.hero_panel.primary_number`) destekliyor muydu? Genişlettin mi?
- Chart slot için A (büyük icon) mı B (SVG placeholder) mı seçtin? Neden?
- Footer temizliği görsel olarak etkiledi mi?
- 16. iterasyon (gerçek chart — slope veya bar) için zemin temiz mi?

### 11. Önemli not

Bu **minor bump (1.1)** — breaking değil, additive (yeni field'lar). Eski 1.0 JSON'u işleyecek renderer backward-compatible olmalı mı? (Eğer JSON'da `layout.hero_panel` yoksa eski 3+2 layout'a düş.) Bu düşünce gerekirse raporla.

---

Başla. Önce idea.md'nin yeni bölümünü oku, sonra hero_panel field'ını ekle, asimetrik grid CSS'ini yaz, footer'ı temizle, chart slot placeholder koy, lint'i güncelle, test et, raporla.
