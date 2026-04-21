import {
  findSection,
  parseMarkdownTable,
} from '../parser.mjs';
import { buildProvenance } from '../provenance.mjs';
import { runLint } from '../lint.mjs';

export const spec = {
  type: 'visual-abstract',
  schema_version: '0.1',
  description:
    'Infografik/visual abstract için JSON spesifikasyonu: hero metric, key messages, görsel önerileri.',
  input_contract: {
    required_sections: [
      'infografik-visual-abstract-icin-anahtar-mesajlar',
      'gorsel-onerileri',
    ],
    uses: ['genel-bilgiler', 'tanimlayici-istatistikler', 'bagimli-veri-analizi'],
  },
  output_format: 'json',
  human_in_loop: 'low-risk — otomatik publish edilebilir',
  stale_rules: [
    'source.hash değişirse yeniden üretilmeli',
    'key_messages veya görsel önerileri bölümleri değişirse yeniden derlenmeli',
  ],
};

const lintRules = [
  {
    id: 'key-messages-min-3',
    check: (a) =>
      (a.payload.key_messages?.length ?? 0) >= 3 || {
        error: `key_messages en az 3 olmalı (şu an: ${a.payload.key_messages?.length ?? 0})`,
      },
  },
  {
    id: 'visual-suggestions-min-3',
    check: (a) =>
      (a.payload.visual_suggestions?.length ?? 0) >= 3 || {
        error: `visual_suggestions en az 3 olmalı (şu an: ${a.payload.visual_suggestions?.length ?? 0})`,
      },
  },
  {
    id: 'hero-metric-complete',
    check: (a) => {
      const h = a.payload.hero_metric;
      if (!h) return { error: 'hero_metric eksik' };
      const missing = ['label', 'value', 'context'].filter((k) => !h[k]);
      if (missing.length)
        return {
          error: `hero_metric alan eksik: ${missing.join(', ')}`,
        };
      return true;
    },
  },
  {
    id: 'sample-size-known',
    check: (a) =>
      Number.isFinite(a.payload.sample_size) || {
        warning: 'sample_size türetilemedi',
      },
  },
  {
    id: 'each-visual-has-chart-type',
    check: (a) => {
      const missing = (a.payload.visual_suggestions ?? []).filter(
        (v) => !v.chart_type || !v.data,
      );
      if (missing.length)
        return {
          error: `${missing.length} görsel önerisinde chart_type veya data eksik`,
        };
      return true;
    },
  },
  {
    id: 'required-contract-resolved',
    check: (a) => {
      const unresolved = (a._meta.contract?.required ?? []).filter(
        (r) => !r.resolved_id,
      );
      if (unresolved.length)
        return {
          error: `Zorunlu kontrat anahtarı karşılanmadı: ${unresolved.map((u) => u.keyword).join(', ')}`,
        };
      return true;
    },
  },
];

