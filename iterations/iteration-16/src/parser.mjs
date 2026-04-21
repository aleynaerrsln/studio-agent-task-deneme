import fs from 'node:fs';
import crypto from 'node:crypto';

export function parseKnowledgeBase(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
  const lines = raw.split(/\r?\n/);

  const sections = [];
  const preamble = [];
  let current = null;

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (current) sections.push(finalizeSection(current));
      current = { title: h2[1].trim(), rawLines: [] };
      continue;
    }
    if (!current) {
      preamble.push(line);
      continue;
    }
    current.rawLines.push(line);
  }
  if (current) sections.push(finalizeSection(current));

  return {
    sourcePath: path,
    sourceHash: hash,
    rawText: raw,
    preamble: preamble.join('\n').trim(),
    sections,
  };
}

function finalizeSection(s) {
  const content = s.rawLines.join('\n').trim();
  const subsections = splitByHeading(content, /^###\s+(.+?)\s*$/m);
  return {
    id: slugify(s.title),
    title: s.title,
    content,
    subsections,
  };
}

function splitByHeading(text, headingRe) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      if (current) result.push({ ...current, content: current.lines.join('\n').trim() });
      current = { title: m[1].trim(), id: slugify(m[1].trim()), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) result.push({ ...current, content: current.lines.join('\n').trim() });
  return result.map(({ title, id, content }) => ({ title, id, content }));
}

export function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/^\s*\d+\.?\s*/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findSection(wiki, ...keywords) {
  for (const kw of keywords) {
    const k = slugify(kw);
    const hit = wiki.sections.find(
      (s) => s.id.includes(k) || slugify(s.title).includes(k),
    );
    if (hit) return hit;
  }
  return null;
}

export function findSubsection(section, ...keywords) {
  if (!section) return null;
  for (const kw of keywords) {
    const k = slugify(kw);
    const hit = section.subsections.find((s) => s.id.includes(k));
    if (hit) return hit;
  }
  return null;
}

export function extractBulletList(text, headingKeyword) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const startIdx = lines.findIndex(
    (l) => /^#{3,4}\s/.test(l) && l.includes(headingKeyword),
  );
  const from = startIdx < 0 ? 0 : startIdx + 1;
  const bullets = [];
  for (let i = from; i < lines.length; i++) {
    const line = lines[i];
    if (startIdx >= 0 && /^#{1,4}\s/.test(line)) break;
    const bm = line.match(/^\s*[-*]\s+(.+)$/);
    if (bm) bullets.push(bm[1].trim());
  }
  return bullets;
}

export function parseMarkdownTable(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const header = lines[i].trim();
    const sep = lines[i + 1]?.trim() ?? '';
    if (!/^\|.*\|$/.test(header)) continue;
    if (!/^\|[\s\-:|]+\|$/.test(sep)) continue;
    const headers = splitRow(header);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\|.*\|$/.test(lines[j].trim())) {
      const cells = splitRow(lines[j].trim());
      const row = {};
      headers.forEach((h, idx) => (row[h] = cells[idx] ?? ''));
      rows.push(row);
      j++;
    }
    out.push({ headers, rows });
    i = j - 1;
  }
  return out;
}

function splitRow(line) {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
