// KB1 profile — "Zaman 1 vs Zaman 2" paired statistical analysis.
// Iter-21: her build fonksiyonu { payload, provenance } döner;
// body/primary/secondary değerleri KB-literal substring zincirinde.

const DERIVED = { source_quote: '', kb_section: 'derived' };

// ---- Regex extractors ----

function findMediansQuote(dependent) {
  // "| Ortanca        | **70.456**  | **35.047**  |"
  if (!dependent) return null;
  const m = dependent.content.match(
    /\|\s*Ortanca\s*\|\s*\*{0,2}[\d.]+\*{0,2}\s*\|\s*\*{0,2}[\d.]+\*{0,2}\s*\|/,
  );
  if (!m) return null;
  const v = m[0].match(/\*{0,2}([\d.]+)\*{0,2}\s*\|\s*\*{0,2}([\d.]+)\*{0,2}/);
  if (!v) return null;
  return {
    quote: m[0],
    time1: parseFloat(v[1]),
    time2: parseFloat(v[2]),
  };
}

function findPValueQuote(dependent) {
  if (!dependent) return null;
  const m = dependent.content.match(
    /\|\s*p\s*değeri\s*\|\s*\*{0,2}\s*([<>=]?\s*[\d.]+)\s*\*{0,2}\s*\|/,
  );
  if (!m) return null;
  // value literal-preserved — "< 0.001" (whitespace normalize edilecek lint'te).
  return { quote: m[0], value: m[1].trim() };
}

function findRValueQuote(dependent) {
  if (!dependent) return null;
  const m = dependent.content.match(
    /\|\s*Etki\s+Büyüklüğü\s*\(r\)\s*\|\s*\*{0,2}(-?\d+\.\d+)\*{0,2}\s*\|/,
  );
  if (!m) return null;
  return { quote: m[0], value: m[1] };
}

function findDValueQuote(independent) {
  if (!independent) return null;
  const m = independent.content.match(
    /\|\s*cov1\s*\|\s*\*{0,2}(\d+\.\d+)\*{0,2}\s*\|\s*\*{0,2}\s*[^|*]+\*{0,2}\s*\|/,
  );
  if (!m) return null;
  return { quote: m[0], value: m[1] };
}

function findDeltaQuote(wiki) {
  // KB section 7 msg 2: "Zaman 1→2 arasında ortanca değerde %50.3 azalma"
  const kb = wiki.rawText ?? '';
  const m = kb.match(/Zaman\s*1[→ ].*?ortanca[^.\n]*?%(\d+\.\d+)\s*azalma/);
  if (!m) return null;
  return { quote: m[0].trim(), value: `%${m[1]} azalma` };
}

function findNEqualsQuote(general) {
  if (!general) return null;
  const m = general.content.match(/-\s*\*\*n\s*=\s*(\d+)\*\*/);
  if (!m) return null;
  return { quote: m[0], value: `n = ${m[1]}` };
}

function findOutcomeBulletQuote(dependent) {
  // Section 4 findings bullet: "Zaman 1'den Zaman 2'ye ortanca değer **%50.3 azalmış** (70.456 → 35.047)"
  if (!dependent) return null;
  const m = dependent.content.match(
    /Zaman\s*1'den\s*Zaman\s*2'ye\s*ortanca\s*değer\s*\*{0,2}%[\d.]+\s*azalmış\*{0,2}[^\n]*/,
  );
  if (!m) return null;
  return m[0].trim();
}

function findMethodRowQuote(wiki) {
  // Section 6 methods table: "| Wilcoxon İşaretli Sıralar | Bağımlı iki ölçüm karşılaştırma (non-parametrik) | dp1 vs cov1 (Ankastre) |"
  const methods = wiki.findSection('kullanilan istatistiksel yontemler', 'kullanilan');
  if (!methods) return null;
  const m = methods.content.match(/\|\s*Wilcoxon\s+İşaretli\s+Sıralar[^|]*\|([^|]+)\|[^|\n]*\|/);
  if (!m) return { quote: null, section: methods.title };
  return { quote: m[0], section: methods.title, bodyShort: m[1].trim() };
}

// ---- Builders ----