export function compile(wiki) {
  const notes = [];
  const keyMessagesSection = findSection(
    wiki,
    'infografik visual abstract icin anahtar mesajlar',
    'anahtar mesajlar',
    'visual abstract',
  );
  const visualsSection = findSection(wiki, 'gorsel onerileri', 'gorsel');
  const general = findSection(wiki, 'genel bilgiler', 'genel');
  const descriptive = findSection(wiki, 'tanimlayici istatistikler', 'tanimlayici');
  const dependent = findSection(wiki, 'bagimli veri', 'bagimli');

  const keyMessages = extractKeyMessages(keyMessagesSection?.content ?? '');
  const visuals = extractVisuals(visualsSection?.content ?? '');
  const sampleSize = extractSampleSize(general?.content ?? '');
  const heroMetric = buildHeroMetric(dependent?.content ?? '');

  if (keyMessages.length === 0) {
    notes.push('Anahtar mesajlar listesi bölümden ayrıştırılamadı.');
  }
  if (visuals.length === 0) {
    notes.push('Görsel önerileri tablosu ayrıştırılamadı.');
  }

  const resolved = [
    { keyword: 'anahtar-mesajlar', section: keyMessagesSection, role: 'required' },
    { keyword: 'gorsel-onerileri', section: visualsSection, role: 'required' },
    { keyword: 'genel-bilgiler', section: general, role: 'supporting' },
    { keyword: 'tanimlayici-istatistikler', section: descriptive, role: 'supporting' },
    { keyword: 'bagimli-veri-analizi', section: dependent, role: 'supporting' },
  ];
  const sectionIds = resolved
    .filter((r) => r.section)
    .map((r) => r.section.id);

  const prov = buildProvenance({
    wiki,
    artifactType: spec.type,
    schemaVersion: spec.schema_version,
    sectionIds: uniq(sectionIds),
    notes,
  });
  prov.contract = {
    required: resolved
      .filter((r) => r.role === 'required')
      .map((r) => ({
        keyword: r.keyword,
        resolved_id: r.section?.id ?? null,
      })),
    supporting: resolved
      .filter((r) => r.role === 'supporting')
      .map((r) => ({
        keyword: r.keyword,
        resolved_id: r.section?.id ?? null,
      })),
  };

  const payload = {
    title: 'İstatistiksel Analiz — Visual Abstract',
    sample_size: sampleSize,
    hero_metric: heroMetric,
    key_messages: keyMessages,
    visual_suggestions: visuals,
    design_hints: {
      palette: ['#0F4C81', '#E63946', '#F1FAEE', '#457B9D'],
      emphasis: 'hero_metric üstte, key_messages sağda, visuals altta grid olarak yerleştirilebilir.',
    },
  };

  const artifact = {
    _meta: prov,
    payload,
    type: spec.type,
  };

  const lint = runLint(lintRules, artifact);
  artifact._meta.lint = lint;

  artifact.rendered = JSON.stringify(
    { _metadata: artifact._meta, ...payload },
    null,
    2,
  );

  return artifact;
}

function extractKeyMessages(text) {
  const out = [];
  const re = /^\s*(\d+)\.\s+\*\*([^*]+?):\*\*\s*(.+?)\s*$/gm;
  for (const m of text.matchAll(re)) {
    out.push({
      rank: Number(m[1]),
      label: m[2].trim(),
      text: m[3].trim(),
    });
  }
  return out;
}

function extractVisuals(text) {
  const tables = parseMarkdownTable(text);
  if (!tables.length) return [];
  const rows = tables[0].rows;
  return rows.map((r) => {
    const data = r['Veri / Bulgu'] || r['Veri/Bulgu'] || r[Object.keys(r)[0]];
    const chart = r['Uygun Görsel Tipi'] || r[Object.keys(r)[1]];
    return {
      data: data?.trim() ?? '',
      chart_type: chart?.trim() ?? '',
      rationale: `"${data}" verisi "${chart}" ile en iyi iletilir.`,
    };
  });
}

function extractSampleSize(text) {
  const m = text.match(/\*\*n\s*=\s*(\d+)\*\*/);
  return m ? Number(m[1]) : null;
}

function buildHeroMetric(dependentContent) {
  // Defaults derived from Rapor 3 structure — idempotent if the content matches.
  const pcnt = dependentContent.match(/%(\d+(?:\.\d+)?)\s*azal/);
  const effect = dependentContent.match(/Etki Büyüklüğü\s*\(r\)\s*\|\s*\*{0,2}(-?\d+\.\d+)\*{0,2}/);
  const pVal = dependentContent.match(/p\s*değeri\s*\|\s*\*{0,2}([<>=]?\s*\d[\d.]*)\*{0,2}/);

  return {
    label: 'Zaman 1 → Zaman 2 Ortanca Düşüş',
    value: pcnt ? `-%${pcnt[1]}` : null,
    context: [
      pVal ? `Wilcoxon p ${pVal[1].trim()}` : null,
      effect ? `r = ${effect[1]} (büyük etki)` : null,
    ]
      .filter(Boolean)
      .join(' • '),
  };
}

function uniq(arr) {
  return [...new Set(arr)];
}
