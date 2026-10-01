import type { Rating, Severity, Level } from '../types/report';

const KB = 1024;
const MB = 1024 * 1024;

export function fmtBytes(b: number): string {
  if (b >= MB) return `${(b / MB).toFixed(1)} MB`;
  if (b >= KB) return `${Math.round(b / KB)} KB`;
  return `${Math.round(b)} B`;
}

export function fmtMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** host + path, shortened in the middle so long asset URLs stay readable */
export function shortUrl(url: string, max = 54): string {
  try {
    const u = new URL(url);
    const s = u.host + u.pathname;
    return s.length > max ? `${s.slice(0, Math.floor(max * 0.55))}…${s.slice(-Math.floor(max * 0.4))}` : s;
  } catch {
    return url.slice(0, max);
  }
}

export const ratingText = (r: Rating) =>
  r === 'good' ? 'Good' : r === 'needs-improvement' ? 'Needs improvement' : 'Poor';

export const ratingColor = (r: Rating) =>
  r === 'good' ? 'text-good' : r === 'needs-improvement' ? 'text-warn' : 'text-bad';

export const ratingBg = (r: Rating) =>
  r === 'good' ? 'bg-good' : r === 'needs-improvement' ? 'bg-warn' : 'bg-bad';

export const ratingFromScore = (n: number): Rating =>
  n >= 90 ? 'good' : n >= 50 ? 'needs-improvement' : 'poor';

export const severityText = (s: Severity) =>
  s === 'high' ? 'High impact' : s === 'medium' ? 'Medium impact' : s === 'low' ? 'Low impact' : 'Healthy';

export const severityColor = (s: Severity) =>
  s === 'high' ? 'text-bad' : s === 'medium' ? 'text-warn' : s === 'low' ? 'text-accent' : 'text-good';

export const severityBg = (s: Severity) =>
  s === 'high' ? 'bg-bad' : s === 'medium' ? 'bg-warn' : s === 'low' ? 'bg-accent' : 'bg-good';

export const levelText = (l: Level) => l.charAt(0).toUpperCase() + l.slice(1);

export const TYPE_COLORS: Record<string, string> = {
  js: '#2451D6',
  images: '#1F9E89',
  css: '#8A5CD0',
  fonts: '#D1A31F',
  html: '#5A6B80',
  other: '#A9B6C6',
};
