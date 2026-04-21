// HTML renderer for graphical-abstract JSON (schema v1.1 — jama-asymmetric-v1).
// Renderer is data-transparent: does not validate, recompute, or modify values.

const ICONS = {
  'patients-cohort': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="9" cy="8" r="3"/>
  <path d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/>
  <circle cx="17" cy="10" r="2.3"/>
  <path d="M14.5 20c0-2.5 1.6-4.5 3.5-4.8"/>
</svg>`,
  'before-after-comparison': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="6" cy="12" r="3"/>
  <circle cx="18" cy="12" r="3"/>
  <path d="M9.5 12h5"/>
  <path d="M12 9.8l2.5 2.2-2.5 2.2"/>
</svg>`,
  'downward-trend': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M3 5v16h18"/>
  <path d="M7 11l4 4 3-3 5 5"/>
  <path d="M15 17h4v-4"/>
</svg>`,
  'lab-setting': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M9 3h6"/>
  <path d="M10 3v5L5 19c-.5 1 0 2 1 2h12c1 0 1.5-1 1-2L14 8V3"/>
  <path d="M7.5 14h9"/>
</svg>`,
  'outcome-measure': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <circle cx="12" cy="12" r="9"/>
  <circle cx="12" cy="12" r="5.5"/>
  <circle cx="12" cy="12" r="2"/>
</svg>`,
  trial: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M6 4h12l-1 6a5 5 0 01-10 0z"/>
  <path d="M12 16v4"/>
  <path d="M9 20h6"/>
</svg>`,
  default: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="3" width="18" height="18" rx="2"/>
  <path d="M7 14l3-3 3 3 4-5"/>
</svg>`,
};

export function preRenderLint(json) {
  const issues = { errors: [], warnings: [] };

  const top = json?.layout?.top_panels ?? [];
  const bottom = json?.layout?.bottom_panels ?? [];
  const hero = json?.layout?.hero_panel ?? null;
  const all = [...top, ...bottom, ...(hero ? [hero] : [])];
  const total = all.length;

  if (total < 3 || total > 6) {
    issues.errors.push(
      `layout toplam panel sayısı 3-6 aralığında olmalı (şu an: ${total})`,
    );
  }
  if (!json?.header?.title) {
    issues.errors.push('header.title boş');
  }
  if (!hero) {
    issues.warnings.push(
      'layout.hero_panel yok — schema v1.0 fallback davranışı uygulanacak (hero alanı boş kalır)',
    );
  }
  if (hero?.chart && !['slope', 'bar', 'box', 'line'].includes(hero.chart.type)) {
    issues.warnings.push(
      `hero_panel.chart.type="${hero.chart.type}" bilinmiyor, icon fallback kullanılacak`,
    );
  }
  for (const [i, p] of all.entries()) {
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
  const top = json.layout?.top_panels ?? [];
  const bottom = json.layout?.bottom_panels ?? [];
  const hero = json.layout?.hero_panel ?? null;

  const journalColor = journal.color ?? '#2b6ca3';

  // Grid cells for 3 columns × 2 rows.
  // Top row: top_panels[0] @ col 1, top_panels[1] @ col 2, hero @ col 3 (rowSpan 2)
  // Bottom row: bottom_panels[0] @ col 1, bottom_panels[1] @ col 2
  const cells = [];
  if (top[0]) cells.push(renderPanel(top[0], { column: 1, rowStart: 1, rowSpan: 1 }));
  if (top[1]) cells.push(renderPanel(top[1], { column: 2, rowStart: 1, rowSpan: 1 }));
  if (hero) cells.push(renderHeroPanel(hero));
  if (bottom[0]) cells.push(renderPanel(bottom[0], { column: 1, rowStart: 2, rowSpan: 1 }));
  if (bottom[1]) cells.push(renderPanel(bottom[1], { column: 2, rowStart: 2, rowSpan: 1 }));

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

  <section class="panels-grid" aria-label="Asymmetric panel grid">
${cells.join('\n')}
  </section>

  <footer class="footer">
    ${footer.citation ? `<p class="citation">${escapeHtml(footer.citation)}</p>` : ''}
    <div class="footer-row">
      ${footer.disclaimer ? `<p class="disclaimer">${escapeHtml(footer.disclaimer)}</p>` : '<span></span>'}
      ${footer.brand ? `<div class="brand">${escapeHtml(footer.brand)}</div>` : ''}
    </div>
  </footer>
</main>
</body>
</html>
`;
}

