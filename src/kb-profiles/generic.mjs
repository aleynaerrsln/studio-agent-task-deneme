// Generic fallback profile — minimal extraction when no specific profile matches.
// Only population panel attempts to produce; others return null (filtered out by compile()).

function extractAnyN(wiki) {
  const m = String(wiki.rawText ?? '').match(/\*\*n\s*=\s*(\d+)\*\*/);
  return m ? `n = ${m[1]}` : null;
}

function buildPopulation(wiki) {
  const primary = extractAnyN(wiki) ?? 'n = ?';
  return {
    role: 'population',
    title: 'Population',
    primary_number: primary,
    body: 'Çalışma popülasyonu',
    icon_hint: 'patients-cohort',
    grid_position: { column: 1, rowStart: 1, rowSpan: 1 },
  };
}

export const profile = {
  id: 'generic',
  study_type_prefix: 'Study',
  required_sections: ['genel-bilgiler'],
  preferred_sections: [],
  buildPopulation,
  buildIntervention: () => null,
  buildFindings: () => null,
  buildSettings: () => null,
  buildPrimaryOutcome: () => null,
  buildCitation: () => null,
};