function buildPopulation(wiki) {
  const general = wiki.findSection('genel bilgiler', 'genel');
  const keyMsg = wiki.findSection(
    'infografik visual abstract icin anahtar mesajlar',
    'anahtar mesajlar',
  );
  const nQuote = findNEqualsQuote(general);

  // Body — KB section 7 msg 1 literal: "240 katılımcı, 4 eşit grup (n=60)"
  const kb = wiki.rawText ?? '';
  const bodyMatch = kb.match(/\d+\s+katılımcı,\s+\d+\s+eşit\s+grup\s*\(n=\d+\)/);

  const payload = {
    role: 'population',
    title: 'Population',
    primary_number: nQuote?.value ?? 'n = ?',
    body: bodyMatch ? bodyMatch[0] : null,
    icon_hint: 'patients-cohort',
    grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
  };

  const provenance = {};
  if (nQuote) {
    provenance['primary_number'] = {
      source_quote: nQuote.quote,
      kb_section: general.title,
    };
  }
  if (bodyMatch) {
    provenance['body'] = {
      source_quote: bodyMatch[0],
      kb_section: keyMsg?.title ?? '7. INFOGRAFİK / VISUAL ABSTRACT İÇİN ANAHTAR MESAJLAR',
    };
  }
  return { payload, provenance };
}

function buildIntervention(wiki) {
  const dependent = wiki.findSection('bagimli veri', 'bagimli');
  const role = dependent ? 'comparison' : 'intervention';

  // primary_number — section 4 subheading: "(dp1 vs cov1 — Zaman 1 vs Zaman 2)"
  const subheadMatch = dependent?.content.match(
    /dp1\s+vs\s+cov1\s*—\s*Zaman\s*1\s*vs\s*Zaman\s*2/,
  );

  // body — section 6 method row (cleaner literal)
  const method = findMethodRowQuote(wiki);
  const bodyShort = method?.bodyShort ?? null;

  const payload = {
    role,
    title: role === 'comparison' ? 'Comparison' : 'Intervention',
    primary_number: subheadMatch ? 'Zaman 1 vs Zaman 2' : null,
    body: bodyShort,
    icon_hint: role === 'comparison' ? 'before-after-comparison' : 'clipboard',
    grid_position: { column: 2, rowStart: 1, rowSpan: 1 },
  };

  const provenance = {};
  if (subheadMatch) {
    provenance['primary_number'] = {
      source_quote: subheadMatch[0],
      kb_section: dependent.title,
    };
  }
  if (bodyShort && method.quote) {
    provenance['body'] = {
      source_quote: method.quote,
      kb_section: method.section,
    };
  }
  return { payload, provenance };
}

function buildFindings(wiki) {
  const dependent = wiki.findSection('bagimli veri', 'bagimli');
  const pQ = findPValueQuote(dependent);
  const rQ = findRValueQuote(dependent);
  const medians = findMediansQuote(dependent);
  const delta = findDeltaQuote(wiki);
  const bodyLit = findOutcomeBulletQuote(dependent);

  const secondary = [];
  const provenance = {};

  if (pQ) {
    secondary.push({ label: 'p', value: pQ.value });
    provenance[`secondary_numbers[${secondary.length - 1}].value`] = {
      source_quote: pQ.quote,
      kb_section: dependent.title,
    };
  }
  if (rQ) {
    secondary.push({ label: 'r', value: rQ.value });
    provenance[`secondary_numbers[${secondary.length - 1}].value`] = {
      source_quote: rQ.quote,
      kb_section: dependent.title,
    };
  }

  const chart =
    medians
      ? {
          type: 'slope',
          data: {
            metric: 'Ortanca',
            unit: null,
            points: [
              { label: 'Zaman 1', value: medians.time1 },
              { label: 'Zaman 2', value: medians.time2 },
            ],
          },
          annotations: delta
            ? [{ type: 'delta', value: `-${delta.value}`, position: 'between-points' }]
            : [],
        }
      : null;

  const payload = {
    role: 'findings',
    title: 'Findings',
    primary_number: delta?.value ?? null,
    body: bodyLit,
    icon_hint: 'downward-trend',
    hero: true,
    chart_slot: chart ? 'slope' : 'placeholder',
    chart,
    secondary_numbers: secondary,
    grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
  };

  if (delta) {
    provenance['primary_number'] = {
      source_quote: delta.quote,
      kb_section:
        wiki.findSection('infografik visual abstract', 'anahtar mesajlar')?.title ??
        'derived',
    };
  }
  if (bodyLit) {
    provenance['body'] = {
      source_quote: bodyLit,
      kb_section: dependent.title,
    };
  }

  return { payload, provenance };
}

