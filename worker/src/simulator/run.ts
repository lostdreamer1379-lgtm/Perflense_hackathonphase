import { runLighthouse } from '../lighthouse.js';
import { extractMetrics } from '../parser/index.js';
import type { Metrics, SimulationPlanItem, SimulationResult } from '../report.js';

const CAVEAT =
  'Measured with the listed requests blocked. Blocking can break the page, so read this as the upper limit of what removing them could gain, not as a safe change. Single lab runs also vary by a few points.';

/**
 * Real what-if: re-measure the page with some requests blocked.
 * By default a fresh baseline is measured right before, so both numbers come from the same conditions.
 */
export async function runScenario(
  url: string,
  plan: SimulationPlanItem,
  storedBaseline: Metrics,
): Promise<SimulationResult> {
  const fresh = process.env.SIM_FRESH_BASELINE !== '0';
  const before = fresh ? extractMetrics(await runLighthouse(url)) : storedBaseline;
  const after = extractMetrics(await runLighthouse(url, { blockedUrlPatterns: plan.patterns }));
  return {
    scenario: plan.id,
    label: plan.label,
    method: 'measured',
    before,
    after,
    blockedPatterns: plan.patterns.slice(0, 20),
    caveat: CAVEAT,
  };
}
