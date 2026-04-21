# İterasyon-13 — İkinci artifact: clinical-summary

> **Kullanım:** Bu dosyanın TAMAMINI mevcut Claude Code oturumuna tek mesaj olarak yapıştır.

---

## Bağlam

İterasyon-12'de Karpathy loop tamamlandı: lint sertleşti (iter-11 FAIL), body sadeleşti (iter-12 PASS). Mühendislik tarafı temiz, görsel render çalışıyor.

Üçüncü taraf değerlendirmesi (ChatGPT) hâlâ açık olan bir eleştiriye işaret ediyor:

> *"Single artifact trap. Idea diyor ki 'artifact family'. Ama senin sistem sadece graphical abstract üretiyor. Bu, idea.md'nin %50'sini çöpe atıyor. Studio-agent değil, artifact compiler v0."*

Bu eleştiri haklı. İdea.md "artifact ailesi" diyor, biz tek tipte kaldık. Bu iterasyon ikinci artifact tipi ekleyerek "studio-agent" iddiasının pratik kanıtını verir.

`idea.md` rafine edildi: **"İkinci artifact: clinical-summary (artifact ailesi iddiasını kanıtla)"** bölümü eklendi. Önce bu yeni bölümü oku.

---

## Bu iterasyonda yapılacaklar

### 1. Yeni artifact tipi — `clinical-summary`

`src/artifacts/clinical-summary.mjs` oluştur. Spec şablonu:

```javascript
import { findSection, parseMarkdownTable } from '../parser.mjs';
import { buildProvenance } from '../provenance.mjs';
import { runLint } from '../lint.mjs';
// ... helper'ları yeniden kullan (tokenize, extractNumericCoresWithContext, vb.)

export const spec = {
  type: 'clinical-summary',
  schema_version: '0.1',
  subdomain: 'medical-graphical-abstract',
  format: 'markdown-clinical-memo-v1',
  description: 'Klinisyen okuyucu için tek-sayfalık klinik özet markdown.',
  input_contract: {
    required_sections: ['genel-bilgiler'],
    required_any_of: ['bagimli-veri-analizi', 'bagimsiz-tek-grup-analizi'],
    preferred_sections: ['tanimlayici-istatistikler', 'kullanilan-istatistiksel-yontemler'],
  },
  output_format: 'markdown',
  human_in_loop: 'medium-risk',
  numeric_fields: [
    // Markdown bullet list veya inline metin içindeki sayılar
    { path: 'sections.findings[]', required: true, extract_numeric_core: true,
      context_window: { strategy: 'tokens', tokens_before: 2, tokens_after: 2,
        match_method: 'overlap', overlap_threshold: 0.5,
        kb_extended_radius: 5, all_matches: true, match_selection: 'best' } },
    { path: 'sections.design[]', required: true, extract_numeric_core: true, /* aynı */ },
  ],
  soft_trace_fields: [
    { path: 'sections.headline', severity: 'warning', extract_numeric_core: true, /* aynı */ },
  ],
  strict_lint: { reject_warnings: true },
  stale_rules: [
    'source.hash değişirse yeniden üretilmeli',
    'input_contract.required_sections değişirse yeniden derlenmeli',
  ],
};
```

### 2. compile() fonksiyonu — markdown çıktı yapısı

```javascript
export function compile(wiki) {
  const general = findSection(wiki, 'genel bilgiler', 'genel');
  const dependent = findSection(wiki, 'bagimli veri', 'bagimli');
  const independent = findSection(wiki, 'bagimsiz tek grup', 'bagimsiz');
  const descriptive = findSection(wiki, 'tanimlayici istatistikler');
  const methods = findSection(wiki, 'kullanilan istatistiksel yontemler');

  const headline = buildHeadline({ dependent, independent });
  const designBullets = buildDesignBullets({ general, descriptive, methods });
  const findingsBullets = buildFindingsBullets({ dependent, independent });
  const limitations = buildLimitations({ dependent });

  // Markdown payload — yapılandırılmış obje (lint için path'ler)
  const payload = {
    title: extractH1(wiki.preamble) ?? 'Knowledge Base Clinical Summary',
    sections: {
      headline,                  // tek cümle çıkarım
      design: designBullets,     // ["Örneklem: n=240, ...", ...]
      findings: findingsBullets, // ["%50.3 azalma (p<0.001)", ...]
      limitations,               // opsiyonel, KB'den çıkarılabilirse
    },
    sources: ['knowledge-base.md'],
  };

  // ... provenance + lint + render markdown ...

  // Render: yapılandırılmış payload → markdown string
  const md = renderClinicalSummaryMarkdown(payload, prov);

  artifact.rendered = md;
  return artifact;
}
```

### 3. Markdown render

