// HTML renderer for graphical-abstract JSON (schema v2.0 — jama-asymmetric-v1).
// Renderer is data-transparent: does not validate, recompute, or modify values.

import { ICON_LIBRARY, renderIcon, isKnownIcon } from './icons.mjs';

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
    issues.warnings.push('layout.hero_panel yok — hero alanı boş kalır');
  }
  if (
    hero?.chart &&
    !['slope', 'bar', 'box', 'line', 'donut'].includes(hero.chart.type)
  ) {
    issues.warnings.push(
      `hero_panel.chart.type="${hero.chart.type}" bilinmiyor, icon fallback kullanılacak`,
    );
  }
  for (const [i, p] of all.entries()) {
    const hasPrimary = p?.primary_number != null && String(p.primary_number).trim();
    const hasArms = Array.isArray(p?.arms) && p.arms.length > 0;
    if (!hasPrimary && !hasArms) {
      issues.errors.push(
        `panel[${i}] (${p?.role ?? '?'}) primary_number veya arms[] eksik`,
      );
    }
    if (p?.icon_hint && !isKnownIcon(p.icon_hint)) {
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
  const journalAccent = journal.accent ?? journalColor;

  const cells = [];
  if (top[0])
    cells.push(renderPanel(top[0], { column: 1, rowStart: 1, rowSpan: 1 }, journalAccent));
  if (top[1])
    cells.push(renderPanel(top[1], { column: 2, rowStart: 1, rowSpan: 1 }, journalAccent));
  if (hero) cells.push(renderHeroPanel(hero, journalAccent));
  if (bottom[0])
    cells.push(
      renderPanel(bottom[0], { column: 1, rowStart: 2, rowSpan: 1 }, journalAccent),
    );
  if (bottom[1])
    cells.push(
      renderPanel(bottom[1], { column: 2, rowStart: 2, rowSpan: 1 }, journalAccent),
    );

  const css = STYLES
    .replace(/__JOURNAL_COLOR__/g, journalColor)
    .replace(/__JOURNAL_ACCENT__/g, journalAccent);

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<title>${escapeHtml(header.title || 'Graphical Abstract')}</title>
<style>
${css}
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

function renderPanel(p, pos, accent) {
  const role = String(p.role ?? '').toLowerCase();
  const gp = p.grid_position ?? pos;
  const style = `grid-column: ${gp.column}; grid-row: ${gp.rowStart} / span ${gp.rowSpan};`;

  if (role === 'intervention' && Array.isArray(p.arms) && p.arms.length > 0) {
    return renderInterventionArmsPanel(p, style);
  }
  if (role === 'population') {
    return renderPopulationPanel(p, style);
  }

  const icon = renderIcon(p.icon_hint, { size: 48 });
  return `    <article class="panel panel-${escapeAttr(role)}" style="${style}">
      <div class="icon" aria-hidden="true">${icon}</div>
      <div class="role-title">${escapeHtml(p.title ?? role)}</div>
      <div class="primary">${escapeHtml(p.primary_number ?? '')}</div>
      <p class="body">${escapeHtml(p.body ?? '')}</p>
      ${renderSecondaryNumbers(p.secondary_numbers)}
    </article>`;
}

function renderPopulationPanel(p, style) {
  const role = 'population';
  const icon = renderIcon(p.icon_hint, { size: 44 });
  const primary = p.primary_number
    ? `<div class="primary">${escapeHtml(p.primary_number)}</div>`
    : '';
  const parts = [];
  if (p.condition) {
    parts.push(
      `<div class="panel-context">${escapeHtml(`Adults with ${p.condition}`)}</div>`,
    );
  }
  if (p.eligibility_summary) {
    parts.push(
      `<div class="panel-subtext">${escapeHtml(p.eligibility_summary)}</div>`,
    );
  }
  if (p.age_summary) {
    parts.push(
      `<div class="panel-subtext panel-age">${escapeHtml(p.age_summary)}</div>`,
    );
  }
  if (parts.length === 0 && p.body) {
    parts.push(`<p class="body">${escapeHtml(p.body)}</p>`);
  }
  return `    <article class="panel panel-${role} panel-population-rich" style="${style}">
      <div class="role-title">${escapeHtml(p.title ?? role)}</div>
      ${primary}
      <div class="icon icon-medium" aria-hidden="true">${icon}</div>
      ${parts.join('\n      ')}
      ${renderSecondaryNumbers(p.secondary_numbers)}
    </article>`;
}

function renderInterventionArmsPanel(p, style) {
  const role = 'intervention';
  const headerLine = p.header_number
    ? `<div class="intervention-header">${escapeHtml(p.header_number)} ${escapeHtml(p.header_label ?? 'Patients')}</div>`
    : '';
  const arms = p.arms
    .map((arm) => renderArm(arm))
    .join('\n      ');
  return `    <article class="panel panel-${role} panel-intervention-arms" style="${style}">
      <div class="role-title">${escapeHtml(p.title ?? role)}</div>
      ${headerLine}
      <div class="arms-row">
      ${arms}
      </div>
    </article>`;
}

function renderArm(arm) {
  const icon = renderIcon(arm.icon_hint, { size: 36 });
  const label = arm.n ? `${arm.n} ${arm.label ?? ''}`.trim() : escapeHtml(arm.label ?? '');
  const detailParts = [];
  if (arm.route) detailParts.push(arm.route);
  if (arm.label) detailParts.push(arm.label.toLowerCase());
  if (arm.dose) detailParts.push(arm.dose);
  if (arm.schedule) detailParts.push(arm.schedule);
  const detail = detailParts.length
    ? detailParts.join(', ')
    : escapeHtml(arm.label ?? '');
  return `<div class="arm">
        <div class="arm-icon" aria-hidden="true">${icon}</div>
        <div class="arm-label">${escapeHtml(String(label))}</div>
        <div class="arm-detail">${escapeHtml(detail)}</div>
      </div>`;
}

function renderHeroPanel(p, accent) {
  const role = String(p.role ?? 'findings').toLowerCase();
  const gp = p.grid_position ?? { column: 3, rowStart: 1, rowSpan: 2 };
  const style = `grid-column: ${gp.column}; grid-row: ${gp.rowStart} / span ${gp.rowSpan};`;
  const fallback = renderIcon(p.icon_hint, { size: 120 });
  const chartHtml = renderChart(p.chart, accent) || fallback;
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

function renderChart(chart, accent) {
  if (!chart) return '';
  if (chart.type === 'slope') return renderSlopeChart(chart, accent);
  if (chart.type === 'bar') return renderBarChart(chart, accent);
  if (chart.type === 'line') return renderLineChart(chart, accent);
  if (chart.type === 'donut') return renderDonutChart(chart, accent);
  return '';
}

function renderDonutChart(chart, accent) {
  const groups = chart?.data?.groups ?? [];
  if (groups.length < 2) {
    return '<div class="chart-empty">Donut verisi yetersiz</div>';
  }
  const W = 320, H = 220;
  const r = 44, sw = 18;
  const circumference = 2 * Math.PI * r;
  const donuts = groups
    .slice(0, 2)
    .map((g, i) => {
      const pct = Number(g.value) || 0;
      const cx = 80 + i * 160;
      const cy = 100;
      const dash = (pct / 100) * circumference;
      const gap = circumference - dash;
      const color = i === 0 ? '#94a3b8' : accent;
      return `<g transform="translate(${cx}, ${cy})">
    <circle r="${r}" fill="none" stroke="#e5e7eb" stroke-width="${sw}"/>
    <circle r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      transform="rotate(-90)" stroke-linecap="round"/>
    <text text-anchor="middle" y="6" font-size="18" font-weight="700" fill="#111827" font-family="system-ui, sans-serif">${pct.toFixed(1)}%</text>
    <text text-anchor="middle" y="${r + 30}" font-size="11" fill="#374151" font-family="system-ui, sans-serif">${escapeHtml(g.label ?? '')}</text>
  </g>`;
    })
    .join('\n  ');
  return `<svg viewBox="0 0 ${W} ${H}" class="slope-chart chart-donut" aria-label="Donut chart">
  ${donuts}
</svg>`;
}

function renderLineChart(chart, accent) {
  const { data, annotations = [] } = chart;
  const series = data?.series ?? [];
  const xValues = data?.x_axis?.values ?? [];
  if (series.length === 0 || xValues.length < 2) {
    return '<div class="chart-empty">Line chart verisi yetersiz</div>';
  }

  const W = 360, H = 220;
  const pad = { top: 28, right: 100, bottom: 42, left: 44 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const xMin = xValues[0];
  const xMax = xValues[xValues.length - 1];
  const xScale = (x) =>
    pad.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;

  const allVals = series.flatMap((s) => s.values ?? []).map(Number);
  const yMin = data?.y_axis?.min ?? 0;
  const yMax = data?.y_axis?.max ?? Math.max(...allVals, 10) * 1.1;
  const yScale = (y) => pad.top + plotH * (1 - (y - yMin) / (yMax - yMin || 1));

  const gray = '#94a3b8';
  const seriesSvg = series
    .map((s) => {
      const color = s.accent ? accent : gray;
      const vals = s.values ?? [];
      const points = vals
        .map((v, i) => `${xScale(xValues[i])},${yScale(Number(v))}`)
        .join(' ');
      const dots = vals
        .map(
          (v, i) =>
            `<circle cx="${xScale(xValues[i])}" cy="${yScale(Number(v))}" r="3.5" fill="${color}"/>`,
        )
        .join('');
      const lastX = xScale(xValues[vals.length - 1]);
      const lastY = yScale(Number(vals[vals.length - 1]));
      return `
  <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
  ${dots}
  <text x="${lastX + 6}" y="${lastY + 3}" font-size="10" fill="${color}" font-family="system-ui, sans-serif" font-weight="600">${escapeHtml(s.label ?? '')}</text>`;
    })
    .join('');

  const xTicks = xValues
    .map(
      (x) =>
        `<text x="${xScale(x)}" y="${pad.top + plotH + 14}" font-size="10" text-anchor="middle" fill="#64748b" font-family="system-ui, sans-serif">${x}</text>`,
    )
    .join('');
  const yTickValues = [yMin, yMin + (yMax - yMin) / 2, yMax].map((v) =>
    Math.round(v),
  );
  const yTicks = yTickValues
    .map(
      (y) =>
        `<text x="${pad.left - 6}" y="${yScale(y) + 3}" font-size="10" text-anchor="end" fill="#64748b" font-family="system-ui, sans-serif">${y}</text>
  <line x1="${pad.left - 3}" y1="${yScale(y)}" x2="${pad.left}" y2="${yScale(y)}" stroke="#d1d5db" stroke-width="1"/>`,
    )
    .join('');

  const deltaAnno = annotations.find((a) => a.type === 'delta');
  const deltaText = deltaAnno
    ? `<text x="${pad.left + plotW / 2}" y="18" text-anchor="middle" fill="${accent}" font-size="12" font-weight="700" font-family="system-ui, sans-serif">${escapeHtml(deltaAnno.value)}</text>`
    : '';

  const xLabel = data?.x_axis?.label
    ? `<text x="${pad.left + plotW / 2}" y="${H - 6}" text-anchor="middle" fill="#64748b" font-size="10" font-family="system-ui, sans-serif">${escapeHtml(data.x_axis.label)}</text>`
    : '';

  return `<svg viewBox="0 0 ${W} ${H}" class="slope-chart chart-line" aria-label="Line chart">
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}" stroke="#d1d5db" stroke-width="1"/>
  <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="#d1d5db" stroke-width="1"/>
  ${yTicks}
  ${xTicks}
  ${seriesSvg}
  ${deltaText}
  ${xLabel}
</svg>`;
}

function renderBarChart(chart, accent) {
  const { data, annotations = [] } = chart;
  const points = data?.points ?? [];
  if (points.length < 2) {
    return '<div class="chart-empty">Chart verisi yetersiz</div>';
  }

  const W = 300, H = 200;
  const pad = { top: 36, right: 30, bottom: 36, left: 50 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const values = points.map((p) => Number(p.value));
  const vMax = Math.max(...values);
  const yMax = vMax * 1.2;

  const barCount = points.length;
  const barWidth = (plotW / barCount) * 0.55;
  const slotW = plotW / barCount;

  const bars = points
    .map((p, i) => {
      const x = pad.left + slotW * i + (slotW - barWidth) / 2;
      const h = (Number(p.value) / yMax) * plotH;
      const y = pad.top + plotH - h;
      return `<g>
    <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="${accent}" rx="2"/>
    <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" fill="#111827" font-size="12" font-weight="700" font-family="system-ui, sans-serif">${Number(p.value).toFixed(1)}${data.unit ?? ''}</text>
    <text x="${x + barWidth / 2}" y="${pad.top + plotH + 18}" text-anchor="middle" fill="#374151" font-size="11" font-family="system-ui, sans-serif">${escapeHtml(p.label)}</text>
  </g>`;
    })
    .join('\n  ');

  const deltaAnno = annotations.find((a) => a.type === 'delta');
  const deltaText = deltaAnno
    ? `<text x="${W / 2}" y="22" text-anchor="middle" fill="${accent}" font-size="14" font-weight="700" font-family="system-ui, sans-serif">${escapeHtml(deltaAnno.value)}</text>`
    : '';

  return `<svg viewBox="0 0 ${W} ${H}" class="slope-chart chart-bar" aria-label="Bar chart">
  <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="#d1d5db" stroke-width="1"/>
  ${deltaText}
  ${bars}
</svg>`;
}

function renderSlopeChart(chart, accent) {
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
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${accent}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="${x1}" cy="${y1}" r="6" fill="${accent}"/>
  <circle cx="${x2}" cy="${y2}" r="6" fill="${accent}"/>
  <text x="${x1}" y="${y1 - 12}" text-anchor="middle" fill="#111827" font-size="12" font-weight="700" font-family="system-ui, sans-serif">${values[0].toFixed(2)}</text>
  <text x="${x2}" y="${y2 - 12}" text-anchor="middle" fill="#111827" font-size="12" font-weight="700" font-family="system-ui, sans-serif">${values[1].toFixed(2)}</text>
  <text x="${x1}" y="${pad.top + plotH + 18}" text-anchor="middle" fill="#374151" font-size="11" font-family="system-ui, sans-serif">${escapeHtml(points[0].label)}</text>
  <text x="${x2}" y="${pad.top + plotH + 18}" text-anchor="middle" fill="#374151" font-size="11" font-family="system-ui, sans-serif">${escapeHtml(points[1].label)}</text>
  ${deltaAnno ? `<text x="${deltaX}" y="${deltaY}" text-anchor="middle" fill="${accent}" font-size="14" font-weight="700" font-family="system-ui, sans-serif">${escapeHtml(deltaAnno.value)}</text>` : ''}
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
  --journal: __JOURNAL_COLOR__;
  --journal-accent: __JOURNAL_ACCENT__;
  --bg: #ffffff;
  --badge-bg: #f0fdf4;
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
  font-family: "Helvetica Neue", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
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
  grid-template-columns: 1fr 1fr 1.3fr;
  grid-template-rows: 1fr 1fr;
  background: var(--panel-divider);
  gap: 1px;
  border-bottom: 2px solid var(--line);
}
.panel {
  background: var(--bg);
  padding: 22px 20px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.panel .icon {
  color: var(--muted);
  margin-bottom: 10px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel .icon-medium { width: 40px; height: 40px; }
.panel .icon svg, .icon-wrapper svg { width: 100%; height: 100%; }
.role-title {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  margin-bottom: 10px;
}
.primary {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
  line-height: 1.15;
  letter-spacing: -0.01em;
  word-break: break-word;
  color: var(--journal-accent);
}
.body {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.5;
  max-width: 280px;
  margin: 0;
}

/* Population enriched */
.panel-population-rich .primary { color: var(--ink); font-size: 20px; }
.panel-context {
  font-size: 13px;
  color: var(--ink);
  line-height: 1.4;
  margin-top: 4px;
  max-width: 280px;
  font-weight: 500;
}
.panel-subtext {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  margin-top: 6px;
  max-width: 280px;
}
.panel-age { font-variant-numeric: tabular-nums; }

/* Intervention arms */
.panel-intervention-arms {
  padding-top: 22px;
}
.intervention-header {
  font-size: 13px;
  color: var(--ink);
  font-weight: 600;
  margin-bottom: 14px;
  max-width: 280px;
  line-height: 1.4;
}
.arms-row {
  display: flex;
  gap: 14px;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}
.arm {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.arm-icon {
  width: 44px;
  height: 44px;
  color: var(--journal);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.arm-icon svg, .arm .icon-wrapper svg { width: 100%; height: 100%; }
.arm-label {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 4px;
  line-height: 1.2;
}
.arm-detail {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.4;
  max-width: 140px;
}

/* Hero panel */
.panel-hero {
  background: var(--hero-bg);
  border-left: 1px solid var(--line);
  padding: 26px 26px 22px;
  justify-content: flex-start;
}
.panel-hero .role-title { color: var(--journal); font-size: 12px; }
.panel-hero .primary {
  font-size: 40px;
  color: var(--journal-accent);
  margin-bottom: 12px;
  line-height: 1.05;
}
.panel-hero .body {
  font-size: 13px;
  max-width: 340px;
  margin-bottom: 14px;
  color: var(--ink);
}
.panel-hero .chart-slot {
  margin-top: auto;
  width: 100%;
  min-height: 200px;
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--journal-accent);
}
.panel-hero .chart-slot .slope-chart { width: 100%; max-width: 360px; height: auto; }
.panel-hero .chart-slot .icon-wrapper svg { width: 110px; height: 110px; opacity: 0.85; }

/* Badges */
.secondary-numbers {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}
.stat-badge {
  font-size: 11px;
  padding: 3px 9px;
  background: var(--badge-bg);
  color: var(--journal-accent);
  border-radius: 4px;
  font-weight: 600;
  font-family: "Helvetica Neue", system-ui, sans-serif;
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

.footer { padding: 14px 32px 16px; }
.citation {
  font-size: 11px;
  color: var(--ink);
  margin: 0 0 4px;
  line-height: 1.4;
  font-style: italic;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.disclaimer { font-size: 10px; color: var(--muted); margin: 0; }
.brand { font-size: 10px; color: var(--muted); font-weight: 600; letter-spacing: 0.05em; }

@page { size: A4 landscape; margin: 12mm; }
@media print {
  body { padding: 0; background: white; }
  .card { border: none; box-shadow: none; border-radius: 0; max-width: 100%; }
}
`;
