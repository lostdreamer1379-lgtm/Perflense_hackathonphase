import type { Estimate, SimulationPlanItem } from '../report.js';
import type { Parsed } from '../parser/index.js';
import { fmtBytes } from '../parser/helpers.js';

const hostPattern = (h: string) => `*://${h}/*`;

function scriptPattern(url: string): string | null {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}*`;
  } catch {
    return null;
  }
}

/** Which "block it and re-measure" scenarios make sense for this page. */
export function buildSimulationPlan(p: Parsed): SimulationPlanItem[] {
  const { profile: pr, blame } = p;
  const plan: SimulationPlanItem[] = [];

  if (pr.thirdPartyHosts.length > 0) {
    plan.push({
      id: 'no-third-party',
      label: 'Remove all third-party requests',
      description: `Blocks all ${pr.requests.thirdParty} requests to other domains and measures the page again.`,
      patterns: pr.thirdPartyHosts.map(hostPattern),
      blockedCount: pr.requests.thirdParty,
    });
  }

  const topTp = blame.thirdParties[0];
  if (topTp && blame.thirdParties.length > 1) {
    plan.push({
      id: 'no-top-third-party',
      label: `Remove ${topTp.name}`,
      description: `Blocks ${topTp.requests} requests (${fmtBytes(topTp.transferSize)}) from ${topTp.name}, the costliest third party, and measures again.`,
      patterns: topTp.hosts.map(hostPattern),
      blockedCount: topTp.requests,
    });
  }

  const topScript = blame.scripts[0];
  const pattern = topScript ? scriptPattern(topScript.url) : null;
  if (topScript && pattern) {
    const path = new URL(topScript.url).pathname.split('/').pop() || topScript.host;
    plan.push({
      id: 'no-top-script',
      label: 'Remove the heaviest script',
      description: `Blocks ${path} from ${topScript.host} (${fmtBytes(topScript.transferSize)}, ${Math.round(topScript.cpuMs)} ms of CPU) and measures again.`,
      patterns: [pattern],
      blockedCount: 1,
    });
  }
  return plan;
}

export function buildEstimates(p: Parsed): Estimate[] {
  const out: Estimate[] = [];
  const total = p.profile.bytes.total;
  if (p.opps.imageSavingsBytes > 50 * 1024) {
    out.push({
      id: 'optimize-images',
      label: 'Optimize images',
      method: 'estimated',
      beforeBytes: total,
      afterBytes: Math.max(0, total - p.opps.imageSavingsBytes),
      note: "Based on Lighthouse's own estimate of savings from modern formats, resizing and lazy-loading. Not re-measured.",
    });
  }
  if (!p.opps.compressionOk && p.opps.compressionSavingsBytes > 20 * 1024) {
    out.push({
      id: 'enable-compression',
      label: 'Enable text compression',
      method: 'estimated',
      beforeBytes: total,
      afterBytes: Math.max(0, total - p.opps.compressionSavingsBytes),
      note: "Based on Lighthouse's estimate of bytes saved by compressing text assets. Not re-measured.",
    });
  }
  return out;
}
