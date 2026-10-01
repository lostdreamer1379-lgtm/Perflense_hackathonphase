import { cn, ratingBg, ratingFromScore } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

export default function Overview({ report }: { report: Report }) {
  return (
    <Section
      title="Performance overview"
      intro="Only dimensions that could be measured are shown. Scores marked custom use our own formula, listed below."
    >
      <div className="max-w-2xl">
        {report.overview.map((o) => (
          <div
            key={o.key}
            className="grid grid-cols-[8.5rem_1fr_2.5rem] items-center gap-4 py-2 sm:grid-cols-[12rem_1fr_2.5rem]"
          >
            <span>
              {o.label}
              {o.custom && <span className="ml-2 text-xs text-muted">custom</span>}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-line">
              <div
                className={cn('h-full rounded-full', ratingBg(ratingFromScore(o.value)))}
                style={{ width: `${o.value}%` }}
              />
            </div>
            <span className="tnum text-right font-semibold">{o.value}</span>
          </div>
        ))}
      </div>
      <details className="mt-5 max-w-2xl text-sm text-muted">
        <summary className="cursor-pointer text-ink">How each score is calculated</summary>
        <dl className="mt-3 space-y-3">
          {report.overview.map((o) => (
            <div key={o.key}>
              <dt className="font-medium text-ink">{o.label}</dt>
              <dd>{o.formula}</dd>
            </div>
          ))}
        </dl>
      </details>
    </Section>
  );
}
