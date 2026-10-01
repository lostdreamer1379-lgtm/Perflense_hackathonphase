import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { blockedPrivateUrlPatterns } from './safeUrl.js';

// Lighthouse result object. Typed loosely on purpose: its shape varies between versions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LHR = any;

export interface RunOptions {
  blockedUrlPatterns?: string[];
  timeoutMs?: number;
}

export interface Measurement {
  lhr: LHR;
  runScores: number[];
  engine: 'local' | 'psi';
}

const perfScore = (lhr: LHR) => Math.round((lhr.categories?.performance?.score ?? 0) * 100);

export async function runLighthouse(url: string, opts: RunOptions = {}): Promise<LHR> {
  const outboundProxy = process.env.OUTBOUND_PROXY?.trim();
  if (process.env.REQUIRE_OUTBOUND_PROXY === '1' && !outboundProxy) {
    throw new Error('Worker requires OUTBOUND_PROXY for safe network egress');
  }
  if (outboundProxy) {
    try {
      new URL(outboundProxy);
    } catch {
      throw new Error('OUTBOUND_PROXY must be a valid proxy URL');
    }
  }
  const chromeFlags = ['--headless=new', '--disable-gpu', '--disable-dev-shm-usage'];
  if (outboundProxy) {
    chromeFlags.push(`--proxy-server=${outboundProxy}`, '--proxy-bypass-list=');
  }
  const chrome = await chromeLauncher.launch({
    chromeFlags,
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    chrome.kill();
  }, opts.timeoutMs ?? 120_000);
  try {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      blockedUrlPatterns: [...blockedPrivateUrlPatterns, ...(opts.blockedUrlPatterns ?? [])],
    });
    if (!result?.lhr) throw new Error('Lighthouse returned no result');
    if (result.lhr.runtimeError) {
      throw new Error(result.lhr.runtimeError.message || 'Lighthouse could not load the page');
    }
    return result.lhr;
  } catch (e) {
    if (timedOut) throw new Error('Analysis timed out after 2 minutes');
    throw e;
  } finally {
    clearTimeout(timer);
    try {
      chrome.kill();
    } catch {
      /* already closed */
    }
  }
}

/** Runs Lighthouse `runs` times and returns the run with the median performance score. */
export async function runMedian(url: string, runs: number, opts: RunOptions = {}) {
  const lhrs: LHR[] = [];
  for (let i = 0; i < runs; i++) lhrs.push(await runLighthouse(url, opts));
  const scores = lhrs.map(perfScore);
  const order = [...lhrs.keys()].sort((a, b) => scores[a] - scores[b]);
  const median = lhrs[order[Math.floor(order.length / 2)]];
  return { lhr: median, runScores: scores };
}

/** Google PageSpeed Insights as a fallback measurement engine. */
export async function runPsi(url: string): Promise<LHR> {
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  for (const c of ['performance', 'accessibility', 'seo', 'best-practices']) {
    params.append('category', c);
  }
  if (process.env.PSI_API_KEY) params.set('key', process.env.PSI_API_KEY);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
  if (!res.ok) throw new Error(`PageSpeed Insights failed (${res.status})`);
  const json = (await res.json()) as { lighthouseResult?: LHR };
  if (!json.lighthouseResult) throw new Error('PageSpeed Insights returned no result');
  return json.lighthouseResult;
}

/** Main entry point used by the worker: local Lighthouse with optional PSI fallback. */
export async function measure(url: string): Promise<Measurement> {
  const runs = Math.max(1, Number(process.env.RUNS ?? 1));
  const viaPsi = async (): Promise<Measurement> => {
    const lhr = await runPsi(url);
    return { lhr, runScores: [perfScore(lhr)], engine: 'psi' };
  };
  if (process.env.ENGINE === 'psi') return viaPsi();
  try {
    const { lhr, runScores } = await runMedian(url, runs);
    return { lhr, runScores, engine: 'local' };
  } catch (e) {
    if (process.env.PSI_FALLBACK === '1') {
      console.warn('Local measurement failed, falling back to PageSpeed Insights:', (e as Error).message);
      return viaPsi();
    }
    throw e;
  }
}
