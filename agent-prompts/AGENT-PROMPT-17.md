# İterasyon-17 — KB profile adapter (tek KB'ye fit olmaktan çıkış)

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-16 sonunda paket `knowledge-base.md` için mükemmel çalışıyordu (lint PASS, HTML JAMA-benzeri, slope chart, secondary numbers kolonlarda). Paketin jenerik olup olmadığını test etmek için ikinci bir KB ile çalıştırıldı: `knowledge-base-2.md` (JAMA Dermatology, "Heads Up" RCT, Upadacitinib vs Dupilumab, n=673).

**Sonuç:** Paket kırıldı.

```
[compile] graphical-abstract (schema 1.2)
  -> output-kb2/graphical-abstract.json  [lint FAIL, 2 err, 1 warn]
     ERROR  [numeric-fields-traceable] hero_panel.primary_number: "%50.3 azalma" — core trace FAIL [50.3]
     ERROR  [required-sections-resolved] bagimli-veri-analizi|bagimsiz-tek-grup-analizi karşılanmadı
     WARN   [soft-fields-traceable] hero_panel.body: "Zaman 1'den Zaman 2'ye..." — core trace FAIL
```

Çıktı JSON'a bakınca kök sebep netleşti:

- `hero_panel.primary_number` → `"%50.3 azalma"` (KB1'den literal hardcoded string)
- `hero_panel.body` → `"Zaman 1'den Zaman 2'ye ortanca değer %50.3 azalmış"` (KB1'den literal)
- `settings.primary_number` → `"v4.5.0"` (KB1 preamble'dan, KB2'de yok)
- `intervention.primary_number` → `"cov1 vs ref=1"` (KB1 T-test, KB2 RCT)
- `primary_outcome.primary_number` → `"Wilcoxon İşaretli Sıralar"` (KB1 metodoloji, KB2 EASI75)
- `study_type_prefix` → `"Statistical Analysis"` (sabit, KB2 aslında RCT)

**Teşhis:** Paket `knowledge-base.md`'nin *özel yapısına* (Zaman 1/Zaman 2, Ortanca tablosu, cov1, bağımlı-veri-analizi H2'si) aşırı fit. `buildFindingsPanel` / `buildSettingsPanel` / vb. KB'den ekstraksiyon yapıyormuş gibi görünüyor ama aslında fallback literal string döndürüyor. KB2 için fallback'ler eşleşmediğinden lint bunu yakaladı ve render abort etti — yani paket yanlış kart göstermedi (iyi), ama doğru kart da üretmedi (kötü).

`idea.md` rafine edildi: **"KB profile adapter — tek KB'ye fit olmaktan çıkış"** bölümü eklendi. Önce bu yeni bölümü oku (idea.md'nin sonuna yakın, `### KB profile adapter` başlığı altında).

---

## Bu iterasyonda yapılacaklar

### 1. Yeni dizin: `src/kb-profiles/`

Adapter pattern. Her KB profili için ayrı dosya:

```
src/kb-profiles/
├── index.mjs                 # detectKbProfile() + loadProfile() dispatcher
├── statistical-pre-post.mjs  # Mevcut KB1 builder'ları buraya taşı
├── rct-comparison.mjs        # YENİ — KB2 için RCT builder'ları
└── generic.mjs               # YENİ — en minimal fallback
```

### 2. Dispatcher — `src/kb-profiles/index.mjs`

```javascript
export function detectKbProfile(wiki) {
  const sections = wiki.sections.map((s) => s.id);
  const content = wiki.raw;

  // RCT profili: primary/secondary endpoint, randomized, treatment groups
  if (
    /randomi[sz]ed|\brct\b|primary\s+endpoint/i.test(content) &&
    sections.some((id) => /primary-endpoint|secondary-endpoints/i.test(id))
  ) {
    return 'rct-comparison';
  }

  // Statistical pre-post: Zaman 1/2, bağımlı ölçüm, Wilcoxon
  if (/Zaman\s*1.*Zaman\s*2|Bağımlı\s+Veri\s+Analizi|Wilcoxon/i.test(content)) {
    return 'statistical-pre-post';
  }

  return 'generic';
}

export async function loadProfile(id) {
  const map = {
    'statistical-pre-post': () => import('./statistical-pre-post.mjs'),
    'rct-comparison': () => import('./rct-comparison.mjs'),
    'generic': () => import('./generic.mjs'),
  };
  const loader = map[id] ?? map.generic;
  const mod = await loader();
  return mod.profile;
}
```

**Profile arayüzü (her dosya bunu export eder):**

```javascript
export const profile = {
  id: 'rct-comparison',
  study_type_prefix: 'RCT',
  required_sections: ['genel-bilgiler'],
  preferred_sections: ['primary-endpoint', 'tanimlayici-istatistikler', ...],
  buildPopulation: (wiki) => ({ role: 'population', ... }),
  buildIntervention: (wiki) => ({ role: 'intervention', ... }),
  buildFindings: (wiki) => ({ role: 'findings', hero: true, chart: {...}, ... }),
  buildSettings: (wiki) => ({ role: 'settings', ... }),
  buildPrimaryOutcome: (wiki) => ({ role: 'primary_outcome', ... }),
  buildCitation: (preamble) => '...' | null,
};
```

### 3. KB1 builder'larını `statistical-pre-post.mjs`'e taşı

`src/artifacts/graphical-abstract.mjs` içindeki şu fonksiyonlar aynen yeni dosyaya kopyalanır (sonra orijinaller silinir):

- `buildPopulationPanel` → `profile.buildPopulation`
- `buildComparisonPanel` (intervention variant) → `profile.buildIntervention`
- `buildFindingsPanel` → `profile.buildFindings`
- `buildSettingsPanel` → `profile.buildSettings`
- `buildPrimaryOutcomePanel` → `profile.buildPrimaryOutcome`
- `extractMedians`, `extractPValue`, `extractRValue`, `extractDValue`, `extractDelta`, `buildCitation` — private helper olarak aynı dosyada kalır

`profile.required_sections = ['bagimli-veri-analizi', 'bagimsiz-tek-grup-analizi']` (KB1'e özel contract).

**KB1 davranışı birebir korunmalı.** İterasyon-16 output'u ile yeni output byte-farklı olmayacak (belki `_metadata.profile: 'statistical-pre-post'` eklenir, başka hiçbir şey değişmez).

### 4. KB2 için `rct-comparison.mjs`

KB2'nin yapısı:

- Section 1 (GENEL BİLGİLER): "n = 673 (randomized ve treated)", "129 centers, 22 countries"
- Section 3 (PRIMARY ENDPOINT): "EASI75 at week 16", "72.4% vs 62.6%, p=0.007"
- Section 4 (RANKED SECONDARY): EASI90, EASI100, pruritus NRS değişimi
- Preamble: "Upadacitinib 30 mg", "Dupilumab 300 mg"
- H1: "Heads Up — Upadacitinib vs Dupilumab Klinik Çalışması"

**Builder'lar:**

```javascript
function buildPopulation(wiki) {
  const general = wiki.findSection('genel-bilgiler');
  const nTotal = general?.content.match(/n\s*=\s*(\d+)/i)?.[1];
  const armMatch = general?.content.match(/(\d+)\s+upadacitinib.*?(\d+)\s+dupilumab/is);
  const body = armMatch
    ? `${nTotal} hasta, ${armMatch[1]} Upadacitinib vs ${armMatch[2]} Dupilumab`
    : `${nTotal} hasta randomize edildi`;
  return {
    role: 'population',
    title: 'Population',
    primary_number: `n = ${nTotal}`,
    body,
    icon_hint: 'patients-cohort',
    grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
  };
}

function buildIntervention(wiki) {
  const general = wiki.findSection('genel-bilgiler');
  // "Upadacitinib 30 mg once daily vs Dupilumab 300 mg every 2 weeks"
  const m = general?.content.match(
    /Upadacitinib\s+(\d+\s*mg)[^v]*vs\s+Dupilumab\s+(\d+\s*mg)/i,
  );
  const primary = m ? `Upadacitinib ${m[1]}` : 'Upadacitinib vs Dupilumab';
  const body = m
    ? `Upadacitinib ${m[1]} vs Dupilumab ${m[2]}`
    : 'JAK1 inhibitörü vs IL-4/13 inhibitörü karşılaştırması';
  return {
    role: 'intervention',
    title: 'Intervention',
    primary_number: primary,
    body,
    icon_hint: 'trial',
    grid_position: { column: 2, rowStart: 1, rowSpan: 1 },
  };
}

function buildFindings(wiki) {
  const primary = wiki.findSection('primary-endpoint');
  // "72.4% vs 62.6%, p=0.007" veya benzeri
  const m = primary?.content.match(
    /(\d+\.\d+)\s*%[^v]*vs\s*(\d+\.\d+)\s*%[^p]*p\s*[=<>]\s*(0?\.\d+)/i,
  );
  if (!m) return fallbackFindings();

  const [, armA, armB, pVal] = m;
  const delta = (parseFloat(armA) - parseFloat(armB)).toFixed(1);
  const absDelta = Math.abs(parseFloat(delta)).toFixed(1);
  const sign = parseFloat(delta) >= 0 ? '+' : '-';

  return {
    role: 'findings',
    title: 'Findings',
    primary_number: `${sign}${absDelta} puan`,   // "+9.8 puan" gibi
    body: `EASI75 haftada 16: %${armA} vs %${armB}`,
    icon_hint: 'bar-comparison',
    hero: true,
    chart_slot: 'bar',
    chart: {
      type: 'bar',
      data: {
        metric: 'EASI75 (%)',
        unit: '%',
        points: [
          { label: 'Upadacitinib', value: parseFloat(armA) },
          { label: 'Dupilumab', value: parseFloat(armB) },
        ],
      },
      annotations: [{ type: 'delta', value: `${sign}${absDelta}pp`, position: 'between-points' }],
    },
    secondary_numbers: [{ label: 'p', value: pVal }],
    grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
  };
}

function buildSettings(wiki) {
  const general = wiki.findSection('genel-bilgiler');
  // "129 centers in 22 countries" veya "129 merkez, 22 ülke"
  const m = general?.content.match(
    /(\d+)\s*(?:center|merkez)[^\d]*(\d+)\s*(?:countr|ülke)/i,
  );
  const primary = m ? `${m[1]} merkez` : 'Multi-center';
  const body = m ? `${m[1]} merkez, ${m[2]} ülkede yürütüldü` : 'Uluslararası çalışma';
  return {
    role: 'settings',
    title: 'Settings / Locations',
    primary_number: primary,
    body,
    icon_hint: 'lab-setting',
    grid_position: { column: 1, rowStart: 2, rowSpan: 1 },
  };
}

function buildPrimaryOutcome(wiki) {
  return {
    role: 'primary_outcome',
    title: 'Primary Outcome',
    primary_number: 'EASI75',
    body: 'Haftada 16 EASI75 yanıtı',
    icon_hint: 'outcome-measure',
    secondary_numbers: [],  // KB2'de d-value yok, boş bırak
    grid_position: { column: 2, rowStart: 2, rowSpan: 1 },
  };
}

export const profile = {
  id: 'rct-comparison',
  study_type_prefix: 'RCT',
  required_sections: ['genel-bilgiler'],
  preferred_sections: ['primary-endpoint', 'tanimlayici-istatistikler-baseline-demographics'],
  buildPopulation,
  buildIntervention,
  buildFindings,
  buildSettings,
  buildPrimaryOutcome,
  buildCitation: (preamble) => null,  // KB2'de preamble minimal, citation yok
};
```

**Önemli not:** KB2'nin tam section ID'leri parse'tan sonra bakılmalı — `wiki.findSection('primary-endpoint')` yerine gerçek ID (`primary-endpoint` vs `3-primary-endpoint` vs `primary-endpoint-birincil-sonlanim-noktasi` olabilir). Parse sonucuna göre düzelt.

### 5. `generic.mjs` — minimal fallback

```javascript
export const profile = {
  id: 'generic',
  study_type_prefix: 'Study',
  required_sections: ['genel-bilgiler'],
  preferred_sections: [],
  buildPopulation: (wiki) => ({
    role: 'population', title: 'Population',
    primary_number: extractAnyN(wiki) || 'n = ?',
    body: 'Çalışma popülasyonu',
    icon_hint: 'patients-cohort',
    grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
  }),
  buildIntervention: () => null,   // null ise compile() onu layout'tan çıkarır
  buildFindings: () => null,
  buildSettings: () => null,
  buildPrimaryOutcome: () => null,
  buildCitation: () => null,
};
```

Generic profile için `panel-count-in-range` lint kuralı en az 3 panel ister. Population + header + footer yeter mi? Değilse `panel-count-in-range`'i 2'ye indir geçici olarak. Ama **hedef:** generic'e düşmemek — KB'yi profile'a matchle.

### 6. `compile()` dispatcher — `src/artifacts/graphical-abstract.mjs`

```javascript
import { detectKbProfile, loadProfile } from '../kb-profiles/index.mjs';

export async function compile({ wiki }) {
  const profileId = detectKbProfile(wiki);
  const profile = await loadProfile(profileId);

  const payload = {
    header: {
      title: extractH1(wiki.preamble),
      study_type_prefix: profile.study_type_prefix,
      journal_bar: { name: 'JAMA Internal Medicine', color: '#2b6ca3' },
      citation: profile.buildCitation?.(wiki.preamble) ?? null,
    },
    layout: {
      type: 'jama-asymmetric-v1',
      top_panels: [profile.buildPopulation(wiki), profile.buildIntervention(wiki)].filter(Boolean),
      bottom_panels: [profile.buildSettings(wiki), profile.buildPrimaryOutcome(wiki)].filter(Boolean),
      hero_panel: profile.buildFindings(wiki),
    },
    footer: {
      citation: profile.buildCitation?.(wiki.preamble) ?? null,
      disclaimer: 'Otomatik üretildi; tıbbi içerik — publish öncesi insan onayı önerilir.',
      brand: '© Studio Agent',
    },
  };

  // spec'e profile'ı yansıt (required_sections dinamik)
  const specWithProfile = {
    ...spec,
    required_sections: profile.required_sections,
    _profile: profileId,
  };

  return { payload, spec: specWithProfile, profile: profileId };
}
```

**`_metadata.profile`** çıktıya eklenir (izlenebilirlik):

```json
{
  "_metadata": {
    "artifact_type": "graphical-abstract",
    "profile": "rct-comparison",
    ...
  }
}
```

### 7. Renderer — yeni chart tipi `bar`

`src/renderer/html.mjs` içindeki chart render fonksiyonu `type === 'slope'` dışında `type === 'bar'` case'i almalı:

```javascript
function renderChart(chart) {
  if (!chart) return '';
  if (chart.type === 'slope') return renderSlopeChart(chart);
  if (chart.type === 'bar') return renderBarChart(chart);
  return '';
}

function renderBarChart({ data, annotations }) {
  // SVG bar chart, dependency yok
  // İki dikey bar, max value'ya göre scale
  // Label barın üstünde, delta iki bar arası üstte
  const max = Math.max(...data.points.map((p) => p.value));
  const barWidth = 60;
  const gap = 40;
  const chartHeight = 140;

  const bars = data.points.map((p, i) => {
    const x = 50 + i * (barWidth + gap);
    const height = (p.value / max) * chartHeight;
    const y = chartHeight - height + 30;
    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" fill="#059669" />
      <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="600" fill="#111">${p.value.toFixed(1)}${data.unit ?? ''}</text>
      <text x="${x + barWidth / 2}" y="${chartHeight + 48}" text-anchor="middle" font-size="11" fill="#555">${p.label}</text>
    `;
  }).join('');

  const delta = annotations?.find((a) => a.type === 'delta');
  const deltaLabel = delta
    ? `<text x="50%" y="18" text-anchor="middle" font-size="13" font-weight="700" fill="#059669">${delta.value}</text>`
    : '';

  return `
    <svg viewBox="0 0 300 200" class="chart chart-bar" role="img" aria-label="${data.metric}">
      ${deltaLabel}
      ${bars}
    </svg>
  `;
}
```

Slope chart için mevcut fonksiyon dokunulmaz.

### 8. Lint kuralı — required_sections dinamik

Mevcut:
```javascript
required_sections: ['bagimli-veri-analizi', 'bagimsiz-tek-grup-analizi'],
```

Bu profile'a taşındı. `spec` objesinden kaldır. Lint kuralı (`required-sections-resolved`) `spec.required_sections` yerine `artifact._metadata.contract.required`'dan okuyor zaten — bu alan compile() tarafından profile'dan doldurulmalı.

### 9. Wiki'ye helper: `findSection(idFragment)`

Şu an `wiki.sections` bir array. Builder'lar `wiki.findSection('primary-endpoint')` gibi çağırıyor. `src/parse.mjs` (veya parser ne dosyadaysa) wiki objesine helper ekle:

```javascript
wiki.findSection = (idFragment) => {
  const lower = idFragment.toLowerCase();
  return wiki.sections.find((s) => s.id.toLowerCase().includes(lower)) ?? null;
};
```

### 10. Test matrisi

```bash
# KB1 — regresyon testi
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html
# BEKLENEN: lint PASS (0 err, 0 warn), profile='statistical-pre-post', HTML iter-16 ile aynı
# _metadata.profile: 'statistical-pre-post' eklenmiş olmalı, başka fark yok

