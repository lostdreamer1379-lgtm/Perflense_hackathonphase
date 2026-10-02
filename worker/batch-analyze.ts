import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
} from 'node:fs';

import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { measure } from './src/lighthouse.js';
import { parseLighthouse } from './src/parser/index.js';

/* =========================================================
   PATHS
   ========================================================= */

const urlFile = resolve(
  process.argv[2] || '../data/urls-to-crawl.txt'
);

const csvPath = resolve('../data/crawl-results.csv');

/* =========================================================
   VALIDATE URL FILE
   ========================================================= */

if (!existsSync(urlFile)) {
  console.error(`❌ URL file not found: ${urlFile}`);
  process.exit(1);
}

/* =========================================================
   CONFIGURATION
   ========================================================= */

const BATCH_SIZE = 10;

/*
 * Restart the Node process after this many URLs have been
 * processed by the current process.
 *
 * This helps release accumulated Node/Chrome/Lighthouse
 * memory before continuing with the remaining URLs.
 */
const MAX_URLS_PER_PROCESS = 40;

/*
 * Number of Lighthouse attempts per URL.
 */
const MAX_ATTEMPTS = 1;

/*
 * Delay between Lighthouse retry attempts.
 */
const RETRY_DELAY_MS = 3000;

/*
 * Delay between batches.
 */
const BATCH_DELAY_MS = 2000;

/* =========================================================
   LOAD ALL URLS
   ========================================================= */

