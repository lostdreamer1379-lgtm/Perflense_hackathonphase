import { levelText } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

export default function ActionPlan({ report }: { report: Report }) {
  if (report.actionPlan.length === 0) return null;
  return (
    <Section title="Developer action plan" intro="In the order worth doing them: biggest estimated gain for the least effort first.">
      <ol className="max-w-2xl divide-y divide-line border-y border-line">
        {report.actionPlan.map((a) => (
          <li key={a.id} className="flex items-baseline gap-4 py-3">
            <span className="tnum w-6 font-display text-xl font-bold text-accent">{a.rank}</span>
            <span className="flex-1 font-medium">{a.title}</span>
            <span className="text-sm text-muted">
              Impact {levelText(a.impact)}, effort {levelText(a.effort).toLowerCase()}
            </span>
          </li>
        ))}
      </ol>
      <details className="mt-4 max-w-2xl text-sm text-muted">
        <summary className="cursor-pointer text-ink">How this order is decided</summary>
        <p className="mt-2">{report.rankingFormula}</p>
      </details>
    </Section>
  );
}
