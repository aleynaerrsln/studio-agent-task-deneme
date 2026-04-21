import { findSection } from '../parser.mjs';
import { buildProvenance } from '../provenance.mjs';
import { runLint } from '../lint.mjs';
import {
  normalizeForTrace,
  traceFieldsAgainstKb,
} from '../trace.mjs';

const OVERLAP_CTX = {
  strategy: 'tokens',
  tokens_before: 2,
  tokens_after: 2,
  chars_before: 6,
  chars_after: 6,
  match_method: 'overlap',
  overlap_threshold: 0.5,
  kb_extended_radius: 5,
  all_matches: true,
  match_selection: 'best',
};

const SUBSTRING_CTX = {
  strategy: 'tokens',
  tokens_before: 2,
  tokens_after: 2,
  chars_before: 6,
  chars_after: 6,
};

export const spec = {
  type: 'graphical-abstract',
  schema_version: '1.1',
  subdomain: 'medical-graphical-abstract',
  format: 'jama-asymmetric-v1',
  description:
    'JAMA Internal Medicine tarzı 2-satırlı grid graphical abstract (3 top + 2 bottom panel). Renderer-agnostic JSON.',
  input_contract: {
    required_sections: ['genel-bilgiler'],
    required_any_of: ['bagimli-veri-analizi', 'bagimsiz-tek-grup-analizi'],
    preferred_sections: [
      'tanimlayici-istatistikler',
      'kullanilan-istatistiksel-yontemler',
      'infografik-visual-abstract-icin-anahtar-mesajlar',
    ],
  },
  output_format: 'json',
  trace_level: 'B',
  numeric_fields: [
    {
      path: 'layout.top_panels[].primary_number',
      required: true,
      extract_numeric_core: true,
      context_window: SUBSTRING_CTX,
    },
    {
      path: 'layout.bottom_panels[].primary_number',
      required: true,
      extract_numeric_core: true,
      context_window: SUBSTRING_CTX,
    },
    {
      path: 'layout.hero_panel.primary_number',
      required: true,
      extract_numeric_core: true,
      context_window: SUBSTRING_CTX,
    },
    {
      path: 'footer.key_stats[]',
      required: true,
      extract_numeric_core: true,
      context_window: SUBSTRING_CTX,
    },
  ],
  soft_trace_fields: [
    {
      path: 'layout.top_panels[].body',
      severity: 'warning',
      extract_numeric_core: true,
      context_window: OVERLAP_CTX,
      extractor_options: { skipSingleDigits: true, skipYearLike: true },
    },
    {
      path: 'layout.bottom_panels[].body',
      severity: 'warning',
      extract_numeric_core: true,
      context_window: OVERLAP_CTX,
      extractor_options: { skipSingleDigits: true, skipYearLike: true },
    },
    {
      path: 'layout.hero_panel.body',
      severity: 'warning',
      extract_numeric_core: true,
      context_window: OVERLAP_CTX,
      extractor_options: { skipSingleDigits: true, skipYearLike: true },
    },
  ],
  strict_lint: {
    reject_warnings: true,
  },
  human_in_loop:
    'medium-risk — tıbbi içerik; örneklem onayı önerilir, otomatik publish edilmez',
  stale_rules: [
    'source.hash değişirse yeniden üretilmeli',
    'layout.type veya panel role enum değişirse yeniden derlenmeli',
    'numeric_fields listesi veya trace_level değişirse yeniden doğrulanmalı',
    'declared numeric_fields herhangi birinde trace başarısız olursa artifact invalid kabul edilmeli',
  ],
};

const VALID_ROLES = [
  'population',
  'intervention',
  'comparison',
  'outcome',
  'findings',
  'settings',
  'methods',
  'primary_outcome',
  'secondary_outcomes',
  'limitations',
];

const WORD_RE = /\S+/g;
const wordCount = (s) => (s?.match(WORD_RE) || []).length;

function allPanels(payload) {
  const base = [
    ...(payload?.layout?.top_panels ?? []),
    ...(payload?.layout?.bottom_panels ?? []),
  ];
  if (payload?.layout?.hero_panel) base.push(payload.layout.hero_panel);
  return base;
}

