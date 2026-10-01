import type { LHR } from '../lighthouse.js';
import type { Vital, VitalKey } from '../report.js';
import { rateVital } from '../rules/thresholds.js';
import { auditScore, hasNum, num } from './helpers.js';

export type RawVital = Omit<Vital, 'explain'>;

const DEFS: { key: VitalKey; label: string; audit: string; note?: string }[] = [
  { key: 'lcp', label: 'Largest Contentful Paint (LCP)', audit: 'largest-contentful-paint' },
  { key: 'fcp', label: 'First Contentful Paint (FCP)', audit: 'first-contentful-paint' },
  { key: 'cls', label: 'Cumulative Layout Shift (CLS)', audit: 'cumulative-layout-shift' },
  {
    key: 'tbt',
    label: 'Total Blocking Time (TBT)',
    audit: 'total-blocking-time',
    note: 'Lab stand-in for INP. Real INP needs field data from real visitors, which a lab test cannot produce.',
  },
  { key: 'ttfb', label: 'Server response time (TTFB)', audit: 'server-response-time' },
];

export function formatVital(key: VitalKey, v: number): string {
  if (key === 'cls') return (Math.round(v * 1000) / 1000).toString();
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`;
}

/** Only vitals that Lighthouse actually measured are returned. */
export function buildVitals(lhr: LHR): RawVital[] {
  return DEFS.filter((d) => hasNum(lhr, d.audit)).map((d) => {
    const value = num(lhr, d.audit);
    return {
      key: d.key,
      label: d.label,
      value,
      unit: d.key === 'cls' ? '' : 'ms',
      display: formatVital(d.key, value),
      rating: rateVital(d.key, value),
      score: auditScore(lhr, d.audit),
      note: d.note,
    };
  });
}
