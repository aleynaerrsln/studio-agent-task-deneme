/**
 * Outcome yapısına göre chart tipini seçer.
 * Rule-based ve LLM path'i ikisi de bunu kullanır.
 */
export function selectChartType(outcomeData) {
  const { timePoints, groups, pValue, pre, post } = outcomeData ?? {};

  if (Array.isArray(timePoints) && timePoints.length > 2) return 'line';
  if (pre != null && post != null && !groups) return 'slope';
  if (groups === 2 && typeof pValue === 'number' && pValue > 0.05) return 'donut';
  if (groups === 2) return 'bar';
  return 'bar';
}