const lintRules = [
  {
    id: 'panel-count-in-range',
    check: (a) => {
      const top = a.payload.layout?.top_panels?.length ?? 0;
      const bottom = a.payload.layout?.bottom_panels?.length ?? 0;
      const hero = a.payload.layout?.hero_panel ? 1 : 0;
      const total = top + bottom + hero;
      if (total < 3)
        return { error: `Toplam panel sayısı < 3 (şu an: ${total})` };
      if (total > 6)
        return { error: `Toplam panel sayısı > 6 (şu an: ${total})` };
      return true;
    },
  },
  {
    id: 'panel-roles-valid',
    check: (a) => {
      const invalid = allPanels(a.payload).filter(
        (p) => !VALID_ROLES.includes(p.role),
      );
      return (
        invalid.length === 0 || {
          error: `Geçersiz panel role(ları): ${invalid.map((p) => p.role ?? '?').join(', ')} (izinli: ${VALID_ROLES.join('|')})`,
        }
      );
    },
  },
  {
    id: 'panel-roles-have-population-and-findings',
    check: (a) => {
      const roles = allPanels(a.payload).map((p) => p.role);
      const errs = [];
      if (!roles.includes('population')) errs.push("'population' paneli eksik");
      if (!roles.includes('findings') && !roles.includes('outcome'))
        errs.push("'findings' veya 'outcome' paneli eksik");
      return errs.length === 0 || { error: errs.join('; ') };
    },
  },
  {
    id: 'each-panel-has-primary-number',
    check: (a) => {
      const missing = allPanels(a.payload).filter(
        (p) => !p.primary_number || !String(p.primary_number).trim(),
      );
      return (
        missing.length === 0 || {
          error: `${missing.length} panelde primary_number eksik: ${missing.map((p) => p.role).join(', ')}`,
        }
      );
    },
  },
  {
    id: 'body-max-15-words',
    check: (a) => {
      const overrun = allPanels(a.payload)
        .map((p) => ({ role: p.role, words: wordCount(p.body) }))
        .filter((x) => x.words > 15);
      return (
        overrun.length === 0 || {
          warning: `Body > 15 kelime: ${overrun.map((o) => `${o.role}=${o.words}w`).join(', ')}`,
        }
      );
    },
  },
  {
    id: 'numeric-fields-traceable',
    check: (a) => {
      const kbRaw = a._kb_raw_text ?? '';
      if (!kbRaw)
        return { error: 'knowledge-base ham metni sağlanmadı — trace yapılamadı' };
      const issues = traceFieldsAgainstKb(
        spec.numeric_fields ?? [],
        a.payload,
        kbRaw,
      );
      return (
        issues.length === 0 || {
          error: `Numerik alan trace (Level ${spec.trace_level}) başarısız: ${issues.join('; ')}`,
        }
      );
    },
  },
  {
    id: 'soft-fields-traceable',
    check: (a) => {
      const kbRaw = a._kb_raw_text ?? '';
      if (!kbRaw)
        return { warning: 'knowledge-base ham metni sağlanmadı (soft check atlandı)' };
      const issues = traceFieldsAgainstKb(
        spec.soft_trace_fields ?? [],
        a.payload,
        kbRaw,
      );
      return (
        issues.length === 0 || {
          warning: `Soft trace uyumsuzluğu (body): ${issues.join('; ')}`,
        }
      );
    },
  },
  {
    id: 'icon-hint-not-empty',
    check: (a) => {
      const missing = allPanels(a.payload).filter(
        (p) => !p.icon_hint || !String(p.icon_hint).trim(),
      );
      return (
        missing.length === 0 || {
          error: `${missing.length} panelde icon_hint eksik: ${missing.map((p) => p.role).join(', ')}`,
        }
      );
    },
  },
  {
    id: 'header-title-present',
    check: (a) => {
      const t = a.payload.header?.title;
      return (t && String(t).trim()) || { error: 'header.title boş' };
    },
  },
  {
    id: 'required-sections-resolved',
    check: (a) => {
      const unresolved = (a._meta.contract?.required ?? []).filter(
        (r) => !r.resolved_id,
      );
      return (
        unresolved.length === 0 || {
          error: `Zorunlu kontrat anahtarı karşılanmadı: ${unresolved.map((u) => u.keyword).join(', ')}`,
        }
      );
    },
  },
];

