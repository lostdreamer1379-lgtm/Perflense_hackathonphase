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
          ['Tool', m.engine === 'psi' ? 'Google PageSpeed Insights (Lighthouse)' : 'Lighthouse in a headless Chrome browser'],
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
    </Section>
  );
}
