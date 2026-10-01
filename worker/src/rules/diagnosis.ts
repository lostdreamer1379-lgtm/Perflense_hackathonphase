import type { Diagnosis, Severity } from '../report.js';
import type { Parsed } from '../parser/index.js';
import { fmtBytes, fmtMs } from '../parser/helpers.js';
import { LARGE_IMAGE_BYTES, LIMITS, SEVERITY_RANK, severityByBytes, severityOf } from './thresholds.js';

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);
const range = (l: [number, number], f: (n: number) => string) =>
  `Medium from ${f(l[0])}, high from ${f(l[1])}`;

/** Deterministic, evidence-based diagnosis. No AI is involved in deciding severity. */
export function buildDiagnosis(p: Parsed): Diagnosis[] {
  const { profile: pr, blame, opps, vitals } = p;
  const vital = (k: string) => vitals.find((v) => v.key === k);
  const out: Diagnosis[] = [];

  const add = (
    id: string, title: string, severity: Severity, value: string,
    threshold: string, bad: string, ok: string,
  ) => out.push({ id, title, severity, value, threshold, text: severity === 'healthy' ? ok : bad });

  // JavaScript
  add(
    'js-payload', 'JavaScript payload', severityOf(pr.bytes.js, LIMITS.jsBytes),
    `${fmtBytes(pr.bytes.js)} in ${pr.counts.jsFiles} files`, range(LIMITS.jsBytes, fmtBytes),
    `The page transfers ${fmtBytes(pr.bytes.js)} of JavaScript across ${pr.counts.jsFiles} files, ${pct(pr.bytes.js, pr.bytes.total)}% of its total weight. Scripts must be downloaded, parsed and executed on the main thread, so large bundles delay both loading and interactivity.${opps.unusedJsBytes > 0 ? ` About ${fmtBytes(opps.unusedJsBytes)} of it looks unused while the page loads.` : ''}`,
    `JavaScript totals ${fmtBytes(pr.bytes.js)} across ${pr.counts.jsFiles} files, which is within a healthy range.`,
  );

  // Images
  add(
    'image-payload', 'Image payload', severityOf(pr.bytes.images, LIMITS.imageBytes),
    `${fmtBytes(pr.bytes.images)} in ${pr.counts.images} images`, range(LIMITS.imageBytes, fmtBytes),
    `Images make up ${fmtBytes(pr.bytes.images)} (${pct(pr.bytes.images, pr.bytes.total)}% of page weight)${blame.largeImageCount > 0 ? `, and ${blame.largeImageCount} of them are larger than ${fmtBytes(LARGE_IMAGE_BYTES)}` : ''}. Oversized or unoptimised images compete with critical resources for bandwidth and often delay the largest paint.${opps.imageSavingsBytes > 0 ? ` Lighthouse estimates up to ${fmtBytes(opps.imageSavingsBytes)} could be saved.` : ''}`,
    `Images total ${fmtBytes(pr.bytes.images)}, which is within a healthy range.`,
  );

  // Third parties
  const blocking = blame.thirdParties.reduce((s, t) => s + t.blockingMs, 0);
  let tpSeverity = severityOf(pr.requests.thirdParty, LIMITS.thirdPartyRequests);
  if (blocking >= 600) tpSeverity = 'high';
  else if (blocking >= 250 && tpSeverity === 'healthy') tpSeverity = 'medium';
  const topTp = blame.thirdParties[0];
  add(
    'third-party', 'Third-party resources', tpSeverity,
    `${pr.requests.thirdParty} requests, ${fmtBytes(pr.bytes.thirdParty)}`,
    `${range(LIMITS.thirdPartyRequests, (n) => `${n} requests`)}; or 250 ms / 600 ms of blocking time`,
    `${pr.requests.thirdParty} requests go to other domains (${fmtBytes(pr.bytes.thirdParty)}). Each adds network round trips, and third-party code runs on your page's main thread${blocking > 0 ? `; Lighthouse attributes about ${fmtMs(blocking)} of blocking time to them` : ''}.${topTp ? ` The heaviest is ${topTp.name}.` : ''}`,
    `Only ${pr.requests.thirdParty} third-party requests were found, which is a light footprint.`,
  );

  // Request volume
  add(
    'request-volume', 'Request volume', severityOf(pr.requests.total, LIMITS.requests),
    `${pr.requests.total} requests`, range(LIMITS.requests, (n) => `${n} requests`),
    `The page makes ${pr.requests.total} network requests. Every request has overhead, and a large number of requests slows loading on high-latency mobile connections.`,
    `${pr.requests.total} requests is a reasonable number.`,
  );

  // DOM
  add(
    'dom-complexity', 'DOM complexity', severityOf(pr.dom, LIMITS.dom),
    `${pr.dom.toLocaleString('en-US')} elements`, range(LIMITS.dom, (n) => `${n} elements`),
    `The page has ${pr.dom.toLocaleString('en-US')} DOM elements. Large DOMs use more memory and make style and layout work slower, especially on low-end phones.`,
    `${pr.dom.toLocaleString('en-US')} DOM elements is within a healthy range.`,
  );

  // LCP
  const lcp = vital('lcp');
  if (lcp) {
    const el = blame.lcpElement;
    add(
      'lcp', 'Largest Contentful Paint', severityOf(lcp.value, LIMITS.lcp),
      lcp.display, range(LIMITS.lcp, fmtMs),
      `Largest Contentful Paint takes ${lcp.display}, so visitors wait that long to see the main content.${el ? ` The largest element is ${el.label || el.selector}.` : ''}`,
      `Largest Contentful Paint is ${lcp.display}, which is healthy.`,
    );
  }

  // Main-thread blocking
  const tbt = vital('tbt');
  if (tbt) {
    const cpuTop = [...blame.scripts].sort((a, b) => b.cpuMs - a.cpuMs)[0];
    add(
      'tbt', 'Main-thread blocking', severityOf(tbt.value, LIMITS.tbt),
      tbt.display, range(LIMITS.tbt, fmtMs),
      `Total Blocking Time is ${tbt.display}. While the main thread is busy, taps and clicks feel ignored.${cpuTop && cpuTop.cpuMs > 0 ? ` The most CPU-hungry script is ${cpuTop.host} (${fmtMs(cpuTop.cpuMs)}).` : ''}`,
      `Total Blocking Time is ${tbt.display}, so the page should feel responsive.`,
    );
  }

  // Render-blocking
  add(
    'render-blocking', 'Render-blocking resources', severityOf(opps.renderBlockingMs, LIMITS.renderBlockingMs),
    fmtMs(opps.renderBlockingMs), range(LIMITS.renderBlockingMs, fmtMs),
    `Stylesheets and scripts in the page head delay the first paint by an estimated ${fmtMs(opps.renderBlockingMs)}.`,
    'No significant render-blocking resources were found.',
  );

  // Server response
  const ttfb = vital('ttfb');
  if (ttfb) {
    add(
      'server-response', 'Server response time', severityOf(ttfb.value, LIMITS.ttfb),
      ttfb.display, range(LIMITS.ttfb, fmtMs),
      `The server took ${ttfb.display} to respond. Nothing else can load until it does, so every other timing inherits this delay.`,
      `The server responds in ${ttfb.display}, which is healthy.`,
    );
  }

  // Layout stability
  const cls = vital('cls');
  if (cls) {
    add(
      'layout-stability', 'Layout stability', severityOf(cls.value, LIMITS.cls),
      cls.display, range(LIMITS.cls, (n) => String(n)),
      `Cumulative Layout Shift is ${cls.display}, so content moves around while loading.${blame.clsCulprits.length ? ` Elements involved: ${blame.clsCulprits.join(', ')}.` : ''}`,
      `Layout is stable (CLS ${cls.display}).`,
    );
  }

  // Compression
  const compSeverity: Severity = opps.compressionOk
    ? 'healthy'
    : severityByBytes(opps.compressionSavingsBytes) === 'healthy' ? 'low' : severityByBytes(opps.compressionSavingsBytes);
  add(
    'compression', 'Text compression', compSeverity,
    opps.compressionOk ? 'Enabled' : `${fmtBytes(opps.compressionSavingsBytes)} avoidable`,
    'Text assets should be served compressed',
    `Some text assets are served uncompressed${opps.compressionSavingsBytes > 0 ? `, wasting about ${fmtBytes(opps.compressionSavingsBytes)}` : ''}.`,
    'Text assets are served compressed.',
  );

  // Caching
  // Caching only helps repeat visits, so it is never rated above medium
  const cacheRaw = severityByBytes(opps.cachingSavingsBytes);
  const cacheSeverity: Severity = opps.cachingOk
    ? 'healthy'
    : cacheRaw === 'healthy' ? 'low' : cacheRaw === 'high' ? 'medium' : cacheRaw;
  add(
    'caching', 'Browser caching', cacheSeverity,
    opps.cachingOk ? 'Efficient' : `${fmtBytes(opps.cachingSavingsBytes)} re-downloaded`,
    'Static assets should have long cache lifetimes',
    `Many static assets have short cache lifetimes, so returning visitors re-download about ${fmtBytes(opps.cachingSavingsBytes)}.`,
    'Static assets are cached efficiently.',
  );

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

export function groupBottlenecks(diagnosis: Diagnosis[]) {
  const titles = (s: Severity) => diagnosis.filter((d) => d.severity === s).map((d) => d.title);
  return { high: titles('high'), medium: titles('medium'), low: titles('low'), healthy: titles('healthy') };
}
