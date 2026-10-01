import { cn, ratingColor, ratingText } from '../../lib/format';
import type { Report } from '../../types/report';
import ScoreRing from '../ScoreRing';
import Section from '../Section';

export default function Health({ report }: { report: Report }) {
  return (
    <Section title="Overall website health" intro="The four Lighthouse categories and how the page rates on each measured dimension.">
      <div className="flex flex-wrap gap-x-10 gap-y-6">
        {report.health.categories.map((c) => (
          <ScoreRing key={c.label} value={c.value} label={c.label} />
        ))}
      </div>
      <dl className="mt-8 max-w-xl divide-y divide-line border-y border-line">
        {report.health.statuses.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-4 py-2.5">
            <dt>{s.label}</dt>
            <dd className={cn('font-semibold', ratingColor(s.rating))}>{ratingText(s.rating)}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
