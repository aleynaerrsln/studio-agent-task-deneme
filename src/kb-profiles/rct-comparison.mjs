// RCT head-to-head profile — drug-name agnostic.
// Iter-21: { payload, provenance } döner; her non-derived field KB-literal zincirinde.

import {
  detectPopulationIcon,
  detectInterventionIcon,
  detectSettingsIcon,
  detectStudyTypePrefix,
} from '../renderer/icon-taxonomy.mjs';
import { selectChartType } from '../chart-selector.mjs';

function sec(wiki, re) {
  return (
    wiki.sections.find((s) => re.test(s.id) || re.test(s.title.toLowerCase())) ??
    null
  );
}

// ---- Quote-returning extractors ----

function findGenderQuote(content) {
  if (!content) return null;
  const m = content.match(
    /Gender\s+distribution\s*\([^)]*\):\*?\*?\s*(\d[\d\s,]*)\s*Men\s*,\s*(\d[\d\s,]*)\s*Women/i,
  );
  if (!m) return null;
  return {
    quote: m[0],
    male: parseInt(m[1].replace(/[\s,]/g, ''), 10),
    female: parseInt(m[2].replace(/[\s,]/g, ''), 10),
  };
}

function findConditionQuote(content) {
  if (!content) return null;
  const m = content.match(
    /\*\*Condition:\*\*\s*([^\n]+)/i,
  );
  if (!m) return null;
  return { quote: m[0], value: m[1].trim() };
}

function findAgeQuote(content) {
  if (!content) return null;
  // "**Age range:** 18-76 years (mean 36.3 y, SD 14.1)" — value literal-short
  const m = content.match(
    /\*\*Age range:\*\*\s*(\d+)-(\d+)\s*years\s*\(mean\s+(\d+\.\d+)\s*y,\s*SD\s+(\d+\.\d+)\)/,
  );
  if (!m) return null;
  return {
    quote: m[0],
    // KB-literal substring: "18-76 years"
    value: `${m[1]}-${m[2]} years`,
  };
}

function findAdjustedDiffQuote(primary) {
  // "- **Adjusted difference: 9.7% (95% CI, 2.6%-16.7%); p = 0.007**"
  if (!primary) return null;
  const m = primary.content.match(
    /\*\*Adjusted\s+difference:\s*(\d+\.\d+)%\s*\(95%\s*CI,[^;]+;\s*p\s*=\s*(0?\.\d+)\*\*/i,
  );
  if (!m) return null;
  return { quote: m[0], delta: m[1], pValue: m[2] };
}

function findEligibilityQuote(content) {
  if (!content) return null;
  // Pull the adult range line as literal
  const adults = content.match(/-\s*Adults\s+aged\s+\d+\s+to\s+\d+\s+years/);
  if (!adults) return null;
  return { quote: adults[0], value: adults[0].replace(/^-\s*/, '') };
}

function findSampleNQuote(content) {
  if (!content) return null;
  const m = content.match(/-\s*\*\*n\s*=\s*(\d+)\*\*\s*\(randomized[^)]+\)/);
  if (!m) return null;
  return { quote: m[0], n: m[1] };
}

function findTreatmentTableRows(content) {
  if (!content) return [];
  const lines = content.split('\n');
  const rows = [];
  let inTable = false;
  let headerCells = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!inTable) {
      if (/^\|.*Grup.*İlaç/.test(l)) {
        inTable = true;
        headerCells = l
          .split('|')
          .map((c) => c.trim())
          .filter(Boolean)
          .map((c) => c.toLowerCase());
      }
      continue;
    }
    if (/^\|[-\s|]+\|$/.test(l.trim())) continue;
    if (!l.trim().startsWith('|')) break;
    const cells = l
      .split('|')
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length);
    if (cells.length < 3) continue;
    const drugCol = headerCells.findIndex((c) => /ilaç|drug|intervention/.test(c));
    const doseCol = headerCells.findIndex((c) => /doz|dose|dozaj/.test(c));
    const nCol = headerCells.findIndex((c) => /^n$/.test(c));
    rows.push({
      rawRow: l.trim(),
      label: (cells[drugCol >= 0 ? drugCol : 1] ?? '').replace(/\*\*/g, '').trim(),
      doseText: cells[doseCol >= 0 ? doseCol : 2] ?? '',
      n: cells[nCol >= 0 ? nCol : cells.length - 1]?.replace(/\D/g, '') ?? null,
    });
  }
  return rows;
}