```javascript
function renderClinicalSummaryMarkdown(payload, prov) {
  return `# ${payload.title}

**Tek cümle çıkarım:** ${payload.sections.headline}

## Çalışma Tasarımı
${payload.sections.design.map((b) => `- ${b}`).join('\n')}

## Bulgular
${payload.sections.findings.map((b) => `- ${b}`).join('\n')}

${payload.sections.limitations.length ? `## Sınırlamalar\n${payload.sections.limitations.map((b) => `- ${b}`).join('\n')}` : ''}

---

*Kaynak: ${payload.sources.join(', ')}*
*${prov.subdomain} · ${prov.format} · schema v${prov.schema_version} · ${prov.generated_at}*
`;
}
```

### 4. Registry'ye ekle

`src/artifacts/index.mjs`:

```javascript
import * as graphicalAbstract from './graphical-abstract.mjs';
import * as clinicalSummary from './clinical-summary.mjs';

export const registry = {
  'graphical-abstract': graphicalAbstract,
  'clinical-summary': clinicalSummary,
};
```

### 5. CLI dokunmaz — zaten generic

`bin/studio-agent.mjs` mevcut hâliyle birden fazla artifact'ı destekliyor (`--artifact` flag yoksa hepsini üretir). Ekstra iş gerekmez.

### 6. Test

```bash
# Hepsi
node bin/studio-agent.mjs compile --source knowledge-base.md --out output --render html

# Tek tek
node bin/studio-agent.mjs compile --source knowledge-base.md --artifact clinical-summary
node bin/studio-agent.mjs list  # iki tipi de göstermeli
```

Beklenti:
- `output/graphical-abstract.json` (mevcut)
- `output/graphical-abstract.html` (mevcut)
- `output/clinical-summary.md` (YENİ)
- `output/compile-report.json` (2 artifact'ı listeler)
- Lint: her iki artifact için PASS, exit 0

### 7. Hard fields lint kanıtı

clinical-summary'nin hard fields'larında halüsinasyon koruması test edilmeli:

- `sections.design[]` ve `sections.findings[]` içindeki tüm 2+ haneli sayılar KB'de doğrulanmalı
- Eğer agent body üretirken bir sayı uydursa → lint FAIL → exit 2

Bu doğrulama mevcut `numeric-fields-traceable` kuralını yeniden kullanır (tip bağımsız çalışıyor zaten). Ama `clinical-summary`'nin path'leri (`sections.findings[]`) farklı — `collectValuesAtPath()` bunu desteklemeli.

`collectValuesAtPath()`'ın mevcut implementasyonu `panels[].primary_number` gibi path'leri destekliyor. `sections.findings[]` benzer pattern (object.array). Test et, gerekirse helper'ı genişlet.

### 8. Markdown çıktı görseli

`output/clinical-summary.md` dosyasını VS Code'da açtığında preview ile görmeli (Ctrl+Shift+V). Markdown render edilmiş hâli klinisyen-okur olmalı.

### 9. Kısa rapor

İterasyon-13 sonunda yine kısa rapor:

- idea.md'nin yeni "İkinci artifact" bölümü yeterince netti mi?
- clinical-summary için aldığın schema kararları (sections, sources, headline) idea.md ile uyumlu mu?
- Lint altyapısı (numeric-fields-traceable) yeni path'lerle çalıştı mı? collectValuesAtPath'ı genişletmen gerekti mi?
- Markdown çıktı bir klinisyen-okur kalitesinde mi? (Senin gözünden — KB'deki bilgiyi okuyup kararına dökmek için yeterli mi?)
- compile-report.json artık 2 artifact'ı listeliyor mu?
- Studio-agent iddiası (artifact ailesi) bu iterasyon sonrası ne kadar somut?
- 14. iterasyon (writeback raporu) için zemin temiz mi?

### 10. Önemli not

Bu iterasyon **ChatGPT'nin "single artifact trap" eleştirisinin doğrudan cevabı.** Sonra hocaya gösterirken: *"İkinci artifact tipi ekledim, paylaşılan altyapı sayesinde 1 dosya + registry entry yetti. Studio-agent gerçek anlamda artifact ailesi üretiyor."* diyebilirsin.

Bu iterasyonun değer ölçütü: aynı KB'den 2 farklı artifact (görsel kart + klinik özet) üretilebilmesi. Eğer çıktı bunu sağlıyorsa "studio-agent" iddiası artık yarım değil.

---

Başla. Önce idea.md'nin yeni "İkinci artifact" bölümünü oku, sonra src/artifacts/clinical-summary.mjs yaz, registry'ye ekle, lint'in yeni path'lerle çalıştığını test et, hem normal compile hem tek artifact compile'ı çalıştır, markdown çıktıyı incele, raporla.