const allUrls = readFileSync(urlFile, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

console.log(`📊 Total URLs in list: ${allUrls.length}`);

/* =========================================================
   CSV HEADER
   ========================================================= */

const header = [
  'url',
  'bytes_total',
  'bytes_js',
  'bytes_images',
  'bytes_css',
  'bytes_fonts',
  'requests_total',
  'requests_3p',
  'dom_elements',
  'lcp_ms',
  'fcp_ms',
  'tbt_ms',
  'cls',
  'performance_score',
  'timestamp',
].join(',');

/* =========================================================
   CREATE CSV IF NEEDED
   ========================================================= */

if (!existsSync(csvPath)) {
  writeFileSync(csvPath, header + '\n');
  console.log(`📁 Created ${csvPath}`);
}

/* =========================================================
   LOAD SUCCESSFULLY COMPLETED URLS
   ========================================================= */

/*
 * IMPORTANT:
 *
 * crawl-results.csv only contains successful Lighthouse
 * measurements.
 *
 * Failed URLs are intentionally NOT written to the CSV.
 *
 * Therefore the CSV remains a clean successful-results
 * dataset rather than becoming a mixed result/state file.
 */

const completedUrls = new Set<string>();

if (existsSync(csvPath)) {
  const existingCsv = readFileSync(csvPath, 'utf8');

  const lines = existingCsv
    .split(/\r?\n/)
    .slice(1);

  for (const line of lines) {
    if (!line.trim()) continue;

    /*
     * URL is the first CSV field.
     *
     * The current URL list should not contain commas inside
     * URLs, so the first comma is sufficient here.
     */
    const commaIndex = line.indexOf(',');

    if (commaIndex > 0) {
      const url = line.slice(0, commaIndex).trim();

      if (url) {
        completedUrls.add(url);
      }
    }
  }
}

console.log(
  `🔄 Successful URLs already in CSV: ${completedUrls.size}/${allUrls.length}`
);

/* =========================================================
   DETERMINE STARTING URL NUMBER
   ========================================================= */

/*
 * On the first/manual run:
 *
 *   Enter URL number to resume from:
 *
 * Example:
 *
 *   149
 *
 * means:
 *
 *   Start checking from URL #149.
 *
 * URLs before #149 are intentionally ignored.
 *
 * The CSV is still checked, so successfully crawled URLs
 * after #149 are also skipped.
 *
 *
 * When the process automatically recycles, it passes the
 * next URL number through PERFLENS_RESUME_FROM so that the
 * new process does not ask the question again.
 */

async function getStartingUrlNumber(): Promise<number> {
  const environmentStart = Number(
    process.env.PERFLENS_RESUME_FROM
  );

  if (
    Number.isInteger(environmentStart) &&
    environmentStart >= 1 &&
    environmentStart <= allUrls.length
  ) {
    console.log(
      `♻️ Automatically resuming from URL #${environmentStart}`
    );

    return environmentStart;
  }

  const rl = createInterface({
    input,
    output,
  });

  const answer = await rl.question(
    `\nEnter URL number to resume from (1-${allUrls.length}, default 1): `
  );

  rl.close();

  const trimmed = answer.trim();

  /*
   * Empty input means start from URL #1.
   */
  if (!trimmed) {
    return 1;
  }

  const startNumber = Number(trimmed);

  if (
    !Number.isInteger(startNumber) ||
    startNumber < 1 ||
    startNumber > allUrls.length
  ) {
    console.error(
      `❌ Invalid URL number: "${answer}". ` +
      `Enter an integer between 1 and ${allUrls.length}.`
    );

    process.exit(1);
  }

  return startNumber;
}

/* =========================================================
   SAFE LIGHTHOUSE MEASUREMENT WITH RETRIES
   ========================================================= */

async function measureWithRetry(
  fullUrl: string,
  displayUrl: string,
  originalIndex: number
) {
  let lastError: unknown = null;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt++
  ) {
    try {
      const result = await measure(fullUrl);

      return result.lhr;

    } catch (error) {
      lastError = error;

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.log(
        `\n   ⚠️ Attempt ${attempt}/${MAX_ATTEMPTS} failed: ` +
        `${message.slice(0, 180)}`
      );

      if (attempt < MAX_ATTEMPTS) {
        console.log(
          `   🔄 Retrying ${displayUrl} in ` +
          `${RETRY_DELAY_MS / 1000}s...`
        );

        await new Promise<void>((resolve) => {
          setTimeout(resolve, RETRY_DELAY_MS);
        });

        process.stdout.write(
          `[${originalIndex}/${allUrls.length}] ` +
          `${displayUrl}... `
        );
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

/* =========================================================
   GLOBAL RUN STATE
   ========================================================= */

let completedThisRun = 0;
let failedThisRun = 0;
let processedByThisProcess = 0;

let currentUrlNumber = 1;

const startTime = Date.now();

/* =========================================================
   PROCESS BATCH
   ========================================================= */

async function processBatch(
  batch: string[],
  batchNum: number,
  totalBatches: number
) {
  console.log(
    `\n🔄 Batch ${batchNum}/${totalBatches}`
  );

  for (const url of batch) {

    /*
     * Find the original position in the URL list.
     *
     * This keeps progress messages aligned with the user's
     * original URL numbering.
     */
    const originalIndex =
      allUrls.indexOf(url) + 1;

    /*
     * Update this before processing so that if the Node
     * process is recycled, we know where the next URL starts.
     */
    currentUrlNumber = originalIndex;

    /*
     * This should normally be unreachable because
     * remainingUrls was already filtered, but keeping this
     * check makes the batcher defensive.
     */
    if (completedUrls.has(url)) {
      console.log(
        `[${originalIndex}/${allUrls.length}] ` +
        `${url}... ⏭ already completed`
      );

      continue;
    }

    const fullUrl = url.startsWith('http')
      ? url
      : `https://${url}`;

    process.stdout.write(
      `[${originalIndex}/${allUrls.length}] ${url}... `
    );

    /* =====================================================
       LIGHTHOUSE + RETRIES
       ===================================================== */

    let lhr: any;

    try {
      lhr = await measureWithRetry(
        fullUrl,
        url,
        originalIndex
      );

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.log(
        `✗ Failed after ${MAX_ATTEMPTS} attempts: ` +
        `${message.slice(0, 180)}`
      );

      /*
       * IMPORTANT:
       *
       * Failed URLs are NOT written to crawl-results.csv.
       *
       * This keeps the CSV a clean successful-results dataset.
       */
      failedThisRun++;
      processedByThisProcess++;

      /*
       * Move to the next URL.
       */
      currentUrlNumber = originalIndex + 1;

      continue;
    }

    /* =====================================================
       PARSE LIGHTHOUSE RESULT
       ===================================================== */

    try {
      const p = parseLighthouse(lhr);

      /* ===================================================
         BUILD CSV ROW
         =================================================== */

      const row = [
        url,
        p.profile.bytes.total,
        p.profile.bytes.js,
        p.profile.bytes.images,
        p.profile.bytes.css,
        p.profile.bytes.fonts,
        p.profile.requests.total,
        p.profile.requests.thirdParty,
        p.profile.dom,
        Math.round(p.baseline.lcp),
        Math.round(p.baseline.fcp),
        Math.round(p.baseline.tbt),
        p.baseline.cls.toFixed(2),
        p.scores.performance,
        new Date().toISOString(),
      ].join(',');

      /* ===================================================
         SAVE SUCCESSFUL RESULT
         =================================================== */

      appendFileSync(
        csvPath,
        row + '\n'
      );

      /*
       * Update in-memory checkpoint immediately.
       */
      completedUrls.add(url);

      completedThisRun++;
      processedByThisProcess++;

      console.log('✓');

      /*
       * Ask Node for garbage collection if started with:
       *
       *   --expose-gc
       */
      (global as any).gc?.();

      /*
       * Next URL number.
       */
      currentUrlNumber = originalIndex + 1;

    } catch (error) {

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.log(
        `✗ Parse/save error: ${message.slice(0, 180)}`
      );

      /*
       * Do NOT write an incomplete/fake row.
       */
      failedThisRun++;
      processedByThisProcess++;

      currentUrlNumber = originalIndex + 1;
    }
  }

  console.log(
    `✓ Batch ${batchNum}/${totalBatches} complete.`
  );

  /*
   * Explicit GC between batches when available.
   */
  (global as any).gc?.();

  /*
   * Small pause before starting another batch.
   */
  await new Promise<void>((resolve) => {
    setTimeout(resolve, BATCH_DELAY_MS);
  });
}

/* =========================================================
   MAIN
   ========================================================= */

async function run() {

  /* =======================================================
     ASK WHERE TO START
     ======================================================= */

  const startNumber =
    await getStartingUrlNumber();

  currentUrlNumber = startNumber;

  console.log(
    `\n📍 Starting from URL #${startNumber}`
  );

  console.log(
    `   ${allUrls[startNumber - 1]}\n`
  );

  /* =======================================================
     SLICE URL LIST FROM START POINT
     ======================================================= */

  const urlsFromStart =
    allUrls.slice(startNumber - 1);

  /*
   * IMPORTANT:
   *
   * We now filter against the successful CSV.
   *
   * Therefore:
   *
   *   - Before start number → ignored
   *   - After start number + already successful → skipped
   *   - After start number + failed → attempted
   *   - After start number + never attempted → attempted
   */

  const remainingUrls =
    urlsFromStart.filter(
      (url) => !completedUrls.has(url)
    );

  console.log(
    `🔄 Successful URLs skipped: ` +
    `${urlsFromStart.length - remainingUrls.length}`
  );

  console.log(
    `📌 URLs to process from this starting point: ` +
    `${remainingUrls.length}`
  );

  if (remainingUrls.length === 0) {
    console.log(
      `\n✅ No unprocessed URLs remain from URL #${startNumber}.`
    );

    console.log(
      `📁 Results: ${csvPath}`
    );

    return;
  }

  /* =======================================================
     CREATE BATCHES
     ======================================================= */

  const batches: string[][] = [];

  for (
    let i = 0;
    i < remainingUrls.length;
    i += BATCH_SIZE
  ) {
    batches.push(
      remainingUrls.slice(
        i,
        i + BATCH_SIZE
      )
    );
  }

  console.log(
    `📦 ${batches.length} batches of up to ` +
    `${BATCH_SIZE} sites`
  );

  console.log(
    `♻️ Node process recycling every ` +
    `${MAX_URLS_PER_PROCESS} processed URLs\n`
  );

  /* =======================================================
     PROCESS BATCHES
     ======================================================= */

  for (
    let i = 0;
    i < batches.length;
    i++
  ) {

    await processBatch(
      batches[i],
      i + 1,
      batches.length
    );

    const elapsedMinutes =
      (Date.now() - startTime) /
      1000 /
      60;

    const perProcessedUrl =
      processedByThisProcess > 0
        ? elapsedMinutes /
          processedByThisProcess
        : 0;

    const remainingInThisRun =
      remainingUrls.length -
      (completedThisRun + failedThisRun);

    const estimatedMinutes =
      perProcessedUrl *
      remainingInThisRun;

    console.log(
      `\n   📊 Processed by this Node process: ` +
      `${processedByThisProcess}`
    );

    console.log(
      `   ✓ Successful this run: ` +
      `${completedThisRun}`
    );

    console.log(
      `   ✗ Failed this run: ` +
      `${failedThisRun}`
    );

    console.log(
      `   📁 Successful rows in CSV: ` +
      `${completedUrls.size}/${allUrls.length}`
    );

    if (processedByThisProcess > 0) {
      console.log(
        `   ⏳ Estimated remaining in this run: ` +
        `~${estimatedMinutes.toFixed(0)} min`
      );
    }

    /* =====================================================
       PROCESS RECYCLING
       ===================================================== */

    if (
      processedByThisProcess >=
      MAX_URLS_PER_PROCESS
    ) {

      /*
       * There are still URLs that this run has not reached.
       */
      const moreWorkRemains =
        i < batches.length - 1;

      if (moreWorkRemains) {

        /*
         * Find the next URL that has not been processed
         * in this process.
         *
         * We use the original URL numbering rather than
         * restarting from the beginning.
         */
        const nextBatch =
          batches[i + 1];

        const nextUrl =
          nextBatch[0];

        const nextIndex =
          allUrls.indexOf(nextUrl) + 1;

        console.log(
          `\n♻️ Processed ${processedByThisProcess} URLs.`
        );

        console.log(
          `♻️ Restarting Node process to release memory...`
        );

        console.log(
          `📍 Next process will start from URL #${nextIndex}`
        );

        console.log(
          `   ${nextUrl}`
        );

        console.log(
          `📊 Successful CSV rows: ` +
          `${completedUrls.size}/${allUrls.length}\n`
        );

        /*
         * IMPORTANT:
         *
         * The next process receives the exact next URL
         * number through an environment variable.
         *
         * Therefore it does NOT ask the user for another
         * starting number.
         */
        const child = spawn(
          process.execPath,
          [
            './node_modules/tsx/dist/cli.mjs',
            process.argv[1],
            ...process.argv.slice(2),
          ],
          {
            stdio: 'inherit',
            env: {
              ...process.env,
              PERFLENS_RESUME_FROM:
                String(nextIndex),
            },
          }
        );

        child.on(
          'error',
          (error) => {
            console.error(
              `❌ Failed to start replacement process:`,
              error
            );

            process.exit(1);
          }
        );

        child.on(
          'exit',
          (code, signal) => {

            if (signal) {
              console.error(
                `❌ Replacement process exited from signal ${signal}`
              );

              process.exit(1);
            }

            process.exit(
              code ?? 0
            );
          }
        );

        return;
      }
    }
  }

  /* =======================================================
     FINAL SUMMARY
     ======================================================= */

  const totalTime =
    (
      (Date.now() - startTime) /
      1000 /
      60
    ).toFixed(1);

  const successful =
    completedUrls.size;

  const remaining =
    allUrls.length -
    successful;

  console.log(
    `\n${'='.repeat(70)}`
  );

  console.log(
    `📈 PERFLENS CRAWL COMPLETE`
  );

  console.log(
    `${'='.repeat(70)}`
  );

  console.log(
    `⏱️  Time: ${totalTime} minutes`
  );

  console.log(
    `✓ Successful: ${successful}/${allUrls.length}`
  );

  console.log(
    `✗ URLs without successful results: ${remaining}`
  );

  console.log(
    `✓ Successful this run: ${completedThisRun}`
  );

  console.log(
    `✗ Failed this run: ${failedThisRun}`
  );

  console.log(
    `📁 Dataset: ${csvPath}`
  );

  console.log(
    `${'='.repeat(70)}`
  );
}

/* =========================================================
   PROCESS-LEVEL ERROR HANDLING
   ========================================================= */

/*
 * These handlers prevent an unhandled rejection from
 * silently disappearing.
 *
 * The CSV is append-only, so successful results already
 * written to disk remain safe if the process terminates.
 */

process.on(
  'uncaughtException',
  (error) => {

    console.error(
      '\n❌ Uncaught exception:'
    );

    console.error(error);

    console.error(
      '\n💾 Existing CSV data is preserved.'
    );

    console.error(
      '🔄 Restart the crawler manually and choose the appropriate URL number.'
    );

    process.exitCode = 1;
  }
);

process.on(
  'unhandledRejection',
  (reason) => {

    console.error(
      '\n⚠️ Unhandled promise rejection:'
    );

    console.error(reason);

    console.error(
      '\n💾 Existing CSV data is preserved.'
    );

    console.error(
      '🔄 Restart the crawler manually and choose the appropriate URL number.'
    );

    process.exitCode = 1;
  }
);

/* =========================================================
   START
   ========================================================= */

run().catch((error) => {

  console.error(
    '\n❌ Fatal crawler error:'
  );

  console.error(error);

  console.error(
    '\n💾 Existing CSV data is preserved.'
  );

  process.exit(1);
});

