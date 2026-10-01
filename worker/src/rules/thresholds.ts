import type { Rating, Severity, VitalKey } from '../report.js';
import { KB, MB } from '../parser/helpers.js';

// Every numeric limit lives here so the whole ranking system can be tuned in one place.
// Each pair is [medium, high]: values at or above the first are "medium", at or above the second "high".
export const LIMITS: Record<string, [number, number]> = {
  jsBytes: [1 * MB, 2 * MB],
  imageBytes: [1.5 * MB, 3 * MB],
  requests: [80, 120],
  thirdPartyRequests: [15, 30],
  dom: [1500, 3000],
  lcp: [2500, 4000],
  tbt: [200, 600],
  cls: [0.1, 0.25],
  ttfb: [800, 1800],
  renderBlockingMs: [300, 800],
};

export const LARGE_IMAGE_BYTES = 200 * KB;

// Google's Core Web Vitals style bands: [good up to, needs improvement up to]
export const VITAL_LIMITS: Record<VitalKey, [number, number]> = {
  lcp: [2500, 4000],
  fcp: [1800, 3000],
  cls: [0.1, 0.25],
  tbt: [200, 600],
  ttfb: [800, 1800],
};

export function rateVital(key: VitalKey, value: number): Rating {
  const [good, ni] = VITAL_LIMITS[key];
  return value <= good ? 'good' : value <= ni ? 'needs-improvement' : 'poor';
}

export function severityOf(value: number, [medium, high]: [number, number]): Severity {
  return value >= high ? 'high' : value >= medium ? 'medium' : 'healthy';
}

/** Severity from an estimated saving in bytes (used for compression and caching). */
export function severityByBytes(bytes: number): Severity {
  return bytes >= 1 * MB ? 'high' : bytes >= 200 * KB ? 'medium' : bytes > 0 ? 'low' : 'healthy';
}

export const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2, healthy: 3 };
