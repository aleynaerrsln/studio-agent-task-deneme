// KB profile dispatcher — matches a parsed wiki to a profile id,
// then loads the adapter module with builders.

import * as statisticalPrePost from './statistical-pre-post.mjs';
import * as rctComparison from './rct-comparison.mjs';
import * as genericProfile from './generic.mjs';

const profiles = {
  'statistical-pre-post': statisticalPrePost.profile,
  'rct-comparison': rctComparison.profile,
  generic: genericProfile.profile,
};

export function detectKbProfile(wiki) {
  const sections = wiki.sections.map((s) => s.id);
  const content = wiki.rawText ?? '';

  // RCT profile: primary/secondary endpoint structure, randomized, treatment groups
  const hasRctMarkers =
    /randomi[sz]ed|\brct\b|primary\s+endpoint/i.test(content);
  const hasEndpointSections = sections.some((id) =>
    /primary-endpoint|secondary-endpoints/.test(id),
  );
  if (hasRctMarkers && hasEndpointSections) {
    return 'rct-comparison';
  }

  // Statistical pre-post: paired measurements, Wilcoxon, Turkish pre-post framing
  if (/Zaman\s*1.*Zaman\s*2|Bağımlı\s+Veri\s+Analizi|Wilcoxon/i.test(content)) {
    return 'statistical-pre-post';
  }

  return 'generic';
}

export function loadProfile(id) {
  return profiles[id] ?? profiles.generic;
}

export function listProfiles() {
  return Object.keys(profiles);
}
