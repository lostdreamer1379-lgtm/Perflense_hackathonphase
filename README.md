# Perflens

Perflens is a website-performance analysis application. A visitor submits a public website URL and receives a report containing:

- total page weight and request counts;
- resource distribution by type;
- largest scripts, images, and third parties;
- Largest Contentful Paint (LCP) element information;
- measured vitals and health scores;
- rule-based diagnosis and recommendations;
- a prioritized engineering action plan; and
- what-if simulations that re-run the page with selected requests blocked.

The frontend is a Vite/React application. The analysis worker is a long-running Node.js service that launches Chromium and Lighthouse. Supabase is the shared database, authentication provider, realtime transport, and job queue.

## Architecture

### System overview

```text
                                      ┌──────────────────────────┐
                                      │       Visitor browser    │
                                      │  React + Vite frontend   │
                                      └────────────┬─────────────┘
                                                   │
                         1. Anonymous auth/session │
                         2. Insert analysis job   │
                         3. Read own report      │
                         4. Realtime/poll updates│
                                                   ▼
                                      ┌──────────────────────────┐
                                      │          Supabase         │
                                      │                          │
                                      │  Auth: anonymous users   │
                                      │  Postgres: analyses      │
                                      │            simulations   │
                                      │  RLS: owner isolation   │
                                      │  Realtime: row updates  │
                                      └────────────┬─────────────┘
                                                   │
                                  service-role job claims
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Worker background service                        │
│                                                                         │
│  Poll queue → validate URL → launch Chromium → run Lighthouse           │
│       │              │                 │                                 │
│       │              │                 └── outbound proxy/firewall       │
│       │              └── private-address and metadata blocking           │
│       └── parse LHR → apply rules → build report → write Supabase       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Analysis lifecycle

```text
Browser
  │
  │ 1. Sign in anonymously and obtain a Supabase user id
  │ 2. Insert { owner_id, url, status: "queued" }
  ▼
Supabase: analyses
  │
  │ 3. Worker calls claim_analysis()
  │    PostgreSQL locks one queued row and changes it to "running"
  ▼
Worker
  │
  │ 4. Validate URL and reject private/internal destinations
  │ 5. Launch Chromium
  │ 6. Run Lighthouse one or more times
  │ 7. Select the median performance run
  │ 8. Parse the Lighthouse result
  │ 9. Apply scoring, diagnosis, recommendation, and ranking rules
  │ 10. Optionally generate summary wording
  ▼
Supabase: analyses
  │
  │ 11. Write report and status = "done"
  │ 12. Browser receives a realtime update or polling result
  ▼
Browser
  │
  └── Render the report and enable authorized simulations
```

### Simulation lifecycle

```text
Browser
  │
  │ Insert { owner_id, analysis_id, scenario, status: "queued" }
  ▼
Supabase: simulations
  │
  │ Worker calls claim_simulation()
  ▼
Worker
  │
  │ Load the stored report using the service role
  │ Find the server-generated scenario plan
  │ Validate the original URL again
  │ Run a fresh baseline (optional)
  │ Run Lighthouse with selected URL patterns blocked
  │ Write measured before/after metrics
  ▼
Browser
  │
  └── Display measured impact and the caveat that blocking may break the page
