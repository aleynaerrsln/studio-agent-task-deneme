export function buildProvenance({
  wiki,
  artifactType,
  schemaVersion,
  sectionIds,
  notes = [],
}) {
  const now = new Date().toISOString();
  const usedSections = sectionIds.map((id) => {
    const sec = wiki.sections.find((s) => s.id === id);
    return sec
      ? { id: sec.id, title: sec.title }
      : { id, title: null, missing: true };
  });

  return {
    artifact_type: artifactType,
    schema_version: schemaVersion,
    generated_at: now,
    generator: 'studio-agent@0.1.0',
    source: {
      path: wiki.sourcePath,
      hash: wiki.sourceHash,
      sections: usedSections,
    },
    interpreter_notes: notes,
    lint: null, // populated after lint pass
  };
}

export function toYamlFrontmatter(obj) {
  return '---\n' + toYaml(obj, 0) + '---\n';
}

function toYaml(value, indent) {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null\n';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]\n';
    let out = '';
    for (const item of value) {
      if (isScalar(item)) {
        out += `${pad}- ${scalar(item)}\n`;
      } else {
        const entries = Object.entries(item);
        const [firstKey, firstVal] = entries[0];
        out += `${pad}- ${firstKey}: ${renderYamlValue(firstVal, indent + 1, true)}`;
        for (const [k, v] of entries.slice(1)) {
          out += `${'  '.repeat(indent + 1)}${k}: ${renderYamlValue(v, indent + 1, true)}`;
        }
      }
    }
    return out;
  }
  if (typeof value === 'object') {
    let out = '';
    for (const [k, v] of Object.entries(value)) {
      out += `${pad}${k}: ${renderYamlValue(v, indent, false)}`;
    }
    return out;
  }
  return `${scalar(value)}\n`;
}

function renderYamlValue(v, indent, inlineFirstArrayItem) {
  if (isScalar(v)) return `${scalar(v)}\n`;
  if (Array.isArray(v) && v.length === 0) return '[]\n';
  if (typeof v === 'object' && Object.keys(v).length === 0) return '{}\n';
  return '\n' + toYaml(v, indent + 1);
}

function isScalar(v) {
  return (
    v === null ||
    v === undefined ||
    typeof v === 'string' ||
    typeof v === 'number' ||
    typeof v === 'boolean'
  );
}

function scalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (/^[A-Za-z0-9_.:/@\-]+$/.test(s) && !/^(true|false|null|yes|no)$/i.test(s)) {
    return s;
  }
  return JSON.stringify(s);
}