function findCentersQuote(content) {
  if (!content) return null;
  // "**Lokasyon:** 129 merkez, 22 ülke (Europe, North/South America, Oceania, Asia-Pacific)"
  const m = content.match(
    /\*\*Lokasyon:\*\*\s*(\d+)\s*merkez,?\s*(\d+)\s*ülke[^\n]*/,
  );
  if (!m) return null;
  return {
    quote: m[0],
    centers: m[1],
    countries: m[2],
    value: `${m[1]} merkez, ${m[2]} ülke`,
  };
}

function findPrimaryOutcomeRow(content) {
  if (!content) return null;
  // "| **EASI75 at Week 16** | **207 (62.6)** | **248 (72.4)** | **9.7** | **0.007** |"
  const m = content.match(
    /\|\s*\*{0,2}\s*(EASI75\s*at\s*Week\s*\d+)\s*\*{0,2}\s*\|\s*\*{0,2}\s*\d+\s*\(\s*(\d+\.\d+)\s*\)\s*\*{0,2}\s*\|\s*\*{0,2}\s*\d+\s*\(\s*(\d+\.\d+)\s*\)\s*\*{0,2}\s*\|\s*\*{0,2}\s*(\d+\.?\d*)\s*\*{0,2}\s*\|\s*\*{0,2}\s*(0?\.\d+)\s*\*{0,2}\s*\|/,
  );
  if (!m) return null;
  return {
    quote: m[0],
    metric: m[1].trim(),
    armB: parseFloat(m[2]),
    armA: parseFloat(m[3]),
    delta: parseFloat(m[4]),
    pValue: m[5],
  };
}

function findFindingsBulletQuote(primary) {
  if (!primary) return null;
  // Generic "arm A vs arm B percentage" bullet — drug name agnostic.
  const m = primary.content.match(
    /-\s+[^\n]*%\d+\.\d+[^\n]*vs[^\n]*%\d+\.\d+[^\n]*/,
  );
  if (!m) return null;
  return m[0].trim();
}

function findTimelineTableQuote(wiki) {
  const sec2 = sec(wiki, /ranked[- ]secondary|secondary[- ]endpoints|over[- ]time/i);
  if (!sec2) return null;
  const lines = sec2.content.split('\n');
  const rows = [];
  const weeks = [];
  const s1 = [];
  const s2 = [];
  for (const line of lines) {
    const m = line.match(
      /\|\s*Week\s*(\d+)\s*\|\s*\d+\s*\(([\d.]+)\)\s*\|\s*\d+\s*\(([\d.]+)\)\s*\|/i,
    );
    if (m) {
      rows.push(line.trim());
      weeks.push(parseInt(m[1], 10));
      s1.push(parseFloat(m[2]));
      s2.push(parseFloat(m[3]));
      if (weeks.length >= 5) break;
    }
  }
  return weeks.length >= 3
    ? { quote: rows.join('\n'), section: sec2.title, weeks, s1, s2 }
    : null;
}

// ---- Builders ----

function buildPopulation(wiki) {
  const general = sec(wiki, /genel[- ]bilgiler|general|design-setting/i);
  const demo = sec(wiki, /tanimlayici|demographic|baseline/i);
  const content = (general?.content ?? '') + '\n' + (demo?.content ?? '');
  const genderQ = findGenderQuote(content);
  const condQ = findConditionQuote(content);
  const ageQ = findAgeQuote(content);
  const eligQ = findEligibilityQuote(content);
  const nQ = findSampleNQuote(content);

  const primary = genderQ
    ? `${genderQ.male} Men, ${genderQ.female} Women`
    : nQ
      ? `n = ${nQ.n}`
      : 'n = ?';

  const payload = {
    role: 'population',
    title: 'Population',
    primary_number: primary,
    gender_breakdown: genderQ
      ? { male: genderQ.male, female: genderQ.female }
      : null,
    condition: condQ?.value ?? null,
    eligibility_summary: eligQ?.value ?? null,
    age_summary: ageQ?.value ?? null,
    icon_hint: detectPopulationIcon(condQ?.value ?? ''),
    grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
  };

  const provenance = {};
  const section = general?.title ?? 'preamble';
  if (genderQ) {
    provenance['primary_number'] = { source_quote: genderQ.quote, kb_section: section };
    provenance['gender_breakdown.male'] = { source_quote: genderQ.quote, kb_section: section };
    provenance['gender_breakdown.female'] = { source_quote: genderQ.quote, kb_section: section };
  } else if (nQ) {
    provenance['primary_number'] = { source_quote: nQ.quote, kb_section: section };
  }
  if (condQ) provenance['condition'] = { source_quote: condQ.quote, kb_section: section };
  if (eligQ) provenance['eligibility_summary'] = { source_quote: eligQ.quote, kb_section: section };
  if (ageQ) provenance['age_summary'] = { source_quote: ageQ.quote, kb_section: section };

  return { payload, provenance };
}

