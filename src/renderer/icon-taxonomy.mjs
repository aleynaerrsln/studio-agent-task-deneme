// Keyword-based icon selector (drug/disease-name agnostic).
// Used by both LLM and rule-based profile adapters.

export function detectPopulationIcon(conditionText) {
  const t = String(conditionText ?? '').toLowerCase();
  if (/dermatit|psoriasis|eczema|atopic|\bskin\b/.test(t)) return 'skin-cross-section';
  if (/kidney|renal|esrd|eskd|dialys|nephro/.test(t)) return 'kidney';
  if (/cardi|heart|myocard|coronary|\bmi\b/.test(t)) return 'heart';
  if (/pulmonar|\blung\b|asthma|copd|respirat/.test(t)) return 'lungs';
  if (/diabet|glyc|insulin/.test(t)) return 'activity';
  if (/pediatr|adolescent|youth|child|infant/.test(t)) return 'users-group';
  if (/psychiatr|depression|anxiety|mental/.test(t)) return 'brain';
  if (/oncolog|cancer|carcinoma|tumor|malign/.test(t)) return 'activity';
  if (/gastro|intestin|bowel|ibd/.test(t)) return 'activity';
  if (/neuro|parkinson|alzheimer|dementia/.test(t)) return 'brain';
  return 'patients-cohort';
}

export function detectInterventionIcon(armText) {
  const t = String(armText ?? '').toLowerCase();
  if (/no\s+intervention|no\s+treatment|untreated/.test(t)) return 'prohibition';
  if (/placebo|sham/.test(t)) return 'prohibition';
  if (/oral|tablet|once\s+daily|by\s+mouth|\bpo\b/.test(t)) return 'pill';
  if (/capsule/.test(t)) return 'capsule';
  if (/subcutaneous|\bsc\b|injection|every\s+(?:other|\d+)\s+week/.test(t)) return 'syringe';
  if (/intravenous|\biv\b|infusion/.test(t)) return 'iv-drip';
  if (/inhaled|inhaler|nebuli/.test(t)) return 'inhaler';
  if (/topical|cream|ointment/.test(t)) return 'flask';
  if (/training|course|workshop|educat/.test(t)) return 'conversation';
  if (/counseling|interview|therapy|behavior/.test(t)) return 'conversation';
  if (/financial|incentive|payment|reimburse/.test(t)) return 'money';
  if (/surgery|surgical|operation|procedure/.test(t)) return 'scalpel';
  if (/usual\s+care|standard\s+care|\btau\b|routine/.test(t)) return 'clipboard';
  return 'clipboard';
}

export function detectSettingsIcon(scopeText) {
  const t = String(scopeText ?? '').toLowerCase();
  if (/\d+\s*(?:countri|ülke)|international|multi-?countr/.test(t)) return 'globe';
  if (/\d+\s*(?:center|merkez)|multi-?cent|nationwide|across\s+the\s+us|across\s+europe/.test(t)) return 'network';
  if (/single-?cent|one\s+hospital|university\s+\w+\s+hospital/.test(t)) return 'hospital';
  return 'hospital';
}

export function detectStudyTypePrefix(titleSubtitle) {
  const t = String(titleSubtitle ?? '').toLowerCase();
  if (/cluster\s+randomi/.test(t)) return 'Cluster RCT';
  if (/randomi[sz]ed\s+clinical\s+trial|randomi[sz]ed\s+controlled\s+trial|\brct\b/.test(t)) return 'RCT';
  if (/meta-?analysis|systematic\s+review/.test(t)) return 'Meta-analysis';
  if (/cohort\s+study|prospective\s+cohort|retrospective\s+cohort/.test(t)) return 'Cohort';
  if (/cross-?sectional/.test(t)) return 'Cross-sectional';
  if (/case-?control/.test(t)) return 'Case-Control';
  if (/case\s+series/.test(t)) return 'Case Series';
  return 'Study';
}
