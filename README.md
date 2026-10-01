# Perflens

Perflens is a local website-performance analysis application. A user submits a public website URL from the React frontend, the local Node worker claims the job from Supabase, Lighthouse measures the page in Chromium, and the completed report is written back to Supabase for the frontend to display.

The project is intentionally configured for **local execution only**. There is no deployment workflow, Docker worker, PageSpeed Insights integration, proxy configuration, or remote analysis service.

## What it analyzes

Each real analysis is generated from a local Lighthouse run and includes:

- Performance, accessibility, SEO, and best-practices scores
- Core Web Vitals and supporting timing metrics
- Total transfer size and request counts
- JavaScript, CSS, image, font, media, and third-party distribution
- Largest scripts, images, third parties, and LCP element details
- Rule-based diagnoses with severity and measured evidence
- Ranked engineering recommendations with impact and effort
- A developer action plan ordered by the repository's ranking formula
- Reversible what-if simulations that block selected requests and re-run Lighthouse
- Lighthouse opportunity estimates, explicitly marked as estimates
- A factual engineering summary generated from the measured report

No report is populated with placeholder performance data. If optional AI summary generation is unavailable, the worker uses a deterministic template built from measured facts.

## Architecture

```text
React + Vite frontend
        │
        │ anonymous auth, queued jobs, report reads
        ▼
     Supabase
        ▲
        │ service-role queue worker
        │
Local Node worker + Chromium + Lighthouse
```

### Analysis flow

1. The frontend signs in anonymously through Supabase.
2. The user submits a public URL.
3. The frontend inserts a queued analysis row owned by the current user.
4. The local worker claims the queued row with the `claim_analysis()` RPC.
5. The worker validates the URL and blocks private/internal destinations.
6. Chromium runs Lighthouse locally.
7. The worker parses the Lighthouse result and builds diagnoses, recommendations, simulations, and summaries.
8. The report is stored in Supabase with `status = done`.
9. The frontend receives the updated report through Supabase polling/realtime behavior.

Simulation jobs use the same queue pattern. The worker loads the stored report's server-generated scenario plan, blocks the selected request patterns, runs Lighthouse again, and stores measured before/after metrics.

## Requirements

- Node.js 22 or newer
- npm
- Chrome or Chromium available to `chrome-launcher`
- A Supabase project

Lighthouse `13.5.0` is pinned because Lighthouse 13 requires Node.js 22 or newer and the worker should use a known, compatible configuration.

## Supabase setup

1. Create a Supabase project.
2. Enable anonymous sign-ins:
   **Authentication → Providers → Anonymous → Enable**.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
4. Copy the project URL, anon key, and service-role key from:
   **Project Settings → API**.

The schema creates the analysis and simulation tables, row-level security policies, indexes, and queue-claim RPC functions.

### Key handling

- The Supabase anon key belongs in the frontend and is safe to expose to the browser.
- The Supabase service-role key belongs only in the local worker.
- Never put the service-role key in `web/.env`.
- Never commit either `.env` file.

## Installation

From the repository root:

```powershell
npm run install:all
```

This installs dependencies independently in `web/` and `worker/`.

If dependencies need to be restored in one package:

```powershell
npm install --prefix web
npm install --prefix worker
```

## Environment configuration

### Frontend

