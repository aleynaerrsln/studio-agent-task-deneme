// Dynamic journal identity — KB'den "JAMA Xxx" çıkarır ve renk paletini döner.

export const JOURNAL_COLORS = {
  'JAMA Dermatology': { color: '#046e45', accent: '#059669' },
  'JAMA Internal Medicine': { color: '#2b6ca3', accent: '#0369a1' },
  'JAMA Oncology': { color: '#7c3aed', accent: '#8b5cf6' },
  'JAMA Pediatrics': { color: '#ea580c', accent: '#f97316' },
  'JAMA Cardiology': { color: '#dc2626', accent: '#ef4444' },
  'JAMA Neurology': { color: '#4f46e5', accent: '#6366f1' },
  'JAMA Surgery': { color: '#475569', accent: '#64748b' },
  'JAMA Psychiatry': { color: '#0891b2', accent: '#06b6d4' },
  'JAMA Ophthalmology': { color: '#be185d', accent: '#ec4899' },
  JAMA: { color: '#1e40af', accent: '#2563eb' },
};

const FALLBACK = { name: 'Medical Journal', color: '#64748b', accent: '#475569' };

export function detectJournal(text) {
  const s = String(text ?? '');
  // Spesifik isim tanıma (uzun isimler önce — "JAMA Dermatology" > "JAMA")
  const ordered = Object.keys(JOURNAL_COLORS).sort(
    (a, b) => b.length - a.length,
  );
  for (const name of ordered) {
    const re = new RegExp(`\\b${name.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (re.test(s)) {
      return { name, ...JOURNAL_COLORS[name] };
    }
  }
  return { ...FALLBACK };
}

export function resolveJournalColor(name) {
  if (!name) return { ...FALLBACK };
  return JOURNAL_COLORS[name]
    ? { name, ...JOURNAL_COLORS[name] }
    : { ...FALLBACK, name };
}
