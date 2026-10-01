import type { Vital, VitalKey } from '../report.js';
import type { Parsed } from '../parser/index.js';
import { fmtBytes, fmtMs, MB } from '../parser/helpers.js';
import { formatVital, type RawVital } from '../parser/vitals.js';
import { VITAL_LIMITS } from './thresholds.js';

const MEANING: Record<VitalKey, string> = {
  lcp: 'How long it takes for the largest visible element, usually a hero image or a block of headline text, to appear.',
  fcp: 'How long it takes for anything at all to appear on screen.',
  cls: 'How much visible content jumps around while the page loads. 0 means nothing moved.',
  tbt: 'The total time the main thread was blocked by long tasks between first paint and the page becoming interactive.',
  ttfb: 'How long the server took to start responding to the request for the main page.',
};

const WHY: Record<VitalKey, string> = {
  lcp: 'LCP is the moment visitors feel the main content has loaded. A slow LCP is strongly linked to people leaving before the page appears.',
  fcp: 'A long blank screen makes a site feel broken, even if the rest loads quickly.',
  cls: 'Layout shifts make people misclick and lose their place while reading.',
  tbt: 'While the main thread is blocked, taps and clicks feel ignored. TBT is a good predictor of how responsive the page will feel.',
  ttfb: 'Nothing can start loading until the server responds, so every other timing inherits this delay.',
};

function assessment(v: RawVital): string {
  const [good, ni] = VITAL_LIMITS[v.key];
  const g = formatVital(v.key, good);
  const n = formatVital(v.key, ni);
  if (v.rating === 'good') return `${v.display} is within the good range (up to ${g}).`;
  if (v.rating === 'needs-improvement') return `${v.display} needs improvement. Good is up to ${g}; poor is above ${n}.`;
  return `${v.display} is poor. Anything above ${n} is considered poor.`;
}

function contributors(key: VitalKey, v: RawVital, p: Parsed): string[] {
  const { profile: pr, blame, opps, vitals } = p;
  const ttfb = vitals.find((x) => x.key === 'ttfb');
  const out: string[] = [];

  if (key === 'lcp') {
    const el = blame.lcpElement;
    if (el) {
      const isImg = el.snippet.trimStart().startsWith('<img');
      out.push(`The LCP element is ${el.label || el.selector}${isImg ? ' (an image)' : ''}.`);
    }
    if (ttfb && ttfb.value > 800) out.push(`The server takes ${ttfb.display} to respond, which delays everything after it.`);
    if (opps.renderBlockingMs > 300) out.push(`Render-blocking CSS and JavaScript add about ${fmtMs(opps.renderBlockingMs)}.`);
    if (pr.bytes.images > 1.5 * MB) out.push(`${fmtBytes(pr.bytes.images)} of images compete for bandwidth.`);
    if (pr.bytes.js > 1 * MB) out.push(`${fmtBytes(pr.bytes.js)} of JavaScript competes for bandwidth and main-thread time.`);
  } else if (key === 'fcp') {
    if (ttfb && ttfb.value > 800) out.push(`The server takes ${ttfb.display} to respond.`);
    if (opps.renderBlockingMs > 300) out.push(`Render-blocking resources delay first paint by about ${fmtMs(opps.renderBlockingMs)}.`);
    if (pr.bytes.fonts > 300 * 1024) out.push(`${fmtBytes(pr.bytes.fonts)} of fonts may delay text rendering.`);
  } else if (key === 'cls') {
    if (blame.clsCulprits.length) out.push(`Elements involved in layout shifts: ${blame.clsCulprits.join(', ')}.`);
    if (v.rating === 'good') out.push('No significant unexpected layout shifts were detected.');
  } else if (key === 'tbt') {
    if (pr.bytes.js > 1 * MB) out.push(`${fmtBytes(pr.bytes.js)} of JavaScript has to be parsed and executed.`);
    const top = [...blame.scripts].sort((a, b) => b.cpuMs - a.cpuMs)[0];
    if (top && top.cpuMs > 100) out.push(`The most CPU-hungry script is from ${top.host} (${fmtMs(top.cpuMs)}).`);
    const tp = blame.thirdParties.reduce((s, t) => s + t.blockingMs, 0);
    if (tp >= 100) out.push(`Third-party code accounts for about ${fmtMs(tp)} of blocking time.`);
  } else if (key === 'ttfb') {
    out.push(v.rating === 'good' ? 'The server responds quickly.' : `The server took ${v.display} to answer the request for the main page.`);
  }

  if (!out.length) out.push('No single dominant cause was found in the measured data.');
  return out;
}

export function explainVitals(raw: RawVital[], p: Parsed): Vital[] {
  return raw.map((v) => ({
    ...v,
    explain: {
      meaning: MEANING[v.key],
      assessment: assessment(v),
      why: WHY[v.key],
      contributors: contributors(v.key, v, p),
    },
  }));
}