```

## Repository structure

```text
.
├── shared/
│   └── report.ts              Source-of-truth report types
├── supabase/
│   └── schema.sql             Tables, RLS policies, indexes, RPC job claims
├── web/
│   ├── src/
│   │   ├── components/        Forms, progress UI, report sections
│   │   ├── hooks/             Supabase analysis and simulation hooks
│   │   ├── pages/             Home and report pages
│   │   └── lib/supabase.ts    Browser Supabase client and anonymous auth
│   ├── package.json
│   └── .env                   Local frontend variables; never commit
├── worker/
│   ├── src/
│   │   ├── index.ts           Long-running job loop
│   │   ├── lighthouse.ts      Chromium/Lighthouse execution
│   │   ├── safeUrl.ts         URL validation and private-range blocking
│   │   ├── parser/            Lighthouse result parsing
│   │   ├── rules/             Scores, diagnosis, recommendations
│   │   └── simulator/         What-if scenario execution
│   ├── Dockerfile             Node 22 + Chromium production image
│   ├── package.json
│   └── .env                   Worker secrets; never commit
├── scripts/
│   └── sync-types.mjs         Copies shared report types into web and worker
└── package.json               Root development scripts
```

## How data and permissions work

### Anonymous authentication

The frontend uses Supabase anonymous sign-in. This creates a real Supabase user/session without asking the visitor to provide an email or password.

The session gives each browser an identity:

```text
anonymous browser session → auth.uid() → owner_id on analyses/simulations
```

This is not the same as making the database public. Row Level Security only permits a session to read rows whose `owner_id` equals its own `auth.uid()`.

Enable it in Supabase:

```text
Authentication → Providers → Anonymous → Enable
```

### Row Level Security

The browser uses only the Supabase URL and anon key. It cannot use the service-role key.

The database policies enforce:

- authenticated sessions can create only their own queued analyses;
- authenticated sessions can read only their own analyses;
- authenticated sessions can create simulations only for their own analyses;
- authenticated sessions can read only their own simulations;
- the worker uses the service-role key and bypasses RLS for queue processing.

Run `supabase/schema.sql` in the Supabase SQL Editor after enabling anonymous sign-ins.

Existing rows created before `owner_id` was added have no owner and are intentionally not visible to browser clients. This is safer than assigning old reports to the wrong user.

## Local development

### Prerequisites

- Node.js 22 or newer for the worker;
- npm;
- Chrome or Chromium for local worker execution;
- a Supabase project;
- optional: a Google PageSpeed Insights API key;
- optional: an outbound HTTP proxy for production-like SSRF protection.

The worker uses Lighthouse 13, which requires Node 22 or newer.

### Install dependencies

From the repository root:

```bash
npm run install:all
```

This installs dependencies independently in `web/` and `worker/`.

### Configure Supabase

1. Create a Supabase project.
2. Enable anonymous sign-ins.
3. Run all of `supabase/schema.sql` in the SQL Editor.
4. Copy the project URL and keys from `Project Settings → API`.

Never expose the service-role key to browser code.

### Configure the frontend

Create `web/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Only variables prefixed with `VITE_` are available to the Vite browser bundle. Therefore, never place `SUPABASE_SERVICE_KEY`, `PSI_API_KEY`, or `ANTHROPIC_API_KEY` in `web/.env`.

### Configure the worker

Create `worker/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

ENGINE=local
RUNS=1
POLL_MS=2000
SIM_FRESH_BASELINE=1

PSI_FALLBACK=0
PSI_API_KEY=

ANTHROPIC_API_KEY=
LLM_MODEL=claude-haiku-4-5-20251001

# Local development without a proxy:
REQUIRE_OUTBOUND_PROXY=0
OUTBOUND_PROXY=
```

`worker/.env` is private and must never be committed.

### Test the worker without Supabase

The CLI runs a direct analysis and writes debug output:

```bash
cd worker
npm run analyze -- https://example.com
```

Useful files are written under `worker/debug/` when debug dumping is enabled. Inspect the raw Lighthouse result if a report section is unexpectedly empty.

### Run the full application

Use two terminals from the repository root:

```bash
npm run dev:worker
```

```bash
npm run dev:web
```

The browser normally runs at the Vite development URL shown in the terminal. Submit a URL, then watch the worker terminal for job progress.

### Synchronize shared types

When `shared/report.ts` changes:

```bash
npm run sync-types
```

This copies the shared report definition into the web and worker source trees.

## Production deployment

The production system has two independently deployed services:

```text
Vercel                         Railway / Render / Fly.io
────────                       ─────────────────────────
Static React frontend          Long-running worker container
Vite build                     Node 22 + Chromium + Lighthouse
No secrets except anon key     Service-role key and private secrets
                              Polls Supabase continuously
```

Do not deploy the worker as a Vercel serverless function. It launches Chromium, can run for several minutes, and continuously polls Supabase. It needs a persistent background process.

### Step 1: Push to GitHub

Commit source files, package manifests, and lockfiles. Do not commit:

```text
web/.env
worker/.env
worker/node_modules/
worker/debug/
```

The worker Docker build uses `npm ci`, so `worker/package-lock.json` must be committed.

Recommended `.gitignore` entries:

```gitignore
web/.env
worker/.env
web/node_modules/
worker/node_modules/
worker/debug/
```

### Step 2: Deploy the frontend to Vercel

1. Create a Vercel project from the GitHub repository.
2. Set the project root directory to `web`.
3. Use these build settings:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Root directory | `web` |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `dist` |

4. Add these Vercel environment variables for the required environments:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Deploy or redeploy after adding variables.

The frontend uses hash navigation:

```text
/#/report/<analysis-id>
```

This means report links work as static files without server-side route rewrites.

### Step 3: Deploy the worker as a background service

Railway, Render, and Fly.io can run the included Dockerfile. Configure the service to use the `worker` directory as its root.

#### Railway

