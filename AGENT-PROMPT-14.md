# İterasyon-14 — JAMA Internal Medicine layout'u

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-13'e kadar paket Andrew Ibrahim'in 3-panel triptych formatında (Annals of Surgery 2017) çıktı veriyordu. Kullanıcı hocasına gösterdi, **hocanın geri bildirimi**:

> *"Bu JAMA formatında değil. JAMA Internal Medicine'ın gerçek formatı daha zengin — 5-6 panel, 2 satırlı grid, üstte mavi bar, altta citation, gerçek chart. Ayrıca PNG bekliyorum, HTML değil."*

Bu haklı bir eleştiri. JAMA Internal Medicine örneği (ek'te görseli var):

- Üstte **mavi bar** — "JAMA Internal Medicine" büyük punto
- **"RCT:" prefix** + çalışma başlığı
- **5 panel:** POPULATION, INTERVENTION, FINDINGS, SETTINGS/LOCATIONS, PRIMARY OUTCOME
- **2 satırlı grid:** üstte 3 panel, altta 2 panel
- FINDINGS'te **gerçek chart** (Kaplan-Meier eğrisi)
- Altta **citation** ("Hermine O, Mariette X, et al. JAMA Intern Med. 2020...")
- Sağ altta **© AMA** logosu

`idea.md` rafine edildi: **"JAMA Internal Medicine gerçek formatı (Ibrahim 3-panel'in ötesinde)"** bölümü eklendi. Önce bu yeni bölümü oku.

Bu iterasyon **sadece layout genişletme** odaklı. Gerçek chart rendering İterasyon-15, PNG dönüşümü de İterasyon-15. Şu an HTML olarak kalıyor.

---

## Bu iterasyonda yapılacaklar

### 1. Spec'i genişlet — layout ve header

`src/artifacts/graphical-abstract.mjs`:

```javascript
export const spec = {
  type: 'graphical-abstract',
  schema_version: '1.0',  // MAJOR bump — breaking change (3 panel → esnek)
  subdomain: 'medical-graphical-abstract',
  format: 'jama-internal-medicine-v1',  // format değişti
  // ... numeric_fields, soft_trace_fields aynen kalır ama path'ler güncel
};
```

### 2. JSON payload şeması — yeni yapı

Eski yapı (iterasyon-13'e kadar):
```json
{
  "panels": [pop, comp, outcome]  // 3 sabit
}
```

Yeni yapı:
```json
{
  "header": {
    "title": "...",
    "study_type_prefix": "RCT",
    "journal_bar": { "name": "JAMA Internal Medicine", "color": "#2b6ca3" }
  },
  "layout": {
    "type": "grid-2rows",
    "top_panels": [
      { "role": "population", ... },
      { "role": "intervention", ... },
      { "role": "findings", ... }
    ],
    "bottom_panels": [
      { "role": "settings", ... },
      { "role": "primary_outcome", ... }
    ]
  },
  "footer": {
    "key_stats": [...],
    "citation": "...",  // YENİ — gelecek iterasyonda zenginleşir
    "disclaimer": "..."
  }
}
```

### 3. compile() fonksiyonu — yeni paneller

`buildPopulationPanel()`, `buildInterventionPanel()`, `buildFindingsPanel()` mevcut.

**Yeni ekle:**

```javascript
function buildSettingsPanel(wiki) {
  // Knowledge-base'de "Analiz Ortamı: R programlama dili v4.5.0" var
  // preamble'dan çek
  return {
    role: 'settings',
    title: 'Settings / Locations',
    primary_number: 'R v4.5.0',  // KB preamble'dan
    body: 'Analiz ortamı: R programlama dili',
    icon_hint: 'lab-setting',
  };
}

function buildPrimaryOutcomePanel(wiki) {
  // Knowledge-base bölüm 3'teki primary outcome detayını al
  return {
    role: 'primary_outcome',
    title: 'Primary Outcome',
    primary_number: 'Wilcoxon İşaretli Sıralar Testi',
    body: 'Bağımlı iki ölçüm arasındaki fark',
    icon_hint: 'outcome-measure',
  };
}
```

Mevcut 3 paneli `top_panels` array'ine, yeni 2 paneli `bottom_panels`'a koy:

```javascript
const payload = {
  header: {
    title: headerTitle,
    study_type_prefix: 'RCT',  // knowledge-base.md başlığından çıkarılabilir
    journal_bar: { name: 'JAMA Internal Medicine', color: '#2b6ca3' },
  },
  layout: {
    type: 'grid-2rows',
    top_panels: [
      buildPopulationPanel(...),
      buildComparisonPanel(...),   // middle panel, mevcut
      buildFindingsPanel(...),     // outcome'u findings'e yeniden isimlendir
    ],
    bottom_panels: [
      buildSettingsPanel(wiki),
      buildPrimaryOutcomePanel(wiki),
    ],
  },
  footer: { ...mevcut... },
};
```

**Not:** `buildOutcomePanel` → `buildFindingsPanel` yeniden isimlendir, role `outcome` → `findings` değişir.

### 4. Lint kurallarını güncelle

`exactly-three-panels` kuralı değişmeli:

```javascript
{
  id: 'panel-count-in-range',  // YENİ isim
  check: (a) => {
    const total = (a.payload.layout?.top_panels?.length ?? 0) +
                  (a.payload.layout?.bottom_panels?.length ?? 0);
    if (total < 3) return { error: `Toplam panel < 3 (şu an: ${total})` };
    if (total > 6) return { error: `Toplam panel > 6 (şu an: ${total})` };
    return true;
  },
}
```

`panel-roles-pico` kuralını gevşet:

```javascript
{
  id: 'panel-roles-valid',
  check: (a) => {
    const validRoles = [
      'population', 'intervention', 'comparison', 'outcome',
      'findings', 'settings', 'methods', 'primary_outcome',
      'secondary_outcomes', 'limitations',
    ];
    const allPanels = [
      ...(a.payload.layout?.top_panels ?? []),
      ...(a.payload.layout?.bottom_panels ?? []),
    ];
    const invalid = allPanels.filter((p) => !validRoles.includes(p.role));
    if (invalid.length) {
      return { error: `Geçersiz panel role: ${invalid.map((p) => p.role).join(', ')}` };
    }
    return true;
  },
}
```

`numeric-fields-traceable` için path güncelleme:

```javascript
numeric_fields: [
  {
    path: 'layout.top_panels[].primary_number',   // YENİ path
    required: true,
    extract_numeric_core: true,
    context_window: { ...mevcut... },
  },
  {
    path: 'layout.bottom_panels[].primary_number',
    required: true,
    extract_numeric_core: true,
    context_window: { ...mevcut... },
  },
  {
    path: 'footer.key_stats[]',
    ...mevcut...
  },
],
soft_trace_fields: [
  { path: 'layout.top_panels[].body', ... },
  { path: 'layout.bottom_panels[].body', ... },
],
```

**Not:** `collectValuesAtPath()` function'ı `layout.top_panels[].primary_number` gibi nested path'leri zaten destekliyor olmalı (iter-13'te genişletildi).

### 5. HTML render katmanını güncelle

`src/renderer/html.mjs`:

**Eski:** `<section class="panels">` → 3 panel yan yana

**Yeni:** 2 satırlı grid

```html
<header class="journal-bar">
  <h1>JAMA Internal Medicine</h1>
</header>

<section class="title-block">
  <p class="study-type"><strong>RCT:</strong></p>
  <h2 class="study-title">{{header.title}}</h2>
</section>

<section class="panels panels-top">
  <!-- 3 büyük panel yan yana -->
  {{top_panels}}
</section>

<section class="panels panels-bottom">
  <!-- 2 küçük panel yan yana -->
  {{bottom_panels}}
</section>

<footer>
  <div class="key-stats">{{footer.key_stats}}</div>
  <p class="citation">{{footer.citation}}</p>
  <p class="disclaimer">{{footer.disclaimer}}</p>
  <span class="brand">© Studio Agent</span>
</footer>
```

CSS:
- Mavi bar: `background: #2b6ca3; color: white; padding: 1rem 2rem`
- Top panels: `grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 1px solid #ddd`
- Bottom panels: `grid-template-columns: repeat(2, 1fr); gap: 0`
- Panel arası dikey çizgi: `border-right: 1px solid #ddd`

### 6. Test (kritik)

```bash
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
```

Beklenti:
- Lint PASS (0 err, 0 warn)
- Exit 0
- HTML güncel — 2 satırlı grid + mavi bar + RCT prefix
- clinical-summary etkilenmedi (iter-13'ten kalma)

**Tarayıcıda aç**, **bana göster** — layout gerçekten JAMA Internal Medicine'a benziyor mu?

### 7. Clinical-summary'yi etkileme

`src/artifacts/clinical-summary.mjs` **değişmemeli** — yalnızca graphical-abstract layout refactor'u bu iterasyonun konusu.

### 8. Breaking change uyarısı

Bu `schema_version: 1.0` bump — major. Önceki iter-13 artifact'ları (schema 0.9) artık **geçersiz** (yeni field'lar eksik). Bu normal, dikkatlice belirt `interpreter_notes`'a:

```
"schema v0.9 → v1.0 geçişi: panels[] → layout.top_panels[] + layout.bottom_panels[]. Geri uyumluluk yok."
```

### 9. Kısa rapor

İterasyon-14 sonunda yine kısa rapor:

- idea.md'nin yeni "JAMA Internal Medicine" bölümü yeterince netti mi?
- Panel sayısını 3'ten 5'e çıkarmak KB'de yeterli bilgi buldun mu, yoksa settings/primary_outcome panelleri KB'den zayıf mı çıktı?
- Layout (2 satır grid) görsel olarak ekran görüntüsündeki örneğe benziyor mu? (senin gözlemin)
- Lint path'leri (layout.top_panels[].primary_number) mevcut collectValuesAtPath ile çalıştı mı?
- Breaking change dokümante edildi mi?
- 15. iterasyon (PNG + gerçek chart) için zemin temiz mi?

### 10. Önemli not

Bu **major schema bump** — schema 1.0. Önceki output'lar artık geçersiz. iteration-13/output/ içinde eski JSON var, dokunma — tarih kaydı olarak kalsın. Yeni output'lar iteration-14 snapshot'ında olacak.

Hocanın geri bildiriminin **"panel sayısı esnek"** ve **"layout 2 satır"** kısımları bu iterasyonda çözülüyor. **"PNG"** kısmı iter-15'e kalıyor. Bunu bilinçli belirt.

---

Başla. Önce idea.md'nin yeni "JAMA Internal Medicine" bölümünü oku, sonra spec'i v1.0'a bump'la, layout şemasını yeniden tasarla, 2 yeni panel ekle (settings + primary_outcome), lint kurallarını uyarla, HTML render'ı grid-2rows'a güncelle, test et, raporla.