function buildSettings(wiki) {
  // KB1 preamble: "> **Analiz Ortamı:** R programlama dili v4.5.0"
  const preamble = wiki.preamble ?? '';
  const envMatch = preamble.match(/\*\*Analiz Ortamı:\*\*\s*R programlama dili\s*(v[\d.]+)/);
  const versionMatch = envMatch?.[1];
  const quoteLine = envMatch?.[0];

  const payload = {
    role: 'settings',
    title: 'Settings / Analysis',
    primary_number: versionMatch ?? null,
    body: quoteLine ? 'R programlama dili' : null,
    icon_hint: 'flask',
    grid_position: { column: 1, rowStart: 2, rowSpan: 1 },
  };

  const provenance = {};
  if (versionMatch) {
    provenance['primary_number'] = {
      source_quote: quoteLine,
      kb_section: 'preamble',
    };
    provenance['body'] = {
      source_quote: 'R programlama dili',
      kb_section: 'preamble',
    };
  }
  return { payload, provenance };
}

function buildPrimaryOutcome(wiki) {
  const independent = wiki.findSection('bagimsiz tek grup', 'bagimsiz');
  const dQ = findDValueQuote(independent);
  const method = findMethodRowQuote(wiki);

  const secondary = [];
  const provenance = {};

  if (dQ) {
    secondary.push({ label: "Cohen's d", value: dQ.value });
    provenance[`secondary_numbers[0].value`] = {
      source_quote: dQ.quote,
      kb_section: independent.title,
    };
  }

  // primary_number: method adı (KB section 4 subheading "### Test: Wilcoxon İşaretli Sıralar Testi")
  const depSec = wiki.findSection('bagimli veri', 'bagimli');
  const testHeadMatch = depSec?.content.match(/###\s*Test:\s*(Wilcoxon\s+İşaretli\s+Sıralar\s+Testi)/);
  const primary = testHeadMatch?.[1] ?? null;
  const primaryQuote = testHeadMatch?.[0];

  const payload = {
    role: 'primary_outcome',
    title: 'Primary Outcome',
    primary_number: primary,
    body: method?.bodyShort ?? null,
    icon_hint: 'outcome-measure',
    secondary_numbers: secondary,
    grid_position: { column: 2, rowStart: 2, rowSpan: 1 },
  };

  if (primary) {
    provenance['primary_number'] = {
      source_quote: primaryQuote,
      kb_section: depSec.title,
    };
  }
  if (method?.bodyShort && method.quote) {
    provenance['body'] = {
      source_quote: method.quote,
      kb_section: method.section,
    };
  }
  return { payload, provenance };
}

function buildCitation(preamble) {
  // KB-literal: Analiz Sorumlusu satırı TEK source_quote olarak kullanılır.
  const owner = preamble.match(/\*\*Analiz Sorumlusu:\*\*\s*([^\n]+)/);
  if (!owner) return { value: null, provenance: null };
  return {
    value: owner[1].trim(),
    provenance: {
      source_quote: owner[0],
      kb_section: 'preamble',
    },
  };
}

export const profile = {
  id: 'statistical-pre-post',
  study_type_prefix: 'Statistical Analysis',
  required_sections: [
    'genel-bilgiler',
    'bagimli-veri-analizi|bagimsiz-tek-grup-analizi',
  ],
  preferred_sections: [
    'tanimlayici-istatistikler',
    'kullanilan-istatistiksel-yontemler',
    'infografik-visual-abstract-icin-anahtar-mesajlar',
  ],
  buildPopulation,
  buildIntervention,
  buildFindings,
  buildSettings,
  buildPrimaryOutcome,
  buildCitation,
};
