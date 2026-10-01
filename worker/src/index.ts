import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildReport } from './buildReport.js';
import { measure } from './lighthouse.js';
import type { Report, SimulationPlanItem } from './report.js';
import { runScenario } from './simulator/run.js';
import { assertSafeUrl } from './safeUrl.js';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in worker/.env');
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function setStage(id: string, stage: string) {
  await supabase.from('analyses').update({ stage }).eq('id', id);
}

async function processAnalysis(job: { id: string; url: string }) {
  try {
    const url = await assertSafeUrl(job.url);
    await setStage(job.id, 'measuring');
    const { lhr, runScores, engine } = await measure(url);

    if (process.env.DEBUG_DUMP === '1') {
      mkdirSync('debug', { recursive: true });
      writeFileSync(`debug/${job.id}.json`, JSON.stringify(lhr, null, 2));
    }

    await setStage(job.id, 'analyzing');
    const report = await buildReport(lhr, {
      runScores,
      engine,
      onStage: (s) => setStage(job.id, s),
    });

    await supabase
      .from('analyses')
      .update({ status: 'done', stage: 'done', report })
      .eq('id', job.id);
    console.log(`Done: ${url} -> ${report.scores.performance}/100`);
  } catch (e) {
    console.error('Analysis failed:', message(e));
    await supabase.from('analyses').update({ status: 'error', error: message(e) }).eq('id', job.id);
  }
}

async function processSimulation(sim: { id: string; analysis_id: string; scenario: string }) {
  try {
    const { data: analysis, error } = await supabase
      .from('analyses')
      .select('url, report')
      .eq('id', sim.analysis_id)
      .single();
    if (error || !analysis?.report) throw new Error('The analysis for this simulation was not found');

    const report = analysis.report as Report;
    // The browser only sends a scenario name. The patterns always come from the stored report.
    const plan = report.simulationPlan.find((p: SimulationPlanItem) => p.id === sim.scenario);
    if (!plan) throw new Error('Unknown scenario for this analysis');

    const url = await assertSafeUrl(analysis.url);
    const result = await runScenario(url, plan, report.baseline);
    await supabase.from('simulations').update({ status: 'done', result }).eq('id', sim.id);
    console.log(`Simulation done: ${plan.id} on ${url}`);
  } catch (e) {
    console.error('Simulation failed:', message(e));
    await supabase.from('simulations').update({ status: 'error', error: message(e) }).eq('id', sim.id);
  }
}

/** Jobs left "running" by a crashed worker go back in the queue. */
async function requeueStuck() {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await supabase.from('analyses').update({ status: 'queued', stage: null }).eq('status', 'running').lt('created_at', cutoff);
  await supabase.from('simulations').update({ status: 'queued' }).eq('status', 'running').lt('created_at', cutoff);
}

async function main() {
  console.log('Worker started');
  await requeueStuck();
  for (;;) {
    try {
      const a = await supabase.rpc('claim_analysis');
      if (a.error) throw new Error(a.error.message);
      if (a.data?.[0]) {
        console.log('Analyzing', a.data[0].url);
        await processAnalysis(a.data[0]);
        continue;
      }
      const s = await supabase.rpc('claim_simulation');
      if (s.error) throw new Error(s.error.message);
      if (s.data?.[0]) {
        console.log('Simulating', s.data[0].scenario);
        await processSimulation(s.data[0]);
        continue;
      }
    } catch (e) {
      console.error('Loop error:', message(e));
    }
    await sleep(Number(process.env.POLL_MS ?? 2000));
  }
}

main();
