import lighthouse, { defaultConfig } from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { blockedPrivateUrlPatterns } from './safeUrl.js';

export type LHR = any;

export interface RunOptions {
  blockedUrlPatterns?: string[];
  timeoutMs?: number;
}

export interface Measurement {
  lhr: LHR;
  runScores: number[];
  engine: 'local';
}

const perfScore = (lhr: LHR) =>
  Math.round((lhr.categories?.performance?.score ?? 0) * 100);

export async function runLighthouse(
  url: string,
  opts: RunOptions = {}
): Promise<LHR> {

  const chromeFlags = [
    '--headless=new',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
  ];

  let chrome: chromeLauncher.LaunchedChrome | null = null;
  let timedOut = false;

  try {
    chrome = await chromeLauncher.launch({
      chromeFlags,
    });

    const timer = setTimeout(() => {
      timedOut = true;

      try {
        chrome?.kill();
      } catch {
        // Chrome may already be closed.
      }
    }, opts.timeoutMs ?? 120_000);

    try {
      const result = await lighthouse(
        url,
        {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: [
            'performance',
            'accessibility',
            'best-practices',
            'seo',
          ],
          blockedUrlPatterns: [
            ...blockedPrivateUrlPatterns,
            ...(opts.blockedUrlPatterns ?? []),
          ],
        },
        defaultConfig
      );

      if (!result?.lhr) {
        throw new Error('Lighthouse returned no result');
      }

      if (result.lhr.runtimeError) {
        throw new Error(
          result.lhr.runtimeError.message ||
          'Lighthouse could not load the page'
        );
      }

      return result.lhr;

    } finally {
      clearTimeout(timer);
    }

  } catch (e) {

    if (timedOut) {
      throw new Error('Analysis timed out after 2 minutes');
    }

    throw e;

  } finally {

    if (chrome) {
      try {
        await chrome.kill();
      } catch {
        // Chrome already closed.
      }

      chrome = null;
    }
  }
}

export async function runMedian(
  url: string,
  runs: number,
  opts: RunOptions = {}
) {
  const lhrs: LHR[] = [];

  for (let i = 0; i < runs; i++) {
    lhrs.push(await runLighthouse(url, opts));
  }

  const scores = lhrs.map(perfScore);

  const order = [...lhrs.keys()].sort(
    (a, b) => scores[a] - scores[b]
  );

  const median =
    lhrs[order[Math.floor(order.length / 2)]];

  return {
    lhr: median,
    runScores: scores,
  };
}

export async function measure(
  url: string
): Promise<Measurement> {

  const runs = Math.max(
    1,
    Number(process.env.RUNS ?? 1)
  );

  const { lhr, runScores } =
    await runMedian(url, runs);

  return {
    lhr,
    runScores,
    engine: 'local',
  };
}