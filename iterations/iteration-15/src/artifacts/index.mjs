import * as graphicalAbstract from './graphical-abstract.mjs';
import * as clinicalSummary from './clinical-summary.mjs';

export const registry = {
  'graphical-abstract': graphicalAbstract,
  'clinical-summary': clinicalSummary,
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