1. Create a Railway project.
2. Choose `Deploy from GitHub repo`.
3. Select the repository.
4. Set the service root directory to `worker`.
5. Confirm Railway detects `worker/Dockerfile`.
6. Create a long-running service, not a serverless endpoint.
7. Add the worker environment variables.

#### Render

1. Create a `Background Worker`.
2. Connect the GitHub repository.
3. Set the root directory to `worker`.
4. Select Docker deployment.
5. Add the worker environment variables.

Do not create a normal web service unless the provider requires it for billing or health checks. The worker does not expose an HTTP API; it polls Supabase.

### Worker production environment

Use the following as a production baseline:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

ENGINE=local
RUNS=1
POLL_MS=2000
SIM_FRESH_BASELINE=1

PSI_FALLBACK=1
PSI_API_KEY=your-pagespeed-insights-key

ANTHROPIC_API_KEY=
LLM_MODEL=claude-haiku-4-5-20251001

REQUIRE_OUTBOUND_PROXY=1
OUTBOUND_PROXY=http://your-egress-proxy:3128
```

The service-role key, PSI key, Anthropic key, and proxy URL are worker secrets. They must never be added to Vercel or frontend code.

### Why the outbound proxy is required

The worker visits user-supplied websites in Chromium. A malicious URL could attempt to redirect Chromium to:

- `localhost`;
- loopback addresses;
- private network ranges;
- link-local addresses;
- cloud instance metadata endpoints; or
- an internal administrative service.

The application performs URL validation and gives Chromium private-address blocking patterns. The production proxy/firewall is defense in depth at the network boundary. It must deny loopback, private, link-local, reserved, and cloud-metadata destinations even if a redirect or DNS rebinding occurs.

Set:

```env
REQUIRE_OUTBOUND_PROXY=1
```

The worker will refuse to start if `OUTBOUND_PROXY` is missing or invalid. For local development only, use:

```env
REQUIRE_OUTBOUND_PROXY=0
OUTBOUND_PROXY=
```

Do not use that relaxed configuration for a public production worker.

### Worker container details

The Dockerfile:

1. starts from Node 22;
2. installs Chromium and required fonts;
3. installs exact lockfile dependencies with `npm ci`;
4. copies the worker source;
5. runs as an unprivileged `worker` user;
6. requires an outbound proxy by default; and
7. starts the polling process with `npm start`.

The worker needs enough memory for Chromium. At least 1 GB is recommended; 2 GB is safer for larger pages and concurrent infrastructure. Run multiple worker instances if more throughput is required.

### Step 4: Verify the deployment

After deploying the worker, its logs should contain:

```text
Worker started
```

Submit a test URL from the Vercel frontend. The worker should then log activity similar to:

```text
Analyzing https://example.com
Done: https://example.com -> 85/100
```

The browser should progress from queued to running to done and display the report.

If a simulation is started, the worker should log:

```text
Simulating no-third-party
Simulation done: no-third-party on https://example.com
```

## Environment variable reference

| Variable | Used by | Required | Purpose |
|---|---|---:|---|
| `VITE_SUPABASE_URL` | Web | Yes | Public Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Web | Yes | Browser-safe Supabase anon key |
| `SUPABASE_URL` | Worker | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Worker | Yes | Privileged worker database access |
| `ENGINE` | Worker | No | `local` for Chromium or `psi` for PageSpeed Insights |
| `RUNS` | Worker | No | Number of local Lighthouse runs; median is selected |
| `POLL_MS` | Worker | No | Queue polling interval |
| `SIM_FRESH_BASELINE` | Worker | No | Re-measure simulation baseline when set to `1` |
| `PSI_FALLBACK` | Worker | No | Use PSI when local Lighthouse fails |
| `PSI_API_KEY` | Worker | No | Google PageSpeed Insights key |
| `ANTHROPIC_API_KEY` | Worker | No | Optional AI-written summaries |
| `LLM_MODEL` | Worker | No | Optional Anthropic model name |
| `OUTBOUND_PROXY` | Worker | Production | Egress proxy for Chromium |
| `REQUIRE_OUTBOUND_PROXY` | Worker | Production | Refuse startup without proxy when `1` |

## Security model

### Browser secrets

The frontend contains only public Supabase configuration:

- Supabase URL;
- Supabase anon key; and
- anonymous-auth session state.

The anon key is designed for browser use and is protected by RLS. It is not a replacement for database policies.

### Worker secrets

Only the worker receives:

- Supabase service-role key;
- PageSpeed Insights API key;
- Anthropic API key; and
- outbound proxy credentials.

These values must be configured through the hosting provider’s secret environment-variable interface.

### URL safety

`worker/src/safeUrl.ts`:

- accepts only HTTP and HTTPS;
- resolves the initial hostname;
- rejects private and internal addresses; and
- rejects common local, link-local, metadata, and private URL patterns in Lighthouse.

For production, the egress proxy or firewall remains required because application-level validation cannot guarantee safety against every redirect and DNS-rebinding scenario.

### Resource abuse

The current design has no user-facing rate limiter. Before exposing the service broadly, add limits for:

- analysis jobs per anonymous session;
- simulations per analysis;
- maximum analysis duration;
- worker concurrency;
- maximum URL length; and
- database retention.

## What the report means

### Measured values

The worker gets raw data from Lighthouse, then parses:

- transfer sizes;
- request counts;
- resource types;
- Web Vitals;
- CPU and blocking data;
- screenshots and LCP metadata;
- third-party domains; and
- Lighthouse category scores.

### Rule-based findings

Diagnosis and recommendations are generated from fixed rules in `worker/src/rules/`. The measured value, threshold, severity, and recommendation are kept separate so the output remains explainable.

### AI summaries

AI is optional and only rewrites summaries from already measured facts. If no `ANTHROPIC_API_KEY` is configured, the worker uses template summaries. AI does not decide the measured scores or security policy.

### Simulations

Simulation scenarios are generated from the stored report. A simulation blocks selected request patterns and re-runs Lighthouse. The result is an upper-bound experiment, not a guaranteed safe optimization: blocking a request may break the page.

## Validation commands

From the repository root:

```bash
npm run sync-types
npm run install:all
npm --prefix web run build
npm --prefix worker run typecheck
npm --prefix worker audit --omit=dev --audit-level=high
```

The production web build emits `web/dist/`. The worker type-check verifies the Node/Lighthouse code but does not replace a real Chromium smoke test.

## Troubleshooting

### Jobs remain queued

Check:

1. the worker service is running and logs `Worker started`;
2. `SUPABASE_URL` is correct;
3. `SUPABASE_SERVICE_KEY` is the service-role key;
4. the worker is connected to the same Supabase project as Vercel;
5. `claim_analysis()` and `claim_simulation()` exist in Supabase; and
6. the worker can reach Supabase through its network.

### Worker exits immediately

Check:

- Node is 22 or newer;
- Chromium is installed in the container;
- all required environment variables exist;
- `OUTBOUND_PROXY` is valid when `REQUIRE_OUTBOUND_PROXY=1`; and
- the service is configured as a long-running process.

### Worker rejects every URL

Check that:

- the submitted URL is public and reachable;
- it does not resolve to a private address;
- the outbound proxy allows the target’s public HTTP/HTTPS traffic; and
- the proxy is not blocking all DNS or HTTPS connections.

### Browser cannot create or read reports

Check:

1. anonymous sign-ins are enabled;
2. the updated SQL schema has been applied;
3. Vercel has `VITE_SUPABASE_URL`;
4. Vercel has `VITE_SUPABASE_ANON_KEY`;
5. the frontend was redeployed after adding environment variables; and
6. the browser session has not been blocked by an auth or ad-blocking extension.

### A report section is empty

Some Lighthouse audits are absent depending on the target page or Lighthouse version. Run the worker CLI with debug output and inspect the raw Lighthouse result under `worker/debug/`.

## Known limitations

- Lighthouse results vary between runs and devices.
- LCP and other audits can be missing for pages that fail to load fully.
- Third-party means a different registrable domain, so a separate CDN can be classified as third-party.
- Total Blocking Time is used as a lab proxy for interaction responsiveness; INP is not measured in this workflow.
- One worker processes one job at a time. Add worker replicas for throughput.
- Anonymous authentication provides per-browser ownership, not a permanent user account. Clearing browser storage creates a new anonymous identity.
- Existing database rows without `owner_id` are inaccessible to browser clients after the ownership migration.
- The Vite bundle currently produces a chunk-size warning. It is non-blocking, but code splitting can improve slow-mobile load time.

## Demo checklist

Before a presentation or launch:

1. Run `supabase/schema.sql`.
2. Enable anonymous authentication.
3. Deploy the worker and confirm `Worker started`.
4. Deploy Vercel with the two `VITE_` variables.
5. Submit `https://example.com`.
6. Confirm the report reaches `done`.
7. Run one simulation.
8. Test the same flow in a fresh browser.
9. Test at a narrow mobile viewport.
10. Confirm no service-role, PSI, Anthropic, or proxy secrets appear in frontend source or Vercel variables.

## Naming

`Perflens` is a placeholder name. To rename it, update:

- `web/index.html`;
- `web/src/App.tsx`; and
- any deployment metadata or domain branding.
