// HTML renderer for graphical-abstract JSON.
// Renderer is data-transparent: does not validate, recompute, or modify values.
// Consumes JSON and produces a single self-contained HTML file.

const ICONS = {
  'patients-cohort': `<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="9" cy="8" r="3"/>
  <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/>
  <circle cx="17" cy="10" r="2.3"/>
  <path d="M14.5 20c0-2.5 1.6-4.5 3.5-4.8"/>
</svg>`,
  'before-after-comparison': `<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="6" cy="12" r="3"/>
  <circle cx="18" cy="12" r="3"/>
  <path d="M9.5 12h5"/>
  <path d="M12 9.8l2.5 2.2-2.5 2.2"/>
</svg>`,
  'downward-trend': `<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 5v16h18"/>
  <path d="M7 11l4 4 3-3 5 5"/>
  <path d="M15 17h4v-4"/>
</svg>`,
  default: `<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <path d="M7 14l3-3 3 3 4-5"/>
</svg>`,
};

export function preRenderLint(json) {
  const issues = { errors: [], warnings: [] };

  if (!Array.isArray(json?.panels) || json.panels.length !== 3) {
    issues.errors.push(
      `panels.length 3 olmalı (şu an: ${json?.panels?.length ?? 0})`,
    );
  }
  if (!json?.header?.title) {
    issues.errors.push('header.title boş');
  }
  for (const [i, p] of (json?.panels ?? []).entries()) {
    if (!p?.primary_number) {
      issues.errors.push(`panel[${i}] primary_number boş`);
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
  const panels = [...(json.panels ?? [])].sort((a, b) => {
    const order = { left: 0, center: 1, right: 2 };
    return (order[a.position] ?? 99) - (order[b.position] ?? 99);
  });

  const header = json.header ?? {};
  const footer = json.footer ?? {};
  const keyStats = Array.isArray(footer.key_stats) ? footer.key_stats : [];
  const generatedAt = json?._metadata?.generated_at ?? '';
  const schemaVersion = json?._metadata?.schema_version ?? '';
  const subdomain = json?._metadata?.subdomain ?? '';

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(header.title || 'Graphical Abstract')}</title>
<style>
${STYLES}
</style>
</head>
<body>
<main class="card" role="article" aria-label="Graphical abstract">
  <header class="header">
    <div class="header-text">
      <h1 class="title">${escapeHtml(header.title ?? '')}</h1>
      ${header.citation ? `<div class="citation">${escapeHtml(header.citation)}</div>` : ''}
    </div>
    ${header.journal_hint ? `<div class="journal-badge">${escapeHtml(header.journal_hint)}</div>` : ''}
  </header>

  <section class="panels" aria-label="PICO panels">
${panels.map(renderPanel).join('\n')}
  </section>

  <footer class="footer">
    ${keyStats.length ? `<div class="stats">${keyStats.map((s) => `<span class="stat">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
    ${footer.disclaimer ? `<p class="disclaimer">${escapeHtml(footer.disclaimer)}</p>` : ''}
    <div class="meta">
      <span>schema v${escapeHtml(schemaVersion)}</span>
      ${subdomain ? `<span>· ${escapeHtml(subdomain)}</span>` : ''}
      ${generatedAt ? `<span>· ${escapeHtml(generatedAt)}</span>` : ''}
    </div>
  </footer>
</main>
</body>
</html>
`;
}

function renderPanel(p) {
  const role = String(p.role ?? '').toLowerCase();
  const icon = ICONS[p.icon_hint] ?? ICONS.default;
  return `    <article class="panel panel-${escapeAttr(role)}" data-position="${escapeAttr(p.position ?? '')}">
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
  --bg: #ffffff;
  --badge-bg: #ecfdf5;
  --badge-text: #065f46;
  --panel-divider: #f3f4f6;
  --card-shadow: 0 1px 2px rgba(17,24,39,0.05), 0 8px 24px rgba(17,24,39,0.06);
  --panel-alt-bg: #fafbfc;
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
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 32px 20px;
  border-bottom: 2px solid var(--line);
}
.title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 6px;
  line-height: 1.25;
  letter-spacing: -0.01em;
}
.citation {
  font-size: 13px;
  color: var(--muted);
  font-style: italic;
  line-height: 1.4;
}
.journal-badge {
  flex-shrink: 0;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  border: 1px solid var(--line);
  background: #fafbfc;
  padding: 6px 12px;
  border-radius: 999px;
  font-weight: 600;
}
.panels {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  background: var(--panel-divider);
  gap: 1px;
  border-bottom: 2px solid var(--line);
}
.panel {
  background: var(--bg);
  padding: 32px 24px 28px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.panel-outcome {
  background: var(--panel-alt-bg);
}
.panel .icon {
  color: var(--muted);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel-outcome .icon { color: var(--accent); }
.role-title {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 14px;
}
.primary {
  font-size: 30px;
  font-weight: 700;
  margin-bottom: 14px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  word-break: break-word;
}
.panel-outcome .primary { color: var(--accent); }
.body {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.55;
  max-width: 280px;
  margin: 0;
}
.footer {
  padding: 18px 32px 22px;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
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
.disclaimer {
  font-size: 11px;
  color: var(--muted);
  margin: 0 0 10px;
  line-height: 1.4;
}
.meta {
  font-size: 10px;
  color: var(--muted);
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
.meta span { margin-right: 4px; }
@page {
  size: A4 landscape;
  margin: 14mm;
}
@media print {
  body { padding: 0; background: white; }
  .card { border: none; box-shadow: none; border-radius: 0; max-width: 100%; }
}
`;
