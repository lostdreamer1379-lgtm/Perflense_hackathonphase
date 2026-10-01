import type { LHR } from './lighthouse.js';
import { parseLighthouse } from './parser/index.js';
import type { Report } from './report.js';
import { buildDiagnosis, groupBottlenecks } from './rules/diagnosis.js';
import { RANKING_FORMULA, buildActionPlan, buildRecommendations } from './rules/recommendations.js';
import { buildHealth, buildOverview, buildStatus } from './rules/scoring.js';
import { buildEstimates, buildSimulationPlan } from './rules/simulationPlan.js';
import { explainVitals } from './rules/vitalsExplain.js';
import { writeSummaries } from './llm/summaries.js';

export interface BuildContext {
  runScores: number[];
  engine: 'local' | 'psi';
  onStage?: (stage: string) => void | Promise<void>;
}

/** Raw Lighthouse result in, finished report out. */
export async function buildReport(lhr: LHR, ctx: BuildContext): Promise<Report> {
  const p = parseLighthouse(lhr);

  const diagnosis = buildDiagnosis(p);
  const recommendations = buildRecommendations(p, diagnosis);
  const overview = buildOverview(p);

  const base: Omit<Report, 'summary'> = {
    schemaVersion: 1,
    meta: {
      url: p.url,
      finalUrl: p.finalUrl,
      device: 'mobile',
      engine: ctx.engine,
      runs: ctx.runScores.length,
      runScores: ctx.runScores,
      analyzedAt: new Date().toISOString(),
      lighthouseVersion: p.lighthouseVersion,
      throttling: 'Simulated slow 4G with 4x CPU slowdown (Lighthouse mobile defaults)',
      screenshot: p.screenshot,
    },
    scores: p.scores,
    status: buildStatus(p.scores.performance),
    overview,
    vitals: explainVitals(p.vitals, p),
    profile: p.profile,
    distribution: p.distribution,
    blame: p.blame,
    opportunities: p.opps,
    diagnosis,
    bottlenecks: groupBottlenecks(diagnosis),
    recommendations,
    actionPlan: buildActionPlan(recommendations),
    rankingFormula: RANKING_FORMULA,
    baseline: p.baseline,
    simulationPlan: buildSimulationPlan(p),
    estimates: buildEstimates(p),
    health: buildHealth(p, overview),
  };

  await ctx.onStage?.('summarizing');
  const summary = await writeSummaries(base);
  return { ...base, summary };
}
