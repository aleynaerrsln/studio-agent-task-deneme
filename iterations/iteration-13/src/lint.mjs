export function runLint(rules, artifact, options = {}) {
  const rejectWarnings = options.reject_warnings ?? true;
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

  const hardFail = errors.length > 0;
  const softFail = rejectWarnings && warnings.length > 0;
  const passed = !hardFail && !softFail;

  let rejection_reason = null;
  if (hardFail) {
    rejection_reason = `${errors.length} error(s) present`;
  } else if (softFail) {
    rejection_reason = `${warnings.length} warning(s) not accepted (reject_warnings=true)`;
  }

  return {
    passed,
    errors,
    warnings,
    rules_checked: rules.map((r) => r.id),
    severity_summary: {
      errors: errors.length,
      warnings: warnings.length,
      accepted: passed,
    },
    rejection_reason,
    strict_lint: { reject_warnings: rejectWarnings },
  };
}
