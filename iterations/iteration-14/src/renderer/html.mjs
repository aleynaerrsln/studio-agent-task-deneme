// HTML renderer for graphical-abstract JSON (schema v1.0 — jama-internal-medicine-v1).
// Renderer is data-transparent: does not validate, recompute, or modify values.

const ICONS = {
  'patients-cohort': `<svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="9" cy="8" r="3"/>
  <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/>
  <circle cx="17" cy="10" r="2.3"/>
  <path d="M14.5 20c0-2.5 1.6-4.5 3.5-4.8"/>
</svg>`,
  'before-after-comparison': `<svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="6" cy="12" r="3"/>
  <circle cx="18" cy="12" r="3"/>
  <path d="M9.5 12h5"/>
  <path d="M12 9.8l2.5 2.2-2.5 2.2"/>
</svg>`,
  'downward-trend': `<svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 5v16h18"/>
  <path d="M7 11l4 4 3-3 5 5"/>
  <path d="M15 17h4v-4"/>
</svg>`,
  'lab-setting': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M9 3h6"/>
  <path d="M10 3v5L5 19c-.5 1 0 2 1 2h12c1 0 1.5-1 1-2L14 8V3"/>
  <path d="M7.5 14h9"/>
</svg>`,
  'outcome-measure': `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="9"/>
  <circle cx="12" cy="12" r="5.5"/>
  <circle cx="12" cy="12" r="2"/>
</svg>`,
  trial: `<svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M6 4h12l-1 6a5 5 0 01-10 0z"/>
  <path d="M12 16v4"/>
  <path d="M9 20h6"/>
</svg>`,
  default: `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <path d="M7 14l3-3 3 3 4-5"/>
</svg>`,
};

export function preRenderLint(json) {
  const issues = { errors: [], warnings: [] };

  const top = json?.layout?.top_panels ?? [];
  const bottom = json?.layout?.bottom_panels ?? [];
  const total = top.length + bottom.length;

  if (total < 3 || total > 6) {
    issues.errors.push(
      `layout toplam panel sayısı 3-6 aralığında olmalı (şu an: ${total})`,
    );
  }
  if (!json?.header?.title) {
    issues.errors.push('header.title boş');
  }
  for (const [i, p] of [...top, ...bottom].entries()) {
    if (!p?.primary_number) {
      issues.errors.push(`panel[${i}] (${p?.role ?? '?'}) primary_number boş`);
    }
    if (p?.icon_hint && !ICONS[p.icon_hint]) {
      issues.warnings.push(
        `panel[${i}] icon_hint="${p.icon_hint}" bilinmiyor, fallback kullanılacak`,
      );
    }
  }

  const jsonLint = json?._metadata?.lint;
  if (jsonLint && jsonLint.passed === false) {
    const reason =
      jsonLint.rejection_reason ??
      `${jsonLint.errors?.length ?? 0} err, ${jsonLint.warnings?.length ?? 0} warn`;
    issues.errors.push(`JSON lint failed: ${reason}`);
  }

  return issues;
}

export function renderHtml(json) {
  const header = json.header ?? {};
  const journal = header.journal_bar ?? {};
  const footer = json.footer ?? {};
  const keyStats = Array.isArray(footer.key_stats) ? footer.key_stats : [];
  const topPanels = json.layout?.top_panels ?? [];
  const bottomPanels = json.layout?.bottom_panels ?? [];

  const generatedAt = json?._metadata?.generated_at ?? '';
  const schemaVersion = json?._metadata?.schema_version ?? '';
  const subdomain = json?._metadata?.subdomain ?? '';
  const format = json?._metadata?.format ?? '';

  const journalColor = journal.color ?? '#2b6ca3';

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(header.title || 'Graphical Abstract')}</title>
<style>
${STYLES.replace('__JOURNAL_COLOR__', journalColor)}
</style>
</head>
<body>
<main class="card" role="article" aria-label="Graphical abstract">
  <div class="journal-bar">
    <div class="journal-name">${escapeHtml(journal.name ?? 'JAMA')}</div>
  </div>

  <section class="title-block">
    ${header.study_type_prefix ? `<p class="study-type"><strong>${escapeHtml(header.study_type_prefix)}:</strong></p>` : ''}
    <h1 class="study-title">${escapeHtml(header.title ?? '')}</h1>
    ${header.citation ? `<p class="header-citation">${escapeHtml(header.citation)}</p>` : ''}
  </section>

  <section class="panels panels-top" aria-label="Primary panels">
${topPanels.map((p) => renderPanel(p, 'top')).join('\n')}
  </section>

  <section class="panels panels-bottom" aria-label="Secondary panels">
${bottomPanels.map((p) => renderPanel(p, 'bottom')).join('\n')}
  </section>

  <footer class="footer">
    ${keyStats.length ? `<div class="stats">${keyStats.map((s) => `<span class="stat">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
    ${footer.citation ? `<p class="citation">${escapeHtml(footer.citation)}</p>` : ''}
    ${footer.disclaimer ? `<p class="disclaimer">${escapeHtml(footer.disclaimer)}</p>` : ''}
    <div class="footer-row">
      <div class="meta">
        <span>schema v${escapeHtml(schemaVersion)}</span>
        ${format ? `<span>· ${escapeHtml(format)}</span>` : ''}
        ${subdomain ? `<span>· ${escapeHtml(subdomain)}</span>` : ''}
        ${generatedAt ? `<span>· ${escapeHtml(generatedAt)}</span>` : ''}
      </div>
      ${footer.brand ? `<div class="brand">${escapeHtml(footer.brand)}</div>` : ''}
    </div>
  </footer>
</main>
</body>
</html>
`;
}

function renderPanel(p, rowClass) {
  const role = String(p.role ?? '').toLowerCase();
  const icon = ICONS[p.icon_hint] ?? ICONS.default;
  const isFindings = role === 'findings' || role === 'outcome';
  const accentClass = isFindings ? 'panel-accent' : '';
  return `    <article class="panel panel-${escapeAttr(role)} panel-${rowClass} ${accentClass}">
      <div class="icon" aria-hidden="true">${icon}</div>
      <div class="role-title">${escapeHtml(p.title ?? role)}</div>
      <div class="primary">${escapeHtml(p.primary_number ?? '')}</div>
      <p class="body">${escapeHtml(p.body ?? '')}</p>
    </article>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

const STYLES = `:root {
  --ink: #111827;
  --muted: #6b7280;
  --line: #e5e7eb;
  --accent: #059669;
  --journal: __JOURNAL_COLOR__;
  --bg: #ffffff;
  --badge-bg: #ecfdf5;
  --badge-text: #065f46;
  --panel-divider: #e5e7eb;
  --card-shadow: 0 1px 2px rgba(17,24,39,0.05), 0 10px 32px rgba(17,24,39,0.08);
  --bottom-bg: #f9fafb;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  padding: 24px;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
.card {
  max-width: 1123px;
  margin: 0 auto;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.journal-bar {
  background: var(--journal);
  color: white;
  padding: 14px 32px;
}
.journal-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.title-block {
  padding: 20px 32px 18px;
  border-bottom: 2px solid var(--line);
}
.study-type {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--journal);
  font-weight: 700;
}
.study-title {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.25;
}
.header-citation {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}

.panels {
  display: grid;
  background: var(--panel-divider);
  gap: 1px;
}
.panels-top {
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid var(--line);
}
.panels-bottom {
  grid-template-columns: repeat(2, 1fr);
  border-bottom: 2px solid var(--line);
  background: var(--bottom-bg);
}
.panels-bottom .panel {
  background: var(--bottom-bg);
}
.panel {
  background: var(--bg);
  padding: 28px 22px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.panel-bottom {
  padding: 20px 20px 18px;
}
.panel-accent .primary { color: var(--accent); }
.panel-accent .icon { color: var(--accent); }
.panel .icon {
  color: var(--muted);
  margin-bottom: 12px;
}
.panel-bottom .icon { margin-bottom: 8px; }
.role-title {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 12px;
}
.panel-bottom .role-title { margin-bottom: 8px; font-size: 10px; }
.primary {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  word-break: break-word;
}
.panel-bottom .primary { font-size: 20px; margin-bottom: 8px; }
.body {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.5;
  max-width: 270px;
  margin: 0;
}
.panel-bottom .body { font-size: 12px; max-width: 320px; }

.footer {
  padding: 16px 32px 18px;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.stat {
  background: var(--badge-bg);
  color: var(--badge-text);
  padding: 5px 11px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.citation {
  font-size: 12px;
  color: var(--ink);
  margin: 0 0 6px;
  line-height: 1.4;
  font-style: italic;
}
.disclaimer {
  font-size: 11px;
  color: var(--muted);
  margin: 0 0 10px;
  line-height: 1.4;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.meta {
  font-size: 10px;
  color: var(--muted);
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}
.meta span { margin-right: 4px; }
.brand {
  font-size: 10px;
  color: var(--muted);
  font-weight: 600;
  letter-spacing: 0.05em;
}

@page { size: A4 landscape; margin: 12mm; }
@media print {
  body { padding: 0; background: white; }
  .card { border: none; box-shadow: none; border-radius: 0; max-width: 100%; }
}
`;