Create `web/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Only variables prefixed with `VITE_` are included in the browser bundle.

### Worker

Create `worker/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
RUNS=1
POLL_MS=2000
SIM_FRESH_BASELINE=1
```

The same values are shown in [`worker/.env.example`](worker/.env.example).

#### Worker settings

| Variable | Purpose | Default |
|---|---|---|
| `SUPABASE_URL` | Supabase project URL used by the worker | required |
| `SUPABASE_SERVICE_KEY` | Service-role key used to claim jobs and write reports | required |
| `RUNS` | Number of Lighthouse runs per analysis; the median is reported when greater than one | `1` |
| `POLL_MS` | Delay between empty queue polls | `2000` |
| `SIM_FRESH_BASELINE` | Re-measure the baseline immediately before a simulation unless set to `0` | enabled |
| `DEBUG_DUMP` | Write raw Lighthouse JSON to `worker/debug/` when set to `1` | disabled |
| `ANTHROPIC_API_KEY` | Optional key for fact-constrained wording of summaries | unset |
| `LLM_MODEL` | Optional Anthropic model override | repository default |

The core analysis does not require an AI key. The rules engine, metrics, diagnoses, recommendations, action plan, and simulations are generated locally from Lighthouse data.

## Run the application locally

Open two terminals from the repository root.

### Terminal 1: worker

```powershell
npm run dev:worker
```

Expected startup output:

```text
Worker started
```

Keep this terminal running. It polls Supabase and processes analysis and simulation jobs.

### Terminal 2: frontend

```powershell
npm run dev:web
```

Open the Vite development URL shown in the terminal, submit a public website URL, and wait for the worker to process the job.

The worker must be running before a submitted job can move from `queued` to `done`.

## Run a direct Lighthouse analysis

The worker also exposes a CLI that bypasses Supabase. This is useful for checking local Chromium and report generation:

```powershell
cd worker
npm run analyze -- https://ecolink-inky.vercel.app
```

The command writes:

- `worker/debug/last-lhr.json`
- `worker/debug/last-report.json`

The debug directory is local-only and should not be committed.

## Engineering summary and recommendations

The report's engineering summary is based on the actual result. It includes:

- Every detected recommendation, not only the top few
- Evidence describing what Lighthouse measured
- Concrete implementation actions
- Impact and effort classification
- Potential savings only when supported by measured Lighthouse data
- Reversible validation experiments from the generated simulation plan
- Separate labels for Lighthouse estimates that still require re-measurement

Recommendation ranking is explainable. The worker records the formula used to order actions:

```text
Priority = (estimated time saving in ms + 500 × impact weight) / effort factor
```

Byte savings are converted to an approximate time contribution using the repository's documented throughput factor. These values rank work; they are not promises about production results.

Simulations do not modify the target website. They temporarily block selected requests in the local Lighthouse run and compare the measured result with a baseline.

## Useful commands

From the repository root:

```powershell
npm run install:all
npm run dev:worker
npm run dev:web
npm run typecheck --prefix worker
npm run build --prefix web
npm run sync-types
```

The worker package also supports:

```powershell
npm run start --prefix worker
npm run analyze --prefix worker -- https://example.com
```

## Validation checklist

Before using the application:

1. Confirm `web/.env` contains the Supabase URL and anon key.
2. Confirm `worker/.env` contains the Supabase URL and service-role key.
3. Confirm anonymous authentication is enabled in Supabase.
4. Confirm `supabase/schema.sql` has been applied.
5. Start the worker and verify `Worker started`.
6. Start the frontend and submit a public HTTPS URL.
7. Watch the worker for `Analyzing ...` and `Done: ...`.
8. Open the completed report in the frontend.
9. Run a simulation from the report if a scenario is available.

## Troubleshooting

### The job remains queued

Make sure the worker is running, the worker `.env` points to the same Supabase project as the frontend, and the `claim_analysis()` RPC exists from the schema.

### The worker reports missing Supabase variables

Check that the file is exactly:

```text
worker/.env
```

Run the worker from the repository or package directory after creating the file.

### Chrome reports an interstitial

This is a local Chromium loading failure, not a placeholder result. Check that:

- Chrome or Chromium is installed and launchable;
- the target URL is public and responds over HTTPS;
- the machine has network access;
- the URL does not redirect to a blocked/private destination;
- no local firewall, antivirus, VPN, or proxy is intercepting Chromium;
- the direct CLI command succeeds before testing through Supabase.

### A report contains estimated values

Estimates are sourced from Lighthouse opportunities and are explicitly labeled. They are not treated as measured before/after results. Apply the change and run the analysis again to verify the actual result.

### Shared report types changed

The canonical report types are in `shared/report.ts`. Synchronize generated copies with:

```powershell
npm run sync-types
```
