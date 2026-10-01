import type { Health, Rating, SubScore } from '../report.js';
import type { Parsed } from '../parser/index.js';
import { MB, linearScore, ratingFromScore, ratingLabel, worstRating } from '../parser/helpers.js';

const avgPct = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) : null;
};
const avgInt = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);

export function buildOverview(p: Parsed): SubScore[] {
  const { auditScores: a, profile: pr, scores } = p;
  const out: SubScore[] = [
    {
      key: 'performance', label: 'Performance', value: scores.performance, custom: false,
      formula: 'The Lighthouse performance score.',
    },
  ];

  const loading = avgPct([a.fcp, a.lcp, a.si]);
  if (loading !== null) {
    out.push({
      key: 'loading', label: 'Loading', value: loading, custom: false,
      formula: 'Average of the Lighthouse scores for FCP, LCP and Speed Index.',
    });
  }
  const inter = avgPct([a.tbt]);
  if (inter !== null) {
    out.push({
      key: 'interactivity', label: 'Interactivity', value: inter, custom: false,
      formula: 'The Lighthouse score for Total Blocking Time (lab stand-in for INP).',
    });
  }
  const stab = avgPct([a.cls]);
  if (stab !== null) {
    out.push({
      key: 'stability', label: 'Visual stability', value: stab, custom: false,
      formula: 'The Lighthouse score for Cumulative Layout Shift.',
    });
  }

  out.push({
    key: 'network', label: 'Network efficiency', custom: true,
    value: avgInt([linearScore(pr.requests.total, 40, 150), linearScore(pr.bytes.total, 1.5 * MB, 6 * MB)]),
    formula: 'Custom. Average of two scores: request count (100 at 40 or fewer, 0 at 150 or more) and total transfer size (100 at 1.5 MB or less, 0 at 6 MB or more).',
  });
  out.push({
    key: 'resources', label: 'Resource efficiency', custom: true,
    value: avgInt([
      linearScore(pr.bytes.js, 0.5 * MB, 3 * MB),
      linearScore(pr.bytes.images, 0.75 * MB, 4 * MB),
      linearScore(pr.dom, 800, 4000),
    ]),
    formula: 'Custom. Average of three scores: JavaScript size (100 at 0.5 MB or less, 0 at 3 MB or more), image size (100 at 0.75 MB or less, 0 at 4 MB or more) and DOM size (100 at 800 elements or fewer, 0 at 4,000 or more).',
  });
  return out;
}

export function buildStatus(performance: number): { label: string; rating: Rating } {
  const rating = ratingFromScore(performance);
  return { label: ratingLabel(rating), rating };
}

export function buildHealth(p: Parsed, overview: SubScore[]): Health {
  const cwv = p.vitals.filter((v) => v.key === 'lcp' || v.key === 'cls').map((v) => v.rating);
  const get = (k: string) => overview.find((o) => o.key === k)?.value ?? 0;
  const statuses: Health['statuses'] = [];
  if (cwv.length) statuses.push({ label: 'Core Web Vitals (lab LCP and CLS)', rating: worstRating(cwv) });
  statuses.push({ label: 'Network efficiency', rating: ratingFromScore(get('network')) });
  statuses.push({ label: 'Resource efficiency', rating: ratingFromScore(get('resources')) });

  return {
    categories: [
      { label: 'Performance', value: p.scores.performance },
      { label: 'Accessibility', value: p.scores.accessibility },
      { label: 'SEO', value: p.scores.seo },
      { label: 'Best practices', value: p.scores.bestPractices },
    ],
    statuses,
  };
}
