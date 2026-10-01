import { levelText } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

export default function Recommendations({ report }: { report: Report }) {
  if (report.recommendations.length === 0) return null;
  return (
    <Section
      title="Recommendations"
      intro="What to change for each issue found. Savings are estimates taken from the measurements, not promises."
    >
      <div className="divide-y divide-line border-y border-line">
        {report.recommendations.map((r) => (
          <article key={r.id} className="py-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h3 className="font-display text-xl font-bold">{r.title}</h3>
              <span className="text-sm text-muted">
                Impact <span className="font-semibold text-ink">{levelText(r.impact)}</span>
              </span>
              <span className="text-sm text-muted">
                Effort <span className="font-semibold text-ink">{levelText(r.effort)}</span>
              </span>
            </div>
            <dl className="mt-3 grid max-w-[72ch] gap-3">
              <div>
                <dt className="text-sm text-muted">What was found</dt>
                <dd>{r.detected}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">What to do</dt>
                <dd>{r.action}</dd>
              </div>
              {r.potential && (
                <div>
                  <dt className="text-sm text-muted">Estimated potential</dt>
                  <dd className="font-medium">{r.potential}</dd>
                </div>
              )}
            </dl>
          </article>
        ))}
      </div>
    </Section>
  );
}