function extractDose(text) {
  return text.match(/(\d+(?:\.\d+)?\s*m?g)/i)?.[1]?.trim() ?? null;
}

function extractRoute(text) {
  const t = String(text ?? '').toLowerCase();
  if (/oral|\bpo\b|tablet|by\s+mouth/.test(t)) return 'oral';
  if (/subcutaneous|\bsc\b|injection/.test(t)) return 'subcutaneous';
  if (/intravenous|\biv\b|infusion/.test(t)) return 'intravenous';
  if (/inhaled|inhaler|nebuli/.test(t)) return 'inhalation';
  if (/topical|cream|ointment/.test(t)) return 'topical';
  return null;
}

function extractSchedule(text) {
  return (
    text.match(
      /(once\s+daily|every\s+(?:other\s+)?\d*\s*weeks?|twice\s+daily|weekly|daily)/i,
    )?.[1] ?? null
  );
}

function detectRandomizationUnit(content) {
  const t = String(content ?? '').toLowerCase();
  if (/cluster\s+randomi[^.]*hospital\s+referral\s+region/is.test(t)) return 'HRRs';
  if (/cluster\s+randomi[^.]*(clinic|physician|pediatrician)/is.test(t)) return 'Clinicians';
  if (/cluster\s+randomi[^.]*school/is.test(t)) return 'Schools';
  if (/cluster\s+randomi/i.test(t)) return 'Clusters';
  return 'Patients';
}

function buildIntervention(wiki) {
  const general = sec(wiki, /genel[- ]bilgiler|intervention|tedavi/i);
  const content = general?.content ?? '';
  const rows = findTreatmentTableRows(content);

  const arms = rows.map((r) => ({
    label: r.label,
    n: r.n ? parseInt(r.n, 10) : null,
    dose: extractDose(r.doseText),
    route: extractRoute(r.doseText),
    schedule: extractSchedule(r.doseText),
    icon_hint: detectInterventionIcon(`${r.label} ${r.doseText}`),
  }));

  const totalN = arms.reduce((sum, a) => sum + (a.n ?? 0), 0);
  const unitLabel = detectRandomizationUnit(content);
  const headerNumber = totalN > 0 ? totalN : null;

  const hasArms = arms.length > 0;
  const payload = {
    role: 'intervention',
    title: 'Intervention',
    header_number: headerNumber,
    header_label: hasArms ? `${unitLabel} randomized and analyzed` : null,
    arms: hasArms ? arms : null,
    primary_number: hasArms ? null : 'Single-arm',
    body: hasArms ? null : 'Single intervention',
    icon_hint: hasArms ? arms[0].icon_hint : 'clipboard',
    grid_position: { column: 2, rowStart: 1, rowSpan: 1 },
  };

  const provenance = {};
  if (hasArms) {
    for (let i = 0; i < arms.length; i++) {
      const row = rows[i];
      provenance[`arms[${i}].label`] = { source_quote: row.rawRow, kb_section: general.title };
      if (arms[i].n != null) {
        provenance[`arms[${i}].n`] = { source_quote: row.rawRow, kb_section: general.title };
      }
      if (arms[i].dose) {
        provenance[`arms[${i}].dose`] = { source_quote: row.rawRow, kb_section: general.title };
      }
      if (arms[i].schedule) {
        provenance[`arms[${i}].schedule`] = {
          source_quote: row.rawRow,
          kb_section: general.title,
        };
      }
    }
  } else if (!hasArms) {
    // Single-arm fallback paths
    provenance['primary_number'] = { source_quote: '', kb_section: 'derived' };
    provenance['body'] = { source_quote: '', kb_section: 'derived' };
  }

  return { payload, provenance };
}