# KB2 — yeni fonksiyonalite
node bin/studio-agent.mjs compile --source knowledge-base-2.md --out output-kb2 --render html
# BEKLENEN: lint PASS, profile='rct-comparison', bar chart, EASI75 değerleri doğru
```

**KB1 PASS olmazsa** iterasyon başarısız — adapter taşıma sırasında bir şey bozuldu. Önce KB1 PASS olmalı, sonra KB2.

### 11. Görsel doğrulama

Tarayıcıda iki HTML'i de aç:
- `output/graphical-abstract.html` — KB1, slope chart, JAMA layout
- `output-kb2/graphical-abstract.html` — KB2, bar chart, EASI75 primary

KB2'de:
- Header: "Heads Up — Upadacitinib vs Dupilumab Klinik Çalışması"
- Prefix: "RCT" (Statistical Analysis değil)
- Population: "n = 673", body "673 hasta, 342 Upadacitinib vs 331 Dupilumab"
- Intervention: "Upadacitinib 30 mg"
- Settings: "129 merkez"
- Primary outcome: "EASI75"
- Hero: bar chart, iki bar (Upadacitinib 72.4% yüksek, Dupilumab 62.6% kısa), +%9.8pp delta annotation, secondary p=0.007

### 12. Clinical-summary dokunma

`src/artifacts/clinical-summary.mjs` bu iterasyonda **değişmemeli.** Clinical-summary KB2 için de kırık olacak, ama onu iter-18'de adapter pattern'e taşıyacağız. Şimdi sadece graphical-abstract odaklı.

**Not:** Clinical-summary KB2 için lint FAIL verecek ve bu normal. CLI compile çıktısında iki artifact için ayrı rapor var — graphical-abstract PASS, clinical-summary FAIL olabilir. Bu iterasyonun exit code'u ne olmalı? Düşün ve raporla.

### 13. Kısa rapor

- idea.md'nin yeni "KB profile adapter" bölümü yeterince netti mi?
- Profile detection (`detectKbProfile`) doğru çalıştı mı? KB1 → 'statistical-pre-post', KB2 → 'rct-comparison'?
- KB1 regresyon testi PASS mı? (birebir output mu, yoksa farklar mı?)
- KB2 lint PASS mı, FAIL mı? FAIL ise hangi alan sorunlu?
- Bar chart görsel olarak anlaşılır mı (Upadacitinib yüksek, Dupilumab kısa, delta net)?
- `rct-comparison.mjs` içindeki regex'ler KB2'nin gerçek metnine eşleşti mi? Eğer bir extractor fallback'e düştüyse (örn. `buildFindings` regex match etmediyse), KB2'nin o section'ının içeriğini raporla — regex'i nasıl genişletmek gerekir?
- Clinical-summary KB2 için ne oldu? Exit code nasıl handle edildi?
- 18. iterasyon (PNG export) için zemin temiz mi?

### 14. Önemli not

Bu iterasyon **additive** — schema version bump YOK (1.2 kalıyor). Sadece:
- Yeni dosyalar (`src/kb-profiles/*.mjs`)
- `compile()` dispatcher'a çevrildi
- `_metadata.profile` eklendi (backward compatible — eski tüketici bu alanı yok sayar)

Risk yüksek çünkü KB1 builder'ları taşınıyor. **Taşıma sırasında davranış değişikliği YOK** — sadece dosya hareketi ve arayüz uyumu. KB1 output'u byte-farklı olmamalı (sadece `_metadata.profile` alanı eklenir).

KB2 için yazılan regex'ler ilk seferde tutmayabilir. Bu normal — gerçek KB2 metninin yapısına göre düzelt. Asıl amaç **adapter pattern'i kanıtlamak**, her edge case'i çözmek değil.

---

Başla. Önce idea.md'nin yeni "KB profile adapter" bölümünü oku, sonra `src/kb-profiles/` dizinini oluştur, KB1 builder'larını `statistical-pre-post.mjs`'e taşı (davranış değişmeden), KB2 için `rct-comparison.mjs` yaz, `compile()` dispatcher'ı bağla, renderer'a bar chart ekle, iki KB'yi de test et, raporla.
