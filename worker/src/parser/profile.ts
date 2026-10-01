import type { LHR } from '../lighthouse.js';
import type { Distribution, Profile } from '../report.js';
import { num } from './helpers.js';
import type { Req } from './requests.js';

export function buildProfile(lhr: LHR, reqs: Req[]): Profile {
  const sum = (pred: (r: Req) => boolean) =>
    reqs.filter(pred).reduce((s, r) => s + r.transferSize, 0);
  const count = (t: Req['type']) => reqs.filter((r) => r.type === t).length;

  const bytes = {
    total: sum(() => true),
    html: sum((r) => r.type === 'document'),
    css: sum((r) => r.type === 'stylesheet'),
    js: sum((r) => r.type === 'script'),
    images: sum((r) => r.type === 'image'),
    fonts: sum((r) => r.type === 'font'),
    media: sum((r) => r.type === 'media'),
    other: sum((r) => r.type === 'other'),
    thirdParty: sum((r) => r.thirdParty),
  };
  const thirdParty = reqs.filter((r) => r.thirdParty);

  return {
    bytes,
    requests: {
      total: reqs.length,
      firstParty: reqs.length - thirdParty.length,
      thirdParty: thirdParty.length,
    },
    dom: Math.round(num(lhr, 'dom-size')),
    counts: {
      images: count('image'),
      jsFiles: count('script'),
      cssFiles: count('stylesheet'),
      fonts: count('font'),
      // Sub-documents beyond the main page: iframes and similar embedded pages
      iframes: Math.max(0, count('document') - 1),
    },
    thirdPartyHosts: [...new Set(thirdParty.map((r) => r.host))].sort(),
  };
}

export function buildDistribution(p: Profile): Distribution {
  const total = p.bytes.total || 1;
  const rows = [
    { type: 'js', label: 'JavaScript', bytes: p.bytes.js },
    { type: 'images', label: 'Images', bytes: p.bytes.images },
    { type: 'css', label: 'CSS', bytes: p.bytes.css },
    { type: 'fonts', label: 'Fonts', bytes: p.bytes.fonts },
    { type: 'html', label: 'HTML', bytes: p.bytes.html },
    { type: 'other', label: 'Other', bytes: p.bytes.media + p.bytes.other },
  ];
  return {
    bytes: rows
      .filter((r) => r.bytes > 0)
      .map((r) => ({ ...r, percent: Math.round((r.bytes / total) * 1000) / 10 })),
    requests: { firstParty: p.requests.firstParty, thirdParty: p.requests.thirdParty },
  };
}
