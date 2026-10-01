import type { LHR } from '../lighthouse.js';
import { hostOf, items, registrableDomain } from './helpers.js';

export type ReqType = 'document' | 'stylesheet' | 'script' | 'image' | 'font' | 'media' | 'other';

export interface Req {
  url: string;
  host: string;
  domain: string;
  type: ReqType;
  transferSize: number;
  thirdParty: boolean;
}

const TYPE_MAP: Record<string, ReqType> = {
  document: 'document',
  stylesheet: 'stylesheet',
  script: 'script',
  image: 'image',
  font: 'font',
  media: 'media',
};

export function mainDomainOf(lhr: LHR): string {
  return registrableDomain(hostOf(lhr.finalDisplayedUrl ?? lhr.finalUrl ?? lhr.requestedUrl ?? ''));
}

/** Normalised list of network requests. "Third party" = different registrable domain. */
export function collectRequests(lhr: LHR): Req[] {
  const main = mainDomainOf(lhr);
  const out: Req[] = [];
  for (const it of items(lhr, 'network-requests')) {
    const url: string = it.url ?? '';
    if (!/^https?:/i.test(url)) continue;
    const rt = String(it.resourceType ?? '').toLowerCase();
    if (rt === 'preflight') continue;
    const host = hostOf(url);
    const domain = registrableDomain(host);
    out.push({
      url,
      host,
      domain,
      type: TYPE_MAP[rt] ?? 'other',
      transferSize: Number(it.transferSize) || 0,
      thirdParty: domain !== main,
    });
  }
  return out;
}
