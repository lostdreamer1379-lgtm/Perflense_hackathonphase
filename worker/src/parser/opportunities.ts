import type { LHR } from '../lighthouse.js';
import type { Opportunities } from '../report.js';
import { audit, auditScore, items } from './helpers.js';

const IMAGE_AUDITS = [
  'uses-optimized-images',
  'modern-image-formats',
  'uses-responsive-images',
  'offscreen-images',
  'efficient-animated-content',
];

/** Per-image estimated savings. Takes the max across audits so overlapping advice is not double counted. */
export function imageSavingsMap(lhr: LHR): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of IMAGE_AUDITS) {
    for (const it of items(lhr, id)) {
      const url: string | undefined = it.url;
      const wasted = Number(it.wastedBytes) || 0;
      if (url && wasted > (map.get(url) ?? 0)) map.set(url, wasted);
    }
  }
  return map;
}

export function buildOpportunities(lhr: LHR): Opportunities {
  const bytes = (id: string) => Number(audit(lhr, id)?.details?.overallSavingsBytes) || 0;
  const ms = (id: string) => Number(audit(lhr, id)?.details?.overallSavingsMs) || 0;
  const okScore = (id: string) => {
    const s = auditScore(lhr, id);
    return s === null || s >= 0.9;
  };
  const imageSavings = [...imageSavingsMap(lhr).values()].reduce((a, b) => a + b, 0);

  return {
    unusedJsBytes: bytes('unused-javascript'),
    unusedCssBytes: bytes('unused-css-rules'),
    renderBlockingMs: ms('render-blocking-resources'),
    compressionOk: okScore('uses-text-compression'),
    compressionSavingsBytes: bytes('uses-text-compression'),
    cachingOk: okScore('uses-long-cache-ttl'),
    cachingSavingsBytes: Number(audit(lhr, 'uses-long-cache-ttl')?.details?.summary?.wastedBytes) || 0,
    imageSavingsBytes: imageSavings,
  };
}
