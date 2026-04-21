// Shared numeric trace infrastructure used by multiple artifact types.
// Primary contract: traceFieldsAgainstKb(fields, payload, kbRaw) -> string[] (issues).

export const normalizeForTrace = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, '');

export function collectValuesAtPath(root, path) {
  const parts = path.split('.');
  let current = [root];
  for (const part of parts) {
    const arrayMatch = part.match(/^(\w+)\[\]$/);
    const key = arrayMatch ? arrayMatch[1] : part;
    const next = [];
    for (const c of current) {
      if (c == null || typeof c !== 'object') continue;
      const val = c[key];
      if (val == null) continue;
      if (arrayMatch) {
        if (Array.isArray(val)) next.push(...val);
      } else {
        next.push(val);
      }
    }
    current = next;
  }
  return current;
}

export function tokenize(s) {
  return String(s ?? '')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

export function findTokenIndexContaining(tokens, target) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].includes(target)) return i;
  }
  return -1;
}

export function cleanToken(t) {
  return String(t ?? '')
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}%\-.]+|[^\p{L}\p{N}%\-.]+$/gu, '');
}

export function cleanTokens(tokens) {
  return tokens.map(cleanToken).filter((t) => t.length > 0);
}

export function getKbExtendedWindowsAllMatches(kbRaw, core, radius) {
  const kbTokens = tokenize(kbRaw);
  const cleanCore = cleanToken(core);
  if (!cleanCore) return [];
  const occurrences = [];
  for (let i = 0; i < kbTokens.length; i++) {
    if (cleanToken(kbTokens[i]).includes(cleanCore)) {
      const before = Math.max(0, i - radius);
      const after = Math.min(kbTokens.length, i + 1 + radius);
      occurrences.push({
        tokenIdx: i,
        window: kbTokens.slice(before, after),
      });
    }
  }
  return occurrences;
}

export function calculateOverlapScore(adayTokens, kbExtendedTokens) {
  const adayClean = cleanTokens(adayTokens);
  const kbClean = cleanTokens(kbExtendedTokens);
  if (adayClean.length === 0) return 0;
  const kbSet = new Set(kbClean);
  const matched = adayClean.filter((t) => kbSet.has(t)).length;
  return matched / adayClean.length;
}

function sliceCharsWindow(str, coreIndex, coreLength, contextWindow) {
  const before = contextWindow?.chars_before ?? 0;
  const after = contextWindow?.chars_after ?? 0;
  const start = Math.max(0, coreIndex - before);
  const end = Math.min(str.length, coreIndex + coreLength + after);
  return str.slice(start, end);
}

export function extractNumericCoresWithContext(s, contextWindow, options = {}) {
  const skipSingleDigits = options.skipSingleDigits ?? false;
  const skipYearLike = options.skipYearLike ?? false;
  // Lookbehind: digit/dot preceded sonrası `-` negatif sayı başlangıcı sayılmaz
  // (örn. "18-75"'te "-75" değil "75" core'u çıkarılır; "r = -0.613" korunur).
  const re = /(?<![\d.])-?\d+\.?\d*%?/g;
  const str = String(s ?? '');
  const strategy = contextWindow?.strategy ?? 'tokens';
  const result = [];
  let m;
  while ((m = re.exec(str)) !== null) {
    const core = m[0];
    const numeric = core.replace('%', '').replace('-', '');

    if (skipSingleDigits) {
      if (numeric.length <= 1) continue;
    } else {
      if (numeric.length <= 1 && (numeric === '0' || numeric === '1')) continue;
    }
    if (skipYearLike && /^\d{4}$/.test(numeric)) {
      const y = Number(numeric);
      if (y >= 1900 && y <= 2100) continue;
    }

    let window;
    if (strategy === 'tokens') {
      const tokens = tokenize(str);
      const tokenIdx = findTokenIndexContaining(tokens, core);
      if (tokenIdx === -1) {
        window = sliceCharsWindow(str, m.index, core.length, contextWindow);
      } else {
        const tb = contextWindow?.tokens_before ?? 2;
        const ta = contextWindow?.tokens_after ?? 2;
        const start = Math.max(0, tokenIdx - tb);
        const end = Math.min(tokens.length, tokenIdx + 1 + ta);
        window = tokens.slice(start, end).join(' ');
      }
    } else {
      window = sliceCharsWindow(str, m.index, core.length, contextWindow);
    }

    result.push({ core, index: m.index, window });
  }
  return result;
}

export function traceFieldsAgainstKb(fields, payload, kbRaw, extractorOptions) {
  const kbNorm = normalizeForTrace(kbRaw);
  const issues = [];
  for (const field of fields) {
    const opts = extractorOptions ?? field.extractor_options ?? {};
    const values = collectValuesAtPath(payload, field.path);
    for (const v of values) {
      if (v == null || !String(v).trim()) continue;
      const s = String(v);

      const wholeMatch = kbNorm.includes(normalizeForTrace(s));
      const coreFailures = [];
      const contextMismatches = [];

      if (field.extract_numeric_core) {
        const items = extractNumericCoresWithContext(s, field.context_window, opts);
        const useOverlap = field.context_window?.match_method === 'overlap';
        const threshold = field.context_window?.overlap_threshold ?? 0.5;
        const radius = field.context_window?.kb_extended_radius ?? 5;

        for (const item of items) {
          const coreFound = kbNorm.includes(normalizeForTrace(item.core));
          if (!coreFound) {
            coreFailures.push(item.core);
            continue;
          }
          if (!field.context_window) continue;

          if (useOverlap) {
            const selection = field.context_window?.match_selection ?? 'best';
            const occurrences = getKbExtendedWindowsAllMatches(
              kbRaw,
              item.core,
              radius,
            );
            if (occurrences.length === 0) continue;

            const pool = selection === 'first' ? occurrences.slice(0, 1) : occurrences;
            const adayTokens = tokenize(item.window);
            let bestScore = 0;
            let bestKbWindow = null;
            for (const occ of pool) {
              const score = calculateOverlapScore(adayTokens, occ.window);
              if (score > bestScore) {
                bestScore = score;
                bestKbWindow = occ.window;
              }
            }

            if (bestScore < threshold) {
              contextMismatches.push({
                core: item.core,
                window: item.window,
                score: bestScore.toFixed(2),
                kb_window: bestKbWindow ? bestKbWindow.join(' ') : '',
                occurrences_checked: occurrences.length,
              });
            }
          } else {
            const windowFound = kbNorm.includes(normalizeForTrace(item.window));
            if (!windowFound) {
              contextMismatches.push({ core: item.core, window: item.window });
            }
          }
        }
      }

      if (coreFailures.length > 0) {
        issues.push(
          `${field.path}: "${s}" — core trace FAIL [${coreFailures.join(', ')}]`,
        );
      } else if (contextMismatches.length > 0) {
        const detail = contextMismatches
          .map((c) => {
            if (c.score !== undefined) {
              const occ = c.occurrences_checked
                ? ` (best of ${c.occurrences_checked} KB occurrences)`
                : '';
              return `${c.core}@"${c.window}" best_overlap=${c.score}${occ} (best KB match: "${c.kb_window}")`;
            }
            return `${c.core}@"${c.window}"`;
          })
          .join(', ');
        issues.push(
          `${field.path}: "${s}" — context window mismatch [${detail}] (core KB'de var ama yanlış bağlamda)`,
        );
      } else if (!wholeMatch && !field.extract_numeric_core) {
        issues.push(`${field.path}: "${s}" — whole string trace FAIL`);
      }
    }
  }
  return issues;
}
