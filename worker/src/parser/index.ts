import type { LHR } from '../lighthouse.js';
import type { Blame, Distribution, Metrics, Opportunities, Profile } from '../report.js';
import { buildBlame } from './blame.js';
import { auditScore } from './helpers.js';
import { extractMetrics } from './metrics.js';
import { buildOpportunities } from './opportunities.js';
import { buildDistribution, buildProfile } from './profile.js';
import { collectRequests } from './requests.js';
import { buildVitals, type RawVital } from './vitals.js';

export interface Parsed {
  url: string;
  finalUrl: string;
  lighthouseVersion: string;
  screenshot: string | null;
  scores: { performance: number; accessibility: number; seo: number; bestPractices: number };
  auditScores: { fcp: number | null; lcp: number | null; si: number | null; tbt: number | null; cls: number | null };
  vitals: RawVital[];
  profile: Profile;
  distribution: Distribution;
  blame: Blame;
  opps: Opportunities;
  baseline: Metrics;
}

const cat = (lhr: LHR, id: string) => Math.round((lhr.categories?.[id]?.score ?? 0) * 100);

/** Turns the raw Lighthouse result into the measured facts the rest of the pipeline uses. */
export function parseLighthouse(lhr: LHR): Parsed {
  const reqs = collectRequests(lhr);
  const profile = buildProfile(lhr, reqs);
  const shot = lhr.audits?.['final-screenshot']?.details?.data;

  return {
    url: lhr.requestedUrl ?? lhr.finalUrl ?? '',
    finalUrl: lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl ?? '',
    lighthouseVersion: String(lhr.lighthouseVersion ?? ''),
    screenshot: typeof shot === 'string' && shot.startsWith('data:image') ? shot : null,
    scores: {
      performance: cat(lhr, 'performance'),
      accessibility: cat(lhr, 'accessibility'),
      seo: cat(lhr, 'seo'),
      bestPractices: cat(lhr, 'best-practices'),
    },
    auditScores: {
      fcp: auditScore(lhr, 'first-contentful-paint'),
      lcp: auditScore(lhr, 'largest-contentful-paint'),
      si: auditScore(lhr, 'speed-index'),
      tbt: auditScore(lhr, 'total-blocking-time'),
      cls: auditScore(lhr, 'cumulative-layout-shift'),
    },
    vitals: buildVitals(lhr),
    profile,
    distribution: buildDistribution(profile),
    blame: buildBlame(lhr, reqs),
    opps: buildOpportunities(lhr),
    baseline: extractMetrics(lhr),
  };
}

export { extractMetrics };
