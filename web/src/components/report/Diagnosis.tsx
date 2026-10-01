import { severityColor, severityText } from '../../lib/format';
import type { Diagnosis as D, Report, Severity } from '../../types/report';
import Section from '../Section';

const BORDER: Record<Severity, string> = {
  high: 'border-bad',
  medium: 'border-warn',
  low: 'border-accent',
  healthy: 'border-good',
};

function Item({ d }: { d: D }) {
  return (
    <li className={`border-l-4 py-1 pl-4 ${BORDER[d.severity]}`}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h3 className="font-display text-lg font-bold">{d.title}</h3>
        <span className={`text-sm font-semibold ${severityColor(d.severity)}`}>{severityText(d.severity)}</span>
      </div>
      <p className="mt-1 max-w-[68ch]">{d.text}</p>
      <p className="mt-1 text-sm text-muted">
        Measured: <span className="tnum font-medium text-ink">{d.value}</span>. Rule: {d.threshold}.
      </p>
    </li>
  );
}

export default function Diagnosis({ report }: { report: Report }) {
  const issues = report.diagnosis.filter((d) => d.severity !== 'healthy');
  const healthy = report.diagnosis.filter((d) => d.severity === 'healthy');
  return (
    <Section
      title="Diagnosis"
      intro="Every finding comes from a measured value checked against a fixed rule, shown next to each one. The wording is plain language, but the severity is never a guess."
    >
      {issues.length === 0 ? (
        <p className="text-good">No issues crossed a threshold in this test.</p>
      ) : (
        <ul className="space-y-6">
          {issues.map((d) => (
            <Item key={d.id} d={d} />
          ))}
        </ul>
      )}
      {healthy.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer font-medium">Checks that passed ({healthy.length})</summary>
          <ul className="mt-4 space-y-5">
            {healthy.map((d) => (
              <Item key={d.id} d={d} />
            ))}
          </ul>
        </details>
      )}
    </Section>
  );
}
