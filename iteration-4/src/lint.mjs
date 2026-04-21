export function runLint(rules, artifact) {
  const errors = [];
  const warnings = [];
  const passedRules = [];

  for (const rule of rules) {
    try {
      const res = rule.check(artifact);
      if (res === true || res == null) {
        passedRules.push(rule.id);
        continue;
      }
      if (res?.error) errors.push({ rule: rule.id, message: res.error });
      if (res?.warning) warnings.push({ rule: rule.id, message: res.warning });
      if (!res?.error && !res?.warning) passedRules.push(rule.id);
    } catch (e) {
      errors.push({ rule: rule.id, message: `lint-crash: ${e.message}` });
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    rules_checked: rules.map((r) => r.id),
  };
}
