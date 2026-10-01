import type { ActionItem, Diagnosis, Level, Recommendation } from '../report.js';
import type { Parsed } from '../parser/index.js';
import { fmtBytes, fmtMs } from '../parser/helpers.js';
import { LARGE_IMAGE_BYTES } from './thresholds.js';

// How hard each fix usually is. A fixed lookup, so rankings are explainable.
const EFFORT: Record<string, Level> = {
  'image-payload': 'low',
  compression: 'low',
  caching: 'low',
  'render-blocking': 'low',
  'js-payload': 'medium',
  'third-party': 'medium',
  'request-volume': 'medium',
  lcp: 'medium',
  tbt: 'medium',
  'server-response': 'medium',
  'layout-stability': 'medium',
  'dom-complexity': 'high',
};

const WEIGHT: Record<Level, number> = { high: 3, medium: 2, low: 1 };

export const RANKING_FORMULA =
  'Priority = (estimated time saving in ms + 500 x impact weight) / effort factor. ' +
  'Byte savings are converted to time at 200 bytes per ms (Lighthouse mobile throughput). ' +
  'Impact weight: high 3, medium 2, low 1. Effort factor: low 1, medium 2, high 3.';

interface Draft {
  detected: string;
  action: string;
  savingsMs: number;
  savingsBytes: number;
  potentialOverride?: string;
}

function draftFor(id: string, p: Parsed): Draft | null {
  const { profile: pr, blame, opps, vitals } = p;
  const vital = (k: string) => vitals.find((v) => v.key === k);

  switch (id) {
    case 'js-payload':
      return {
        detected: `${fmtBytes(pr.bytes.js)} of JavaScript across ${pr.counts.jsFiles} files`,
        action: 'Remove unused dependencies, split large bundles by route so each page loads only what it needs, defer non-critical scripts, and drop JavaScript that is not needed on first load.',
        savingsMs: 0,
        savingsBytes: opps.unusedJsBytes,
      };
    case 'image-payload':
      return {
        detected: `${fmtBytes(pr.bytes.images)} of images; ${blame.largeImageCount} larger than ${fmtBytes(LARGE_IMAGE_BYTES)}`,
        action: 'Convert suitable images to AVIF or WebP, resize them to the dimensions they are displayed at, compress them, and lazy-load images that start below the fold.',
        savingsMs: 0,
        savingsBytes: opps.imageSavingsBytes,
      };
    case 'third-party': {
      const blocking = blame.thirdParties.reduce((s, t) => s + t.blockingMs, 0);
      return {
        detected: `${pr.requests.thirdParty} third-party requests (${fmtBytes(pr.bytes.thirdParty)})`,
        action: 'Review every third-party tag. Remove the ones that are not essential, load the rest with async or defer, and delay non-critical ones (chat widgets, analytics) until after the page is interactive.',
        savingsMs: blocking,
        savingsBytes: 0,
      };
    }
    case 'request-volume':
      return {
        detected: `${pr.requests.total} network requests`,
        action: 'Bundle small files, remove resources that are not used, serve over HTTP/2 or HTTP/3, and lazy-load content below the fold.',
        savingsMs: 0,
        savingsBytes: 0,
      };
    case 'dom-complexity':
      return {
        detected: `${pr.dom.toLocaleString('en-US')} DOM elements`,
        action: 'Simplify deeply nested markup, paginate or virtualise long lists, and render heavy sections only when they are needed.',
        savingsMs: 0,
        savingsBytes: 0,
      };
    case 'lcp': {
      const lcp = vital('lcp');
      const isImage = blame.lcpElement?.snippet.trimStart().startsWith('<img');
      return {
        detected: `LCP of ${lcp?.display ?? 'n/a'}${blame.lcpElement ? `; LCP element: ${blame.lcpElement.label || blame.lcpElement.selector}` : ''}`,
        action: isImage
          ? 'The largest element is an image. Preload it, set fetchpriority="high", do not lazy-load it, and serve it in a modern format at the size it is displayed.'
          : 'Reduce render-blocking CSS and JavaScript, inline critical CSS, and make sure the main content does not wait on scripts before it appears.',
        savingsMs: Math.max(0, (lcp?.value ?? 0) - 2500),
        savingsBytes: 0,
      };
    }
    case 'tbt': {
      const tbt = vital('tbt');
      return {
        detected: `Total Blocking Time of ${tbt?.display ?? 'n/a'}`,
        action: 'Break up long tasks, code-split and defer heavy scripts, and move expensive work off the main thread with web workers.',
        savingsMs: Math.max(0, (tbt?.value ?? 0) - 200),
        savingsBytes: 0,
      };
    }
    case 'render-blocking':
      return {
        detected: `About ${fmtMs(opps.renderBlockingMs)} of render-blocking time`,
        action: 'Inline critical CSS, add defer or async to scripts in the head, and load non-critical stylesheets asynchronously.',
        savingsMs: opps.renderBlockingMs,
        savingsBytes: 0,
      };
    case 'server-response': {
      const ttfb = vital('ttfb');
      return {
        detected: `Server response of ${ttfb?.display ?? 'n/a'}`,
        action: 'Cache responses at a CDN, speed up slow backend work and database queries, and avoid redirect chains.',
        savingsMs: Math.max(0, (ttfb?.value ?? 0) - 800),
        savingsBytes: 0,
      };
    }
    case 'layout-stability':
      return {
        detected: `CLS of ${vital('cls')?.display ?? 'n/a'}`,
        action: 'Set width and height on images and embeds, reserve space for ads and late-loading content, and use size-matched fallback fonts with font-display.',
        savingsMs: 0,
        savingsBytes: 0,
      };
    case 'compression':
      return {
        detected: `${fmtBytes(opps.compressionSavingsBytes)} of uncompressed text assets`,
        action: 'Enable Brotli or gzip for text assets (HTML, CSS, JavaScript, JSON, SVG) on your server or CDN.',
        savingsMs: 0,
        savingsBytes: opps.compressionSavingsBytes,
      };
    case 'caching':
      return {
        detected: `${fmtBytes(opps.cachingSavingsBytes)} re-downloaded by returning visitors`,
        action: 'Serve static assets with long cache lifetimes (for example one year) and fingerprinted file names so updates still reach users.',
        savingsMs: 0,
        savingsBytes: 0, // repeat visits only, so it does not count toward first-load ranking
        potentialOverride: `~${fmtBytes(opps.cachingSavingsBytes)} less data on repeat visits`,
      };
    default:
      return null;
  }
}

