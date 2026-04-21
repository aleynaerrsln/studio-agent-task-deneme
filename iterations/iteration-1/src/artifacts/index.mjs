import * as executiveMemo from './executive-memo.mjs';
import * as visualAbstract from './visual-abstract.mjs';

export const registry = {
  'executive-memo': executiveMemo,
  'visual-abstract': visualAbstract,
};

export function getArtifact(type) {
  const a = registry[type];
  if (!a) {
    const known = Object.keys(registry).join(', ');
    throw new Error(`Bilinmeyen artifact tipi: ${type}. Bilinen: ${known}`);
  }
  return a;
}

export function listArtifacts() {
  return Object.values(registry).map((m) => m.spec);
}