function buildSettings(wiki) {
  const design = sec(wiki, /genel[- ]bilgiler|design/i);
  const content = design?.content ?? '';
  const locQ = findCentersQuote(content);

  const primary = locQ ? `${locQ.centers} merkez` : 'Multi-center';
  const body = locQ ? locQ.value : null;

  const payload = {
    role: 'settings',
    title: 'Settings / Locations',
    primary_number: primary,
    body,
    icon_hint: detectSettingsIcon(body ?? ''),
    grid_position: { column: 1, rowStart: 2, rowSpan: 1 },
  };

  const provenance = {};
  if (locQ) {
    provenance['primary_number'] = {
      source_quote: locQ.quote,
      kb_section: design.title,
    };
    provenance['body'] = {
      source_quote: locQ.quote,
      kb_section: design.title,
    };
  }
  return { payload, provenance };
}

function buildPrimaryOutcome(wiki) {
  const endpoint = sec(wiki, /primary-endpoint|primary-outcome|main-outcomes/i);
  if (!endpoint) {
    return {
      payload: {
        role: 'primary_outcome',
        title: 'Primary Outcome',
        primary_number: null,
        body: null,
        icon_hint: 'outcome-measure',
        secondary_numbers: [],
        grid_position: { column: 2, rowStart: 2, rowSpan: 1 },
      },
      provenance: {},
    };
  }

  const row = findPrimaryOutcomeRow(endpoint.content);
  const metric = row?.metric ?? null;
  // body — definition: endpoint section'ın ilk heading cümlesi "### Referans Değer: ..."
  const refMatch = endpoint.content.match(/###\s*Referans\s+Değer:\s*([^\n]+)/i);
  const body = refMatch?.[1]?.trim() ?? null;

  const payload = {
    role: 'primary_outcome',
    title: 'Primary Outcome',
    primary_number: metric,
    body,
    icon_hint: 'outcome-measure',
    secondary_numbers: [],
    grid_position: { column: 2, rowStart: 2, rowSpan: 1 },
  };

  const provenance = {};
  if (metric && row) {
    provenance['primary_number'] = { source_quote: row.quote, kb_section: endpoint.title };
  }
  if (body && refMatch) {
    provenance['body'] = { source_quote: refMatch[0], kb_section: endpoint.title };
  }
  return { payload, provenance };
}

function buildFindings(wiki) {
  const endpoint = sec(wiki, /primary-endpoint|primary-outcome/i);
  const content = endpoint?.content ?? '';
  const row = findPrimaryOutcomeRow(content);
  const timeline = findTimelineTableQuote(wiki);
  const bodyQ = findFindingsBulletQuote(endpoint);
  const adjDiff = findAdjustedDiffQuote(endpoint);

  // Labels from intervention arms (NOT drug-name hardcoded — fetched from build result)
  const interventionResult = buildIntervention(wiki);
  const armLabels = (interventionResult.payload.arms ?? []).map((a) => a.label);
  const labelA = armLabels[1] ?? 'Intervention';
  const labelB = armLabels[0] ?? 'Comparison';

  if (!row && !timeline) {
    return {
      payload: {
        role: 'findings',
        title: 'Findings',
        primary_number: null,
        body: null,
        icon_hint: 'line-chart',
        hero: true,
        chart_slot: 'placeholder',
        chart: null,
        secondary_numbers: [],
        grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
      },
      provenance: {},
    };
  }

  const primaryNumber = row ? `%${row.armA.toFixed(1)}` : null;

  const secondary = [];
  const provenance = {};
  if (adjDiff) {
    // Δ (pp) ve p — Adjusted difference bullet'tan tek source_quote
    secondary.push({ label: 'Δ', value: `${adjDiff.delta}%` });
    provenance[`secondary_numbers[${secondary.length - 1}].value`] = {
      source_quote: adjDiff.quote,
      kb_section: endpoint.title,
    };
    secondary.push({ label: 'p', value: adjDiff.pValue });
    provenance[`secondary_numbers[${secondary.length - 1}].value`] = {
      source_quote: adjDiff.quote,
      kb_section: endpoint.title,
    };
  } else if (row) {
    // Fallback: tablo satırından delta/p
    if (row.delta != null) {
      secondary.push({ label: 'Δ', value: String(row.delta) });
      provenance[`secondary_numbers[${secondary.length - 1}].value`] = {
        source_quote: row.quote,
        kb_section: endpoint.title,
      };
    }
    if (row.pValue) {
      secondary.push({ label: 'p', value: String(row.pValue) });
      provenance[`secondary_numbers[${secondary.length - 1}].value`] = {
        source_quote: row.quote,
        kb_section: endpoint.title,
      };
    }
  }

  // Chart
  const outcomeData = {
    timePoints: timeline?.weeks ?? null,
    groups: row ? 2 : null,
    pValue: row ? parseFloat(row.pValue) : null,
    pre: null,
    post: null,
  };
  const chartType = selectChartType(outcomeData);

  let chart;
  if (chartType === 'line' && timeline) {
    chart = {
      type: 'line',
      data: {
        metric: 'Primary endpoint over time',
        unit: '%',
        x_axis: { label: 'Week', values: timeline.weeks },
        y_axis: { label: 'Proportion (%)', min: 0, max: 100 },
        series: [
          { label: labelA, values: timeline.s1, accent: true },
          { label: labelB, values: timeline.s2, accent: false },
        ],
      },
      annotations:
        row?.delta && row?.pValue
          ? [{ type: 'delta', value: `+${row.delta}pp (P=${row.pValue})`, position: 'end' }]
          : [],
    };
  } else if (chartType === 'donut' && row) {
    chart = {
      type: 'donut',
      data: {
        metric: 'Primary outcome',
        unit: '%',
        groups: [
          { label: labelB, value: row.armB, total: 100 },
          { label: labelA, value: row.armA, total: 100 },
        ],
      },
      annotations: [],
    };
  } else if (row) {
    chart = {
      type: 'bar',
      data: {
        metric: 'Primary outcome (%)',
        unit: '%',
        points: [
          { label: labelA, value: row.armA },
          { label: labelB, value: row.armB },
        ],
      },
      annotations: row.delta
        ? [{ type: 'delta', value: `+${row.delta}pp`, position: 'between-points' }]
        : [],
    };
  } else {
    chart = null;
  }

  const payload = {
    role: 'findings',
    title: 'Findings',
    primary_number: primaryNumber,
    body: bodyQ,
    icon_hint: chartType === 'line' ? 'line-chart' : 'bar-comparison',
    hero: true,
    chart_slot: chart?.type ?? 'placeholder',
    chart,
    secondary_numbers: secondary,
    grid_position: { column: 3, rowStart: 1, rowSpan: 2 },
  };

  // primary_number "%72.4" → source_quote findings bullet (has "%72.4" literal)
  if (primaryNumber && bodyQ) {
    provenance['primary_number'] = { source_quote: bodyQ, kb_section: endpoint.title };
  } else if (primaryNumber && row) {
    provenance['primary_number'] = { source_quote: row.quote, kb_section: endpoint.title };
  }
  if (bodyQ) {
    provenance['body'] = { source_quote: bodyQ, kb_section: endpoint.title };
  }

  return { payload, provenance };
}

function buildCitation(preamble) {
  // KB-literal: Yazarlar satırı tek source_quote.
  const authors = preamble.match(/>\s*\*\*Yazarlar:\*\*\s*([^\n]+)/);
  if (!authors) return { value: null, provenance: null };
  return {
    value: authors[1].trim(),
    provenance: {
      source_quote: authors[0],
      kb_section: 'preamble',
    },
  };
}

export const profile = {
  id: 'rct-comparison',
  study_type_prefix: 'RCT',
  required_sections: ['genel-bilgiler', 'primary-endpoint'],
  preferred_sections: [
    'tanimlayici-istatistikler-baseline-demographics',
    'ranked-secondary-endpoints',
    'safety-teaes',
  ],
  buildPopulation,
  buildIntervention,
  buildFindings,
  buildSettings,
  buildPrimaryOutcome,
  buildCitation,
};
