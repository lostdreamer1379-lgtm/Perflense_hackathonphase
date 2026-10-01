import type { LHR } from '../lighthouse.js';
import type { Rating } from '../report.js';

export const KB = 1024;
export const MB = 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyItem = any;

export const audit = (lhr: LHR, id: string): AnyItem => lhr.audits?.[id];

export const hasNum = (lhr: LHR, id: string): boolean =>
  typeof lhr.audits?.[id]?.numericValue === 'number';

export const num = (lhr: LHR, id: string): number => {
  const v = lhr.audits?.[id]?.numericValue;
  return typeof v === 'number' ? v : 0;
};

export const auditScore = (lhr: LHR, id: string): number | null => {
  const s = lhr.audits?.[id]?.score;
  return typeof s === 'number' ? s : null;
};

export const items = (lhr: LHR, id: string): AnyItem[] => lhr.audits?.[id]?.details?.items ?? [];

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

const SECOND_LEVEL = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.in', 'net.in',
  'org.in', 'co.jp', 'com.br', 'com.cn', 'co.nz', 'co.za', 'com.mx', 'com.tr', 'com.sg',
]);

/** Approximate registrable domain (example.co.uk, not www.example.co.uk). */
export function registrableDomain(host: string): string {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (!h || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return h;
  const parts = h.split('.');
  if (parts.length <= 2) return h;
  const last2 = parts.slice(-2).join('.');
  return SECOND_LEVEL.has(last2) ? parts.slice(-3).join('.') : last2;
}

export function fmtBytes(b: number): string {
  if (b >= MB) return `${(b / MB).toFixed(1)} MB`;
  if (b >= KB) return `${Math.round(b / KB)} KB`;
  return `${Math.round(b)} B`;
}

export function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

/** 100 at or below `good`, 0 at or above `bad`, linear in between. */
export function linearScore(value: number, good: number, bad: number): number {
  if (value <= good) return 100;
  if (value >= bad) return 0;
  return Math.round((100 * (bad - value)) / (bad - good));
}

export function ratingFromScore(score100: number): Rating {
  return score100 >= 90 ? 'good' : score100 >= 50 ? 'needs-improvement' : 'poor';
}

export const ratingLabel = (r: Rating) =>
  r === 'good' ? 'Good' : r === 'needs-improvement' ? 'Needs improvement' : 'Poor';

export const worstRating = (rs: Rating[]): Rating =>
  rs.includes('poor') ? 'poor' : rs.includes('needs-improvement') ? 'needs-improvement' : 'good';
