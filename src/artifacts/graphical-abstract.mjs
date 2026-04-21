import { buildProvenance } from '../provenance.mjs';
import { runLint } from '../lint.mjs';
import { traceFieldsAgainstKb } from '../trace.mjs';
import { detectKbProfile, loadProfile } from '../kb-profiles/index.mjs';
import { extractWithLLM } from '../llm/extract.mjs';
import { hasAnyProvider } from '../llm/router.mjs';
import { detectJournal, resolveJournalColor } from '../journal-detect.mjs';
import { ICON_LIBRARY, isKnownIcon } from '../renderer/icons.mjs';
import { provenanceBindingRule } from '../provenance-lint.mjs';

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
  schema_version: '2.0',
  subdomain: 'medical-graphical-abstract',
  format: 'jama-asymmetric-v1',
  description:
    'JAMA-style 2-satır asimetrik grid graphical abstract, KB profile adapter ile çoklu KB tipini destekler.',
  input_contract: {
    // required_sections compile-time'da profile'dan türetilir (profile.required_sections).
    // Buradaki değerler dokümantasyon + list komutu için.
    required_sections: ['genel-bilgiler'],
    preferred_sections: [
      'tanimlayici-istatistikler',
      'kullanilan-istatistiksel-yontemler',
      'primary-endpoint',
      'infografik-visual-abstract-icin-anahtar-mesajlar',
    ],
    note: 'Her KB profili kendi required_sections listesini sağlar (src/kb-profiles/).',
  },
  output_format: 'json',
  trace_level: 'B',
  numeric_fields: [
    { path: 'layout.top_panels[].primary_number', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.top_panels[].arms[].n', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.top_panels[].gender_breakdown.male', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.top_panels[].gender_breakdown.female', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.bottom_panels[].primary_number', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.hero_panel.primary_number', required: true, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.top_panels[].secondary_numbers[].value', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.bottom_panels[].secondary_numbers[].value', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.hero_panel.secondary_numbers[].value', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.hero_panel.chart.data.points[].value', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.hero_panel.chart.data.series[].values[]', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
    { path: 'layout.hero_panel.chart.data.groups[].value', required: false, extract_numeric_core: true, context_window: SUBSTRING_CTX },
  ],
  soft_trace_fields: [
    { path: 'layout.top_panels[].body', severity: 'warning', extract_numeric_core: true, context_window: OVERLAP_CTX, extractor_options: { skipSingleDigits: true, skipYearLike: true } },
    { path: 'layout.top_panels[].condition', severity: 'warning', extract_numeric_core: false, context_window: OVERLAP_CTX, extractor_options: { skipSingleDigits: true, skipYearLike: true } },
    { path: 'layout.top_panels[].eligibility_summary', severity: 'warning', extract_numeric_core: true, context_window: OVERLAP_CTX, extractor_options: { skipSingleDigits: true, skipYearLike: true } },
    { path: 'layout.top_panels[].age_summary', severity: 'warning', extract_numeric_core: true, context_window: OVERLAP_CTX, extractor_options: { skipSingleDigits: true, skipYearLike: true } },
    { path: 'layout.top_panels[].arms[].dose', severity: 'warning', extract_numeric_core: true, context_window: OVERLAP_CTX, extractor_options: { skipSingleDigits: true, skipYearLike: true } },
    { path: 'layout.bottom_panels[].body', severity: 'warning', extract_numeric_core: true, context_window: OVERLAP_CTX, extractor_options: { skipSingleDigits: true, skipYearLike: true } },
    { path: 'layout.hero_panel.body', severity: 'warning', extract_numeric_core: true, context_window: OVERLAP_CTX, extractor_options: { skipSingleDigits: true, skipYearLike: true } },
  ],
  strict_lint: {
    reject_warnings: true,
  },
  human_in_loop:
    'medium-risk — tıbbi içerik; örneklem onayı önerilir, otomatik publish edilmez',
  stale_rules: [
    'source.hash değişirse yeniden üretilmeli',
    'KB profili değişirse (detectKbProfile farklı id döndürürse) yeniden derlenmeli',
    'profile adapter içindeki builder davranışı değişirse yeniden doğrulanmalı',
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

function collectAllIconHints(payload) {
  const hints = [];
  for (const p of allPanels(payload)) {
    if (p?.icon_hint) hints.push(p.icon_hint);
    if (Array.isArray(p?.arms)) {
      for (const a of p.arms) if (a?.icon_hint) hints.push(a.icon_hint);
    }
  }
  return hints;
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
    id: 'each-panel-has-primary-or-arms',
    check: (a) => {
      const missing = allPanels(a.payload).filter((p) => {
        const hasPrimary =
          p.primary_number != null && String(p.primary_number).trim();
        const hasArms = Array.isArray(p.arms) && p.arms.length > 0;
        return !hasPrimary && !hasArms;
      });
      return (
        missing.length === 0 || {
          error: `${missing.length} panelde primary_number veya arms[] eksik: ${missing.map((p) => p.role).join(', ')}`,
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
    id: 'icon-hint-present',
    check: (a) => {
      // Panel-level icon_hint yoksa ama arms[] varsa OK (arms kendi icon_hint'ini taşır).
      const missing = allPanels(a.payload).filter((p) => {
        const hasOwn = p.icon_hint && String(p.icon_hint).trim();
        const hasArms = Array.isArray(p.arms) && p.arms.length > 0;
        return !hasOwn && !hasArms;
      });
      return (
        missing.length === 0 || {
          error: `${missing.length} panelde icon_hint veya arms[] eksik: ${missing.map((p) => p.role).join(', ')}`,
        }
      );
    },
  },
  {
    id: 'icon-hint-in-library',
    check: (a) => {
      const hints = collectAllIconHints(a.payload);
      const invalid = hints.filter((h) => !isKnownIcon(h));
      return (
        invalid.length === 0 || {
          error: `Geçersiz icon_hint (icon library'de yok): ${[...new Set(invalid)].join(', ')}`,
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
  provenanceBindingRule,
];

function resolveKeyword(wiki, keywordExpr) {
  // Supports "a|b" alternatives; returns first matching section.
  const alts = keywordExpr.split('|');
  for (const alt of alts) {
    const sec = wiki.findSection(alt, alt.replace(/-/g, ' '));
    if (sec) return sec;
  }
  return null;
}

function extractH1(preamble) {
  const m = preamble.match(/^#\s+(.+?)\s*$/m);
  if (!m) return null;
  return (
    m[1]
      .replace(/\s*Knowledge Base\s*$/i, '')
      .trim() || m[1].trim()
  );
}

function asBuilderResult(r) {
  // Backward-compat: eski profil fn'ları düz payload döndürüyor olabilir
  if (r && typeof r === 'object' && 'payload' in r && 'provenance' in r) {
    return r;
  }
  return { payload: r, provenance: {} };
}

function mergeProvenance(target, prefix, subProv) {
  if (!subProv) return;
  for (const [k, v] of Object.entries(subProv)) {
    target[`${prefix}.${k}`] = v;
  }
}

function buildPayloadRuleBased(wiki, profile) {
  const popRes = asBuilderResult(profile.buildPopulation?.(wiki));
  const interRes = asBuilderResult(profile.buildIntervention?.(wiki));
  const settingsRes = asBuilderResult(profile.buildSettings?.(wiki));
  const primaryRes = asBuilderResult(profile.buildPrimaryOutcome?.(wiki));
  const findingsRes = asBuilderResult(profile.buildFindings?.(wiki));

  const topPanels = [popRes.payload, interRes.payload].filter(Boolean);
  const bottomPanels = [settingsRes.payload, primaryRes.payload].filter(Boolean);
  const heroPanel = findingsRes.payload ?? null;

  // Header extraction + provenance
  const preamble = wiki.preamble ?? '';
  const h1Match = preamble.match(/^#\s+(.+?)\s*$/m);
  const headerTitle = h1Match ? h1Match[1].replace(/\s*Knowledge Base\s*$/i, '').trim() || h1Match[1].trim() : null;

  // Journal detect — KB'de "JAMA Xxx" literal yoksa fallback "Medical Journal" (derived).
  const journalScope = preamble + '\n' + wiki.rawText.slice(0, 2000);
  const journalNameMatch = journalScope.match(/JAMA(?:\s+\w+(?:\s+\w+)?)?/);
  const journal = detectJournal(journalScope);
  const journalIsDerived = !journalNameMatch || journal.name === 'Medical Journal';

  // Citation
  const citationRes = profile.buildCitation?.(preamble) ?? null;
  const citation = citationRes && typeof citationRes === 'object'
    ? citationRes.value
    : citationRes;
  const citationProv = citationRes && typeof citationRes === 'object'
    ? citationRes.provenance
    : null;

  const payload = {
    type: spec.type,
    format: spec.format,
    header: {
      title: headerTitle,
      study_type_prefix: profile.study_type_prefix,
      journal_bar: journal,
      citation,
    },
    layout: {
      type: 'jama-asymmetric-v1',
      top_panels: topPanels,
      bottom_panels: bottomPanels,
      hero_panel: heroPanel,
    },
    footer: {
      citation,
      disclaimer:
        'Otomatik üretildi; tıbbi içerik — publish öncesi insan onayı önerilir.',
      brand: '© Studio Agent',
    },
  };

  // Provenance birleştirme — profile'dan gelen path'leri panel prefix'iyle yaz
  const provenance = {};

  // Header
  if (headerTitle && h1Match) {
    provenance['header.title'] = {
      source_quote: h1Match[0],
      kb_section: 'preamble',
    };
  }
  if (journalIsDerived) {
    provenance['header.journal_bar.name'] = {
      source_quote: '',
      kb_section: 'derived',
    };
  } else if (journal?.name && journalNameMatch) {
    provenance['header.journal_bar.name'] = {
      source_quote: journalNameMatch[0],
      kb_section: 'preamble',
    };
  }
  provenance['header.study_type_prefix'] = { source_quote: '', kb_section: 'derived' };
  if (citation && citationProv) {
    provenance['header.citation'] = citationProv;
    provenance['footer.citation'] = citationProv;
  }

  // Panels
  mergeProvenance(provenance, 'layout.top_panels[0]', popRes.provenance);
  mergeProvenance(provenance, 'layout.top_panels[1]', interRes.provenance);
  mergeProvenance(provenance, 'layout.bottom_panels[0]', settingsRes.provenance);
  mergeProvenance(provenance, 'layout.bottom_panels[1]', primaryRes.provenance);
  mergeProvenance(provenance, 'layout.hero_panel', findingsRes.provenance);

  return { payload, provenance };
}

// LLM payload completeness: fill in renderer-expected fields the LLM may
// omit (journal_bar colors, grid_position, disclaimer, footer.brand).
function hydrateLlmPayload(raw, wiki) {
  const p = { ...raw };
  p.type = spec.type;
  p.format = spec.format;

  p.header = p.header ?? {};
  // LLM sets journal_bar.name. We resolve color from registry, or auto-detect
  // from KB if name is missing.
  if (!p.header.journal_bar || !p.header.journal_bar.name) {
    p.header.journal_bar = detectJournal(
      (wiki?.preamble ?? '') + '\n' + (wiki?.rawText ?? '').slice(0, 2000),
    );
  } else {
    p.header.journal_bar = resolveJournalColor(p.header.journal_bar.name);
  }
  if (!p.header.study_type_prefix) {
    p.header.study_type_prefix = 'Study';
  }

  p.layout = p.layout ?? {};
  p.layout.type = p.layout.type ?? 'jama-asymmetric-v1';
  p.layout.top_panels = (p.layout.top_panels ?? []).map((panel, i) => ({
    ...panel,
    grid_position: panel.grid_position ?? {
      column: i + 1,
      rowStart: 1,
      rowSpan: 1,
    },
  }));
  p.layout.bottom_panels = (p.layout.bottom_panels ?? []).map((panel, i) => ({
    ...panel,
    grid_position: panel.grid_position ?? {
      column: i + 1,
      rowStart: 2,
      rowSpan: 1,
    },
  }));
  if (p.layout.hero_panel) {
    p.layout.hero_panel = {
      ...p.layout.hero_panel,
      hero: true,
      grid_position: p.layout.hero_panel.grid_position ?? {
        column: 3,
        rowStart: 1,
        rowSpan: 2,
      },
      chart_slot:
        p.layout.hero_panel.chart_slot ??
        (p.layout.hero_panel.chart?.type ?? 'placeholder'),
    };
    // Series labels — LLM sometimes omits them; derive from intervention.arms
    const series = p.layout.hero_panel.chart?.data?.series;
    if (Array.isArray(series)) {
      const armLabels = p.layout.top_panels
        ?.flatMap((t) => (Array.isArray(t?.arms) ? t.arms.map((a) => a.label) : []))
        ?.filter(Boolean) ?? [];
      p.layout.hero_panel.chart.data.series = series.map((s, i) => ({
        ...s,
        label: s.label ?? armLabels[i] ?? `Series ${i + 1}`,
        accent: s.accent ?? (i === 0),
      }));
    }
  }

  p.footer = p.footer ?? {};
  p.footer.disclaimer =
    p.footer.disclaimer ??
    'Otomatik üretildi; tıbbi içerik — publish öncesi insan onayı önerilir.';
  p.footer.brand = p.footer.brand ?? '© Studio Agent';

  return p;
}

function buildContract(wiki, profile) {
  const resolvedRequired = (profile.required_sections ?? []).map((keyword) => {
    const sec = resolveKeyword(wiki, keyword);
    return { keyword, resolved_id: sec?.id ?? null };
  });
  const resolvedPreferred = (profile.preferred_sections ?? []).map(
    (keyword) => {
      const sec = resolveKeyword(wiki, keyword);
      return { keyword, resolved_id: sec?.id ?? null };
    },
  );
  return { resolvedRequired, resolvedPreferred };
}

function validatePayload(payload, contract, kbRaw, provenance, wiki) {
  const shell = {
    _meta: {
      contract: { required: contract.resolvedRequired, preferred: contract.resolvedPreferred },
      provenance: provenance ?? {},
    },
    payload,
    _kb_raw_text: kbRaw,
    _wiki: wiki,
  };
  return runLint(lintRules, shell, {
    reject_warnings: spec.strict_lint?.reject_warnings ?? true,
  });
}

export async function compile(wiki, options = {}) {
  const mode = options.mode ?? 'llm';
  const notes = [];

  // Always detect the KB profile — it defines contract.required_sections and
  // provides rule-based fallback builders. LLM mode uses this contract but
  // overrides payload generation.
  const profileId = detectKbProfile(wiki);
  const profile = loadProfile(profileId);
  const contract = buildContract(wiki, profile);
  notes.push(
    `KB profile seçimi: detectKbProfile → "${profileId}" (adapter src/kb-profiles/${profileId}.mjs).`,
  );

  let payload;
  let extractionMeta = { extraction_mode: 'rule-based' };

  let provenance = {};

  if (mode === 'llm' && hasAnyProvider()) {
    try {
      const llm = await extractWithLLM({
        wiki,
        validate: (candidate) => {
          const hydrated = hydrateLlmPayload(candidate, wiki);
          return validatePayload(
            hydrated,
            contract,
            wiki.rawText,
            candidate._metadata?.provenance ?? {},
            wiki,
          );
        },
      });
      payload = hydrateLlmPayload(llm.payload, wiki);
      provenance = llm.payload._metadata?.provenance ?? {};
      extractionMeta = {
        extraction_mode: 'llm',
        llm_provider: llm.provider,
        llm_retries: llm.retries,
        llm_cost_estimate_usd: llm.cost,
        llm_history: llm.history,
      };
      notes.push(
        `LLM extraction: provider=${llm.provider}, retries=${llm.retries}, cost=$${llm.cost.toFixed(6)}`,
      );
    } catch (err) {
      notes.push(
        `LLM extraction başarısız (${err.message}) — rule-based fallback`,
      );
      console.warn(
        `[llm] extraction failed: ${err.message} — falling back to rule-based`,
      );
      const rb = buildPayloadRuleBased(wiki, profile);
      payload = rb.payload;
      provenance = rb.provenance;
      extractionMeta = {
        extraction_mode: 'rule-based',
        llm_fallback_reason: err.message,
        llm_history: err.history,
      };
    }
  } else {
    if (mode === 'llm' && !hasAnyProvider()) {
      notes.push(
        'LLM mode istendi ama hiçbir provider API key bulunamadı — rule-based fallback',
      );
      console.warn(
        '[llm] no provider API key configured; falling back to rule-based',
      );
      extractionMeta.llm_fallback_reason = 'no-provider-key';
    }
    const rb = buildPayloadRuleBased(wiki, profile);
    payload = rb.payload;
    provenance = rb.provenance;
  }

  const sectionIds = [
    ...contract.resolvedRequired.map((r) => r.resolved_id),
    ...contract.resolvedPreferred.map((r) => r.resolved_id),
  ].filter(Boolean);

  const prov = buildProvenance({
    wiki,
    artifactType: spec.type,
    schemaVersion: spec.schema_version,
    sectionIds: uniq(sectionIds),
    notes,
  });
  prov.subdomain = spec.subdomain;
  prov.format = spec.format;
  prov.profile = profileId;
  Object.assign(prov, extractionMeta);
  prov.contract = {
    required: contract.resolvedRequired,
    preferred: contract.resolvedPreferred,
  };
  prov.provenance = provenance;

  const artifact = {
    _meta: prov,
    payload,
    _kb_raw_text: wiki.rawText,
    _wiki: wiki,
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
  delete artifact._wiki;

  artifact.rendered = JSON.stringify(
    { _metadata: artifact._meta, ...payload },
    null,
    2,
  );

  return artifact;
}

function uniq(arr) {
  return [...new Set(arr)];
}
