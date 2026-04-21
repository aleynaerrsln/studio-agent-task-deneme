// provenance-binding lint rule — her content field için KB'ye zincir doğrulaması.

const DERIVED_PATH_PATTERNS = [
  /\.icon_hint$/,
  /\.chart\.type$/,
  /\.chart_slot$/,
  /\.chart\.data\./,
  /\.chart\.annotations/,
  /\.journal_bar\.color$/,
  /\.journal_bar\.accent$/,
  /\.grid_position/,
  /\.hero$/,
  /\.role$/,
  /\.title$/,
  /\.header_label$/,
  /\.header_number$/,
  /\.arms\[\d+\]\.route$/,
  /\.secondary_numbers\[\d+\]\.label$/,
  /(^|\.)footer\.disclaimer$/,
  /(^|\.)footer\.brand$/,
  /(^|\.)layout\.type$/,
  /(^|\.)type$/,
  /(^|\.)format$/,
];

function isDerivedPath(p) {
  return DERIVED_PATH_PATTERNS.some((re) => re.test(p));
}

function collectLeafPaths(obj, prefix, out) {
  if (obj == null) return;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => collectLeafPaths(item, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const p = prefix ? `${prefix}.${k}` : k;
      collectLeafPaths(obj[k], p, out);
    }
    return;
  }
  // Primitive leaf
  if (obj === '' || obj === null) return;
  out.push(prefix);
}

export function extractRequiredPaths(payload) {
  const all = [];
  collectLeafPaths(payload, '', all);
  return all
    .filter((p) => !p.startsWith('_metadata'))
    .filter((p) => !isDerivedPath(p));
}

function getValueAtPath(root, path) {
  // Handle "a.b[0].c" style paths.
  const parts = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(path)) !== null) {
    parts.push(m[1] ?? Number(m[2]));
  }
  let cur = root;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function normalize(s) {
  return String(s ?? '')
    .replace(/\*{1,2}/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function normalizedIncludes(haystack, needle) {
  const h = normalize(haystack);
  const n = normalize(needle);
  if (!n) return true;
  return h.includes(n);
}

function buildValidSectionSet(wiki) {
  const set = new Set(['preamble', 'title', 'derived']);
  for (const s of wiki.sections ?? []) {
    set.add(s.title);
    set.add(s.id);
  }
  return set;
}

function sectionMatches(wiki, kbSection) {
  const validSet = buildValidSectionSet(wiki);
  if (validSet.has(kbSection)) return true;
  // Partial/substring match for nested like "1. GENEL BİLGİLER → Hastalık"
  const first = kbSection.split(/\s*[→>]\s*|\s*\|\s*/)[0]?.trim();
  if (first && validSet.has(first)) return true;
  for (const s of wiki.sections ?? []) {
    if (s.title.includes(first ?? kbSection) || (first && first.includes(s.title))) {
      return true;
    }
  }
  return false;
}

export const provenanceBindingRule = {
  id: 'provenance-binding',
  check: (artifact) => {
    const provenance = artifact._meta?.provenance ?? {};
    const wiki = artifact._wiki; // compile() bunu artifact shell'ine koyar
    if (!wiki) {
      return { error: 'provenance-binding: wiki reference sağlanmadı' };
    }

    const errors = [];
    const payload = artifact.payload ?? {};

    // 1. Non-derived required paths için provenance var mı?
    const required = extractRequiredPaths(payload);
    for (const path of required) {
      if (!(path in provenance)) {
        errors.push(`${path}: provenance eksik`);
      }
    }

    // 2. Her provenance entry için zinciri doğrula
    for (const [path, prov] of Object.entries(provenance)) {
      const value = getValueAtPath(payload, path);
      if (value === undefined || value === null || value === '') continue;

      if (prov?.kb_section === 'derived') continue;

      const valueStr = String(value);
      const quoteStr = String(prov?.source_quote ?? '');
      const section = String(prov?.kb_section ?? '');

      if (!quoteStr) {
        errors.push(`${path}: source_quote boş (kb_section="${section}")`);
        continue;
      }

      if (!normalizedIncludes(quoteStr, valueStr)) {
        errors.push(
          `${path}: value "${valueStr}" source_quote'a gömülü değil`,
        );
      }

      if (!normalizedIncludes(wiki.rawText, quoteStr)) {
        errors.push(
          `${path}: source_quote "${quoteStr.slice(0, 60)}${quoteStr.length > 60 ? '…' : ''}" KB'de literal bulunamadı`,
        );
      }

      if (!sectionMatches(wiki, section)) {
        errors.push(
          `${path}: kb_section "${section}" KB section başlıklarından biri değil`,
        );
      }
    }

    return errors.length === 0 || { error: errors.slice(0, 15).join('; ') };
  },
};
