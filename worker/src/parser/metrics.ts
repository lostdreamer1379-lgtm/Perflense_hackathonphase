import type { LHR } from '../lighthouse.js';
import type { Metrics } from '../report.js';
import { num } from './helpers.js';
import { collectRequests } from './requests.js';

/** Compact metric snapshot, used for the baseline and for before/after simulation results. */
export function extractMetrics(lhr: LHR): Metrics {
  const reqs = collectRequests(lhr);
  return {
    performance: Math.round((lhr.categories?.performance?.score ?? 0) * 100),
    lcp: Math.round(num(lhr, 'largest-contentful-paint')),
    fcp: Math.round(num(lhr, 'first-contentful-paint')),
    tbt: Math.round(num(lhr, 'total-blocking-time')),
    cls: Math.round(num(lhr, 'cumulative-layout-shift') * 1000) / 1000,
    pageBytes: reqs.reduce((s, r) => s + r.transferSize, 0),
    requests: reqs.length,
  };
}
