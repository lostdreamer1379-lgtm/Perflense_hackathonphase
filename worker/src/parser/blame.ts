import type { LHR } from '../lighthouse.js';
import type { Blame, ImageBlame, ScriptBlame, ThirdPartyBlame } from '../report.js';
import { audit, hostOf, items, registrableDomain } from './helpers.js';
import { imageSavingsMap } from './opportunities.js';
import type { Req } from './requests.js';
import { LARGE_IMAGE_BYTES } from '../rules/thresholds.js';

/** Rough "cost" used only for sorting: CPU time plus download time at mobile throughput (~200 bytes/ms). */
export const costOf = (cpuMs: number, bytes: number) => cpuMs + bytes / 200;

const entityName = (e: unknown): string =>
  typeof e === 'string' ? e : ((e as { text?: string } | null)?.text ?? '');

export function buildBlame(lhr: LHR, reqs: Req[]): Blame {
  // Scripts
  const cpuByUrl = new Map<string, number>();
  for (const it of items(lhr, 'bootup-time')) {
    if (it.url) cpuByUrl.set(it.url, Number(it.total) || 0);
  }
  const scripts: ScriptBlame[] = reqs
    .filter((r) => r.type === 'script')
    .map((r) => ({
      url: r.url,
      host: r.host,
      transferSize: r.transferSize,
      cpuMs: Math.round(cpuByUrl.get(r.url) ?? 0),
      thirdParty: r.thirdParty,
    }))
    .sort((a, b) => costOf(b.cpuMs, b.transferSize) - costOf(a.cpuMs, a.transferSize))
    .slice(0, 8);

  // Images
  const savings = imageSavingsMap(lhr);
  const imageReqs = reqs.filter((r) => r.type === 'image');
  const images: ImageBlame[] = imageReqs
    .map((r) => ({
      url: r.url,
      transferSize: r.transferSize,
      potentialSavings: Math.min(savings.get(r.url) ?? 0, r.transferSize || Infinity),
    }))
    .sort((a, b) => b.transferSize - a.transferSize)
    .slice(0, 8);
  const largeImageCount = imageReqs.filter((r) => r.transferSize > LARGE_IMAGE_BYTES).length;

  // Third parties, grouped by company name when Lighthouse knows it, otherwise by domain
  const entityByDomain = new Map<string, string>();
  const blockingByDomain = new Map<string, number>();
  for (const it of items(lhr, 'third-party-summary')) {
    const name = entityName(it.entity);
    for (const s of it.subItems?.items ?? []) {
      if (!s.url) continue;
      const d = registrableDomain(hostOf(s.url));
      if (!d) continue;
      if (name) entityByDomain.set(d, name);
      blockingByDomain.set(d, (blockingByDomain.get(d) ?? 0) + (Number(s.blockingTime) || 0));
    }
  }
  const groups = new Map<string, { hosts: Set<string>; domains: Set<string>; requests: number; transferSize: number }>();
  for (const r of reqs.filter((x) => x.thirdParty)) {
    const key = entityByDomain.get(r.domain) ?? r.domain;
    const g = groups.get(key) ?? { hosts: new Set(), domains: new Set(), requests: 0, transferSize: 0 };
    g.hosts.add(r.host);
    g.domains.add(r.domain);
    g.requests += 1;
    g.transferSize += r.transferSize;
    groups.set(key, g);
  }
  const thirdParties: ThirdPartyBlame[] = [...groups.entries()]
    .map(([name, g]) => ({
      name,
      hosts: [...g.hosts].sort(),
      requests: g.requests,
      transferSize: g.transferSize,
      blockingMs: Math.round([...g.domains].reduce((s, d) => s + (blockingByDomain.get(d) ?? 0), 0)),
    }))
    .sort((a, b) => costOf(b.blockingMs, b.transferSize) - costOf(a.blockingMs, a.transferSize))
    .slice(0, 10);

  // LCP element
  const d = audit(lhr, 'largest-contentful-paint-element')?.details;
  const node = d?.items?.[0]?.items?.[0]?.node ?? d?.items?.[0]?.node;
  const lcpElement = node
    ? {
        selector: String(node.selector ?? ''),
        label: String(node.nodeLabel ?? ''),
        snippet: String(node.snippet ?? ''),
      }
    : null;

  // Elements behind layout shifts
  const clsCulprits = items(lhr, 'layout-shifts')
    .slice(0, 3)
    .map((it) => String(it.node?.nodeLabel || it.node?.selector || ''))
    .filter(Boolean);

  return { scripts, images, thirdParties, lcpElement, largeImageCount, clsCulprits };
}