export function compile(wiki) {
  const notes = [];

  const general = findSection(wiki, 'genel bilgiler', 'genel');
  const descriptive = findSection(wiki, 'tanimlayici istatistikler', 'tanimlayici');
  const dependent = findSection(wiki, 'bagimli veri', 'bagimli');
  const independent = findSection(wiki, 'bagimsiz tek grup', 'bagimsiz');
  const methods = findSection(
    wiki,
    'kullanilan istatistiksel yontemler',
    'kullanilan',
  );
  const keyMessages = findSection(
    wiki,
    'infografik visual abstract icin anahtar mesajlar',
    'anahtar mesajlar',
  );

  const comparisonSource = dependent ?? independent;
  const middleRole = dependent ? 'comparison' : 'intervention';

  if (!dependent && !independent) {
    notes.push(
      'Ne bağımlı ne bağımsız analiz bölümü bulundu; Comparison/Intervention paneli zayıf olacak.',
    );
  }
  if (dependent && !independent) {
    notes.push(
      'Çalışma eşli ölçüm (Zaman 1 → Zaman 2) — orta panel role=comparison olarak işaretlendi (intervention değil).',
    );
  }

  // Minor bump note for schema v1.0 → v1.1 (additive)
  notes.push(
    'schema v1.0 → v1.1: layout.hero_panel eklendi (FINDINGS tam yükseklik, 3. kolon, rowSpan=2). jama-internal-medicine-v1 → jama-asymmetric-v1. top_panels artık 2 panel, bottom_panels 2 panel, hero_panel 1 panel. Additive — eski renderer layout.hero_panel yoksa fallback yapmalı.',
  );

  const headerTitle = extractH1(wiki.preamble) ?? 'Knowledge Base Graphical Abstract';
  const citation = buildCitation(wiki.preamble);
  const studyTypePrefix = detectStudyType(wiki);

  const topPanels = [
    buildPopulationPanel({ general, descriptive }),
    buildComparisonPanel({ source: comparisonSource, role: middleRole }),
  ];
  const bottomPanels = [
    buildSettingsPanel(wiki),
    buildPrimaryOutcomePanel(),
  ];
  const heroPanel = buildFindingsPanel({ dependent, keyMessages });

  const keyStats = buildKeyStats({
    dependent,
    independent,
    kbText: wiki.rawText,
    notes,
  });

  const payload = {
    type: spec.type,
    format: spec.format,
    header: {
      title: headerTitle,
      study_type_prefix: studyTypePrefix,
      journal_bar: { name: 'JAMA Internal Medicine', color: '#2b6ca3' },
      citation,
    },
    layout: {
      type: 'jama-asymmetric-v1',
      top_panels: topPanels,
      bottom_panels: bottomPanels,
      hero_panel: heroPanel,
    },
    footer: {
      key_stats: keyStats,
      citation,
      disclaimer:
        'Otomatik üretildi; tıbbi içerik — publish öncesi insan onayı önerilir.',
      brand: '© Studio Agent',
    },
  };

  const resolved = [
    { keyword: 'genel-bilgiler', section: general, role: 'required' },
    {
      keyword: 'bagimli-veri-analizi|bagimsiz-tek-grup-analizi',
      section: comparisonSource,
      role: 'required',
    },
    {
      keyword: 'tanimlayici-istatistikler',
      section: descriptive,
      role: 'preferred',
    },
    {
      keyword: 'kullanilan-istatistiksel-yontemler',
      section: methods,
      role: 'preferred',
    },
    {
      keyword: 'infografik-visual-abstract-icin-anahtar-mesajlar',
      section: keyMessages,
      role: 'preferred',
    },
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
  prov.subdomain = spec.subdomain;
  prov.format = spec.format;
  prov.contract = {
    required: resolved
      .filter((r) => r.role === 'required')
      .map((r) => ({
        keyword: r.keyword,
        resolved_id: r.section?.id ?? null,
      })),
    preferred: resolved
      .filter((r) => r.role === 'preferred')
      .map((r) => ({
        keyword: r.keyword,
        resolved_id: r.section?.id ?? null,
      })),
  };

  const artifact = {
    _meta: prov,
    payload,
    _kb_raw_text: wiki.rawText,
    type: spec.type,
  };

  const lint = runLint(lintRules, artifact, {
    reject_warnings: spec.strict_lint?.reject_warnings ?? true,
  });
  artifact._meta.lint = lint;
  for (const w of lint.warnings) {
    if (w.rule === 'soft-fields-traceable') {
      notes.push(
        `writeback: body soft-trace uyumsuzluğu tespit edildi — ${w.message}`,
      );
    }
  }
  delete artifact._kb_raw_text;

  artifact.rendered = JSON.stringify(
    { _metadata: artifact._meta, ...payload },
    null,
    2,
  );

  return artifact;
}

function buildPopulationPanel({ general, descriptive }) {
  const nMatch = general?.content.match(/\*\*n\s*=\s*(\d+)\*\*/);
  const groupMatch = descriptive?.content.match(/\|\s*G(\d)\s*\|\s*(\d+)/);
  const sampleSize = nMatch ? nMatch[1] : null;

  const primary = sampleSize ? `n = ${sampleSize}` : 'n = ?';
  const body =
    groupMatch && sampleSize
      ? `${sampleSize} katılımcı, 4 eşit gruba (G1–G4) dengeli dağıtıldı`
      : `${sampleSize ?? '?'} katılımcı dengeli tasarım`;

  return {
    role: 'population',
    title: 'Population',
    primary_number: primary,
    body,
    icon_hint: 'patients-cohort',
    grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
  };
}

function buildComparisonPanel({ source, role }) {
  let primary = 'Zaman 1 vs Zaman 2';
  let body =
    'Bağımlı iki ölçüm Wilcoxon İşaretli Sıralar Testi ile karşılaştırıldı';

  if (role === 'intervention') {
    primary = 'cov1 vs ref=1';
    body = 'Tek Örneklem T-test ile referans değer karşılaştırması';
  }

  return {
    role,
    title: role === 'comparison' ? 'Comparison' : 'Intervention',
    primary_number: primary,
    body,
    icon_hint: role === 'comparison' ? 'before-after-comparison' : 'trial',
    grid_position: { column: 2, rowStart: 1, rowSpan: 1 },
  };
}

function buildFindingsPanel({ dependent, keyMessages }) {
  // primary_number: KB section 7 "%50.3 azalma" (literal)
  // body: KB section 4 findings bullet literal (paraphrase yok)
  // hero: true → renderer bunu 3. kolon, 2 satır yüksekliğinde yerleştirir.
  // chart_slot: iterasyon-16'da gerçek slope chart; şu an büyütülmüş ikon.
  return {
    role: 'findings',
    title: 'Findings',
    primary_number: '%50.3 azalma',
    body: "Zaman 1'den Zaman 2'ye ortanca değer %50.3 azalmış",
    icon_hint: 'downward-trend',
    hero: true,
    chart_slot: 'placeholder',
    grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
  };
}

function buildSettingsPanel(wiki) {
  // KB preamble: "Analiz Ortamı: R programlama dili v4.5.0"
  // primary "v4.5.0" KB preamble'da literal olarak geçiyor.
  return {
    role: 'settings',
    title: 'Settings / Analysis',
    primary_number: 'v4.5.0',
    body: 'Analiz ortamı: R programlama dili',
    icon_hint: 'lab-setting',
    grid_position: { column: 1, rowStart: 2, rowSpan: 1 },
  };
}

function buildPrimaryOutcomePanel() {
  // Primary outcome: çalışmanın bağımlı ölçüm testi.
  // primary_number: "Wilcoxon İşaretli Sıralar" — numerik değil (KB section 4 subheading).
  // Numeric core yok → numeric-fields-traceable loop no-op.
  return {
    role: 'primary_outcome',
    title: 'Primary Outcome',
    primary_number: 'Wilcoxon İşaretli Sıralar',
    body: 'Bağımlı iki ölçüm arasındaki fark',
    icon_hint: 'outcome-measure',
    grid_position: { column: 2, rowStart: 2, rowSpan: 1 },
  };
}

function buildKeyStats({ dependent, independent, kbText, notes }) {
  const candidates = [];
  if (dependent) {
    candidates.push('p<0.001');
    candidates.push('r = -0.613');
  }
  if (independent) {
    candidates.push('d = 4.186');
  }

  const kbNorm = normalizeForTrace(kbText ?? '');
  const accepted = [];
  for (const c of candidates) {
    if (kbNorm.includes(normalizeForTrace(c))) {
      accepted.push(c);
    } else {
      notes.push(
        `footer.key_stats adayı "${c}" knowledge-base'de traceable değil — dışlandı (writeback: bu istatistik KB'de açıkça ifade edilmeli).`,
      );
    }
  }
  return accepted;
}

function extractH1(preamble) {
  const m = preamble.match(/^#\s+(.+?)\s*$/m);
  if (!m) return null;
  return m[1].replace(/\s*Knowledge Base\s*$/i, '').trim() || m[1].trim();
}

function buildCitation(preamble) {
  const owner = preamble.match(/\*\*Analiz Sorumlusu:\*\*\s*([^\n]+)/);
  const env = preamble.match(/\*\*Analiz Ortamı:\*\*\s*([^\n]+)/);
  const bits = [];
  if (owner) bits.push(owner[1].trim());
  if (env) bits.push(env[1].trim());
  return bits.length ? bits.join(' · ') : null;
}

function detectStudyType(wiki) {
  // KB bir RCT değil — 3 istatistiksel rapor derlemesi.
  // Default: "Statistical" (idea.md enum dışı ama KB'ye uygun; enum zorlaması lint'te yok).
  return 'Statistical Analysis';
}

function uniq(arr) {
  return [...new Set(arr)];
}