function potentialText(d: Draft): string | null {
  if (d.potentialOverride) return d.potentialOverride;
  const parts: string[] = [];
  if (d.savingsBytes > 0) parts.push(`~${fmtBytes(d.savingsBytes)} less data to transfer`);
  if (d.savingsMs > 0) parts.push(`~${fmtMs(d.savingsMs)} of potential time savings`);
  return parts.length ? parts.join(' and ') : null;
}

export function buildRecommendations(p: Parsed, diagnosis: Diagnosis[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const d of diagnosis) {
    if (d.severity === 'healthy') continue;
    const draft = draftFor(d.id, p);
    if (!draft) continue;
    const impact: Level = d.severity === 'high' ? 'high' : d.severity === 'medium' ? 'medium' : 'low';
    const effort = EFFORT[d.id] ?? 'medium';
    const impactMs = draft.savingsMs + draft.savingsBytes / 200;
    recs.push({
      id: d.id,
      title: d.title,
      impact,
      effort,
      detected: draft.detected,
      action: draft.action,
      potential: potentialText(draft),
      savingsMs: Math.round(draft.savingsMs),
      savingsBytes: Math.round(draft.savingsBytes),
      priority: Math.round((impactMs + 500 * WEIGHT[impact]) / WEIGHT[effort]),
    });
  }
  return recs.sort((a, b) => b.priority - a.priority);
}

export function buildActionPlan(recs: Recommendation[]): ActionItem[] {
  return recs.map((r, i) => ({ rank: i + 1, id: r.id, title: r.title, impact: r.impact, effort: r.effort }));
}
