/*
 * Icon SVG paths derived from Lucide (https://lucide.dev), MIT License.
 * Custom icons (skin-cross-section, scalpel, inhaler) are original minimal SVGs.
 * All viewBox 0 0 24 24, stroke="currentColor", stroke-width="1.75", fill="none".
 */

const BASE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

export const ICON_LIBRARY = {
  // Population / disease
  'patients-cohort': `<svg ${BASE}><circle cx="9" cy="7" r="3"/><path d="M3 21c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.2"/><path d="M14 21c0-2.2 1.6-4.2 4-4.7"/></svg>`,
  'skin-cross-section': `<svg ${BASE}><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><circle cx="8" cy="14" r="1.5"/><circle cx="14" cy="14" r="1"/><path d="M17 14c-.5 1 0 2 1 2"/></svg>`,
  brain: `<svg ${BASE}><path d="M12 5a3 3 0 0 0-3-3 3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 1 2.2 3 3 0 0 0-1 2.3 3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3"/><path d="M12 5a3 3 0 0 1 3-3 3 3 0 0 1 3 3v1a3 3 0 0 1 3 3v1a3 3 0 0 1-1 2.2 3 3 0 0 1 1 2.3 3 3 0 0 1-3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3"/><path d="M12 5v14"/></svg>`,
  heart: `<svg ${BASE}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  lungs: `<svg ${BASE}><path d="M6.08 10c-1.23.7-2.08 2-2.08 3.5V18a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-8"/><path d="M17.92 10c1.23.7 2.08 2 2.08 3.5V18a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-8"/><path d="M12 3v13"/><path d="M8 10h8"/></svg>`,
  baby: `<svg ${BASE}><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>`,
  bone: `<svg ${BASE}><path d="M17 10c.7-.7 1.7-1.1 2.7-.8a3 3 0 0 1 2.1 2.1c.3 1-.1 2-.8 2.7l-7.8 7.8a3 3 0 0 1-2.7.8 3 3 0 0 1-2.1-2.1c-.3-1 .1-2 .8-2.7l7.8-7.8z"/><path d="M10 17c-.7.7-1.7 1.1-2.7.8a3 3 0 0 1-2.1-2.1c-.3-1 .1-2 .8-2.7l7.8-7.8a3 3 0 0 1 2.7-.8 3 3 0 0 1 2.1 2.1c.3 1-.1 2-.8 2.7"/></svg>`,

  // Intervention / route
  syringe: `<svg ${BASE}><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-3.1.6-4.1-.4-1-1-1.4-3.1-.4-4.1L14.5 4.5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14.5 4.5 5 5"/></svg>`,
  pill: `<svg ${BASE}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
  capsule: `<svg ${BASE}><path d="M10.5 20.5a7 7 0 1 1 0-14L14 3a7 7 0 1 1 7 7l-3.5 3.5"/><path d="M10.5 6.5 17.5 13.5"/></svg>`,
  'iv-drip': `<svg ${BASE}><path d="M12 22v-5"/><path d="M9 7h6"/><path d="M12 7V3"/><path d="M10 3h4"/><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M12 12v3"/></svg>`,
  inhaler: `<svg ${BASE}><rect x="8" y="4" width="8" height="12" rx="1"/><path d="M10 16v3h4v-3"/><path d="M10 4V3h4v1"/><path d="M12 8v4"/></svg>`,
  scalpel: `<svg ${BASE}><path d="M14 3l7 7-4 4-7-7 4-4z"/><path d="M10 7l-7 7 3 3 7-7"/></svg>`,
  stethoscope: `<svg ${BASE}><path d="M4 2v7a5 5 0 0 0 10 0V2"/><path d="M4 2h2"/><path d="M12 2h2"/><path d="M9 14v2a4 4 0 0 0 8 0v-1"/><circle cx="19" cy="12" r="2"/></svg>`,
  trial: `<svg ${BASE}><path d="M10 2v7.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V2"/><path d="M8 2h8"/><path d="M7 16h10"/></svg>`,

  // Outcome / chart
  'downward-trend': `<svg ${BASE}><path d="M22 17l-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></svg>`,
  'upward-trend': `<svg ${BASE}><path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>`,
  'bar-comparison': `<svg ${BASE}><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/></svg>`,
  'line-chart': `<svg ${BASE}><path d="M3 3v18h18"/><path d="M7 15l4-4 4 3 5-7"/></svg>`,
  activity: `<svg ${BASE}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  'outcome-measure': `<svg ${BASE}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/></svg>`,
  'before-after-comparison': `<svg ${BASE}><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M9.5 12h5"/><path d="M12 9.8l2.5 2.2-2.5 2.2"/></svg>`,

  // Settings
  globe: `<svg ${BASE}><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>`,
  hospital: `<svg ${BASE}><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>`,
  'map-pin': `<svg ${BASE}><path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  'lab-setting': `<svg ${BASE}><path d="M9 3h6"/><path d="M10 3v5L5 19c-.5 1 0 2 1 2h12c1 0 1.5-1 1-2L14 8V3"/><path d="M7.5 14h9"/></svg>`,

  // Generic
  clipboard: `<svg ${BASE}><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>`,
  flask: `<svg ${BASE}><path d="M10 2v7.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V2"/><path d="M8 2h8"/></svg>`,
  microscope: `<svg ${BASE}><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14"/><path d="M9 14h2"/><path d="M8 6 L10 6 L10 10 L8 10 Z"/><path d="M9 2v2"/></svg>`,

  // Iter-20 additions
  'users-group': `<svg ${BASE}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  money: `<svg ${BASE}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01"/><path d="M18 12h.01"/></svg>`,
  prohibition: `<svg ${BASE}><circle cx="12" cy="12" r="9"/><path d="M5.5 5.5l13 13"/></svg>`,
  network: `<svg ${BASE}><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><circle cx="12" cy="12" r="2"/><path d="M12 7v3"/><path d="M12 14l-5.5 3.5"/><path d="M12 14l5.5 3.5"/></svg>`,
  conversation: `<svg ${BASE}><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/><path d="M3 10a7 7 0 0 1 7-7h4a7 7 0 1 1 0 14h-4a7 7 0 0 1-4-1l-3 1 1-3a7 7 0 0 1-1-4z"/></svg>`,
  kidney: `<svg ${BASE}><path d="M12 3c-4 0-7 3-7 7 0 2 1 4 2 5 1 1 1 3 1 4 0 1 1 2 2 2h4c1 0 2-1 2-2 0-1 0-3 1-4 1-1 2-3 2-5 0-4-3-7-7-7z"/><path d="M12 8v4"/></svg>`,

  default: `<svg ${BASE}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 14l3-3 3 3 4-5"/></svg>`,
};

export function renderIcon(hint, { size = 48 } = {}) {
  const svg = ICON_LIBRARY[hint] ?? ICON_LIBRARY.default;
  return `<span class="icon-wrapper" style="width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center">${svg}</span>`;
}

export function isKnownIcon(hint) {
  return Boolean(ICON_LIBRARY[hint]);
}