function renderPanel(p, pos) {
  const role = String(p.role ?? '').toLowerCase();
  const icon = ICONS[p.icon_hint] ?? ICONS.default;
  const gp = p.grid_position ?? pos;
  const style = `grid-column: ${gp.column}; grid-row: ${gp.rowStart} / span ${gp.rowSpan};`;
  return `    <article class="panel panel-${escapeAttr(role)}" style="${style}">
      <div class="icon" aria-hidden="true">${icon}</div>
      <div class="role-title">${escapeHtml(p.title ?? role)}</div>
      <div class="primary">${escapeHtml(p.primary_number ?? '')}</div>
      <p class="body">${escapeHtml(p.body ?? '')}</p>
      ${renderSecondaryNumbers(p.secondary_numbers)}
    </article>`;
}

function renderHeroPanel(p) {
  const role = String(p.role ?? 'findings').toLowerCase();
  const icon = ICONS[p.icon_hint] ?? ICONS.default;
  const gp = p.grid_position ?? { column: 3, rowStart: 1, rowSpan: 2 };
  const style = `grid-column: ${gp.column}; grid-row: ${gp.rowStart} / span ${gp.rowSpan};`;
  const chartHtml = p.chart?.type === 'slope' ? renderSlopeChart(p.chart) : icon;
  return `    <article class="panel panel-hero panel-${escapeAttr(role)}" style="${style}">
      <div class="role-title">${escapeHtml(p.title ?? role)}</div>
      <div class="primary">${escapeHtml(p.primary_number ?? '')}</div>
      <p class="body">${escapeHtml(p.body ?? '')}</p>
      ${renderSecondaryNumbers(p.secondary_numbers)}
      <div class="chart-slot" aria-label="chart">
        ${chartHtml}
      </div>
    </article>`;
}

function renderSecondaryNumbers(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  return `<div class="secondary-numbers">${list
    .map(
      (n) =>
        `<span class="stat-badge"><span class="badge-label">${escapeHtml(n.label)}</span>${escapeHtml(n.value)}</span>`,
    )
    .join('')}</div>`;
}

