import { fmtBytes, levelText } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

export default function EngineeringSummary({ report }: { report: Report }) {
  const m = report.meta;
  return (
    <Section title="Engineering summary">
      <p className="max-w-[68ch] text-lg leading-relaxed">{report.summary.engineering}</p>
      {report.summary.source === 'llm' && (
        <p className="mt-2 text-sm text-muted">
          Written by an AI model from the measured facts in this report. The numbers come from the test, not from the model.
        </p>
      )}

      <h3 className="mt-10 font-display text-lg font-bold">How this was measured</h3>
      <dl className="mt-2 max-w-2xl divide-y divide-line border-y border-line text-sm">
        {[
          ['Tool', 'Lighthouse in a headless Chrome browser'],
          ['Lighthouse version', m.lighthouseVersion || 'unknown'],
          ['Device and network', m.throttling],
          [
            'Runs',
            m.runs > 1
              ? `${m.runs} runs, median reported (scores ${m.runScores.join(', ')})`
              : '1 run. Single runs can vary by a few points.',
          ],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-6">
            <dt className="text-muted">{k}</dt>
            <dd className="sm:text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 max-w-[68ch] text-sm text-muted">
        These are lab results from one test environment. Confirm any change by running the analysis again after you make it.
      </p>

      {report.recommendations.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-lg font-bold">Recommended engineering actions</h3>
          <p className="mt-2 max-w-[68ch] text-sm text-muted">
            These actions are generated from issues detected in this run and ordered by measured opportunity, impact, and effort.
          </p>
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {report.recommendations.map((recommendation, index) => (
              <li key={recommendation.id} className="py-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="tnum font-display text-lg font-bold text-accent">{index + 1}.</span>
                  <h4 className="font-semibold">{recommendation.title}</h4>
                  <span className="text-sm text-muted">
                    {levelText(recommendation.impact)} impact · {levelText(recommendation.effort).toLowerCase()} effort
                  </span>
                </div>
                <dl className="mt-2 grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted">Evidence</dt>
                    <dd>{recommendation.detected}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Action</dt>
                    <dd>{recommendation.action}</dd>
                  </div>
                  {recommendation.potential && (
                    <div>
                      <dt className="text-muted">Potential shown by this run</dt>
                      <dd className="font-medium">{recommendation.potential}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ol>
        </>
      )}

      {report.simulationPlan.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-lg font-bold">Safe validation experiments</h3>
          <p className="mt-2 max-w-[68ch] text-sm text-muted">
            These are reversible what-if tests. They block requests temporarily and re-run Lighthouse; they do not change the website.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {report.simulationPlan.map((scenario) => (
              <li key={scenario.id} className="border border-line p-4">
                <h4 className="font-semibold">{scenario.label}</h4>
                <p className="mt-1 text-sm text-muted">{scenario.description}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {report.estimates.length > 0 && (
        <>
          <h3 className="mt-10 font-display text-lg font-bold">Measured opportunities to verify</h3>
          <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
            {report.estimates.map((estimate) => (
              <li key={estimate.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className="font-medium">{estimate.label}</span>
                <span className="text-muted">
                  {fmtBytes(estimate.beforeBytes)} → {fmtBytes(estimate.afterBytes)} if the estimated savings are achieved
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">These values come from Lighthouse opportunity estimates and must be re-measured after implementation.</p>
        </>
      )}
    </Section>
  );
}
