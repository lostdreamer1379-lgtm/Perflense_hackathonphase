import type { Report } from '../report.js';
import { fmtBytes } from '../parser/helpers.js';

type Facts = Omit<Report, 'summary'>;

function templateSummaries(r: Facts): Report['summary'] {
  const host = new URL(r.meta.finalUrl).hostname;
  const issues = r.diagnosis.filter((d) => d.severity !== 'healthy');
  const top = issues.slice(0, 3).map((d) => d.title);
  const pr = r.profile;

  const executive =
    `${host} scores ${r.scores.performance}/100 on a simulated mobile connection (${r.status.label.toLowerCase()}). ` +
    (top.length
      ? `The biggest opportunities are: ${top.join(', ')}.`
      : 'No major bottlenecks were found in this test.');

  const fixes = r.recommendations.slice(0, 3).map((x) => x.title).join(', ');
  const engineering =
    `Measured on a simulated mobile connection (${r.meta.runs} run${r.meta.runs > 1 ? 's, median reported' : ''}). ` +
    `The page transfers ${fmtBytes(pr.bytes.total)} across ${pr.requests.total} requests, including ` +
    `${fmtBytes(pr.bytes.js)} of JavaScript and ${fmtBytes(pr.bytes.images)} of images. ` +
    (fixes ? `Suggested first actions: ${fixes}. ` : '') +
    'These are lab results from a single environment; confirm any fix by re-measuring.';

  return { executive, engineering, source: 'template' };
}

/**
 * The AI only phrases facts that were already measured and ranked by the rules engine.
 * If the API key is missing or anything fails, plain template text is used instead.
 */
export async function writeSummaries(r: Facts): Promise<Report['summary']> {
  const fallback = templateSummaries(r);
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;

  const facts = {
    site: new URL(r.meta.finalUrl).hostname,
    test: 'Lighthouse, simulated slow 4G mobile',
    scores: r.scores,
    status: r.status.label,
    vitals: r.vitals.map((v) => ({ metric: v.label, value: v.display, rating: v.rating })),
    weight: {
      total: fmtBytes(r.profile.bytes.total),
      javascript: fmtBytes(r.profile.bytes.js),
      images: fmtBytes(r.profile.bytes.images),
      requests: r.profile.requests.total,
      thirdPartyRequests: r.profile.requests.thirdParty,
      domElements: r.profile.dom,
    },
    issues: r.diagnosis
      .filter((d) => d.severity !== 'healthy')
      .slice(0, 6)
      .map((d) => ({ issue: d.title, severity: d.severity, evidence: d.value })),
    topFixes: r.recommendations.slice(0, 3).map((x) => ({ fix: x.title, potential: x.potential })),
    healthy: r.bottlenecks.healthy,
  };

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system:
          'You are a web performance engineer writing two short summaries of a measured test. ' +
          'Use ONLY the facts provided and never invent numbers. Do not claim a cause that the facts do not show. ' +
          'Return strict JSON with exactly two string fields and nothing else: ' +
          '"executive" (2 to 3 plain-language sentences for a website owner) and ' +
          '"engineering" (3 to 5 sentences for a developer, naming the measured numbers and the most valuable fixes).',
        messages: [{ role: 'user', content: JSON.stringify(facts) }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`LLM request failed (${res.status})`);
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((c) => c.type === 'text')?.text ?? '';
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    if (typeof parsed.executive !== 'string' || typeof parsed.engineering !== 'string') {
      throw new Error('LLM returned an unexpected shape');
    }
    return { executive: parsed.executive.trim(), engineering: parsed.engineering.trim(), source: 'llm' };
  } catch (e) {
    console.warn('Summary generation fell back to template text:', (e as Error).message);
    return fallback;
  }
}