function renderSlopeChart(chart) {
  const { data, annotations = [] } = chart;
  const points = data?.points ?? [];
  if (points.length < 2) {
    return '<div class="chart-empty">Chart verisi yetersiz</div>';
  }

  const W = 300, H = 200;
  const pad = { top: 24, right: 44, bottom: 36, left: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const values = points.map((p) => Number(p.value));
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const range = vMax - vMin || 1;
  const yMin = vMin - range * 0.15;
  const yMax = vMax + range * 0.15;

  const x1 = pad.left + plotW * 0.18;
  const x2 = pad.left + plotW * 0.82;
  const yScale = (v) => pad.top + plotH * (1 - (v - yMin) / (yMax - yMin));
  const y1 = yScale(values[0]);
  const y2 = yScale(values[1]);

  const yTicks = [vMin, vMax].map((v) => ({
    label: v.toFixed(1),
    y: yScale(v),
  }));

  const deltaAnno = annotations.find((a) => a.type === 'delta');
  const deltaX = (x1 + x2) / 2;
  const deltaY = Math.min(y1, y2) - 14;

  return `<svg viewBox="0 0 ${W} ${H}" class="slope-chart" aria-label="Slope chart">
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}" stroke="#d1d5db" stroke-width="1"/>
  <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="#d1d5db" stroke-width="1"/>
  ${yTicks
    .map(
      (t) =>
        `<text x="${pad.left - 8}" y="${t.y + 4}" text-anchor="end" fill="#6b7280" font-size="10" font-family="system-ui, sans-serif">${t.label}</text>
  <line x1="${pad.left - 3}" y1="${t.y}" x2="${pad.left}" y2="${t.y}" stroke="#d1d5db" stroke-width="1"/>`,
    )
    .join('\n  ')}
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#059669" stroke-width="3" stroke-linecap="round"/>
  <circle cx="${x1}" cy="${y1}" r="6" fill="#059669"/>
  <circle cx="${x2}" cy="${y2}" r="6" fill="#059669"/>
  <text x="${x1}" y="${y1 - 12}" text-anchor="middle" fill="#111827" font-size="12" font-weight="700" font-family="system-ui, sans-serif">${values[0].toFixed(2)}</text>
  <text x="${x2}" y="${y2 - 12}" text-anchor="middle" fill="#111827" font-size="12" font-weight="700" font-family="system-ui, sans-serif">${values[1].toFixed(2)}</text>
  <text x="${x1}" y="${pad.top + plotH + 18}" text-anchor="middle" fill="#374151" font-size="11" font-family="system-ui, sans-serif">${escapeHtml(points[0].label)}</text>
  <text x="${x2}" y="${pad.top + plotH + 18}" text-anchor="middle" fill="#374151" font-size="11" font-family="system-ui, sans-serif">${escapeHtml(points[1].label)}</text>
  ${deltaAnno ? `<text x="${deltaX}" y="${deltaY}" text-anchor="middle" fill="#059669" font-size="14" font-weight="700" font-family="system-ui, sans-serif">${escapeHtml(deltaAnno.value)}</text>` : ''}
</svg>`;
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
  --hero-bg: #f8f9fa;
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

.panels-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.25fr;
  grid-template-rows: 1fr 1fr;
  background: var(--panel-divider);
  gap: 1px;
  border-bottom: 2px solid var(--line);
}
.panel {
  background: var(--bg);
  padding: 24px 22px 22px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.panel .icon {
  color: var(--muted);
  margin-bottom: 12px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel .icon svg { width: 100%; height: 100%; }
.role-title {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 12px;
}
.primary {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 10px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  word-break: break-word;
}
.body {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.5;
  max-width: 270px;
  margin: 0;
}

/* Hero panel — tam yükseklik, sağda, chart slot */
.panel-hero {
  background: var(--hero-bg);
  border-left: 1px solid var(--line);
  padding: 28px 28px 24px;
  justify-content: flex-start;
}
.panel-hero .role-title {
  color: var(--journal);
  font-size: 12px;
}
.panel-hero .primary {
  font-size: 44px;
  color: var(--accent);
  margin-bottom: 14px;
  line-height: 1.05;
}
.panel-hero .body {
  font-size: 14px;
  max-width: 320px;
  margin-bottom: 20px;
}
.panel-hero .chart-slot {
  margin-top: auto;
  width: 100%;
  min-height: 200px;
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
}
.panel-hero .chart-slot .slope-chart {
  width: 100%;
  max-width: 320px;
  height: auto;
}
.panel-hero .chart-slot svg:not(.slope-chart) {
  width: 120px;
  height: 120px;
  opacity: 0.8;
}

/* Panel secondary_numbers badges */
.secondary-numbers {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 10px;
}
.stat-badge {
  font-size: 11px;
  padding: 3px 9px;
  background: var(--badge-bg);
  color: var(--badge-text);
  border-radius: 4px;
  font-weight: 600;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, monospace;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}
.stat-badge .badge-label {
  color: var(--muted);
  font-weight: 500;
  font-size: 10px;
  text-transform: lowercase;
}
.panel-hero .secondary-numbers {
  justify-content: flex-start;
  margin-top: 4px;
}

.footer {
  padding: 16px 32px 18px;
}
.citation {
  font-size: 12px;
  color: var(--ink);
  margin: 0 0 6px;
  line-height: 1.4;
  font-style: italic;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.disclaimer {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  line-height: 1.4;
}
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
