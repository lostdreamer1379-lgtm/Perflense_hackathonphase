import { ratingColor, ratingText } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

export default function VitalsSection({ report }: { report: Report }) {
  return (
    <Section
      title="Core Web Vitals"
      intro="The timings visitors actually feel. Each one is explained with what may be behind it in this test."
    >
      <div className="divide-y divide-line border-y border-line">
        {report.vitals.map((v) => (
          <article key={v.key} className="grid gap-4 py-6 md:grid-cols-[15rem_1fr]">
            <div>
              <h3 className="font-medium">{v.label}</h3>
              <p className="tnum mt-1 font-display text-4xl font-bold">{v.display}</p>
              <p className={`mt-1 text-sm font-semibold ${ratingColor(v.rating)}`}>{ratingText(v.rating)}</p>
            </div>
            <div className="max-w-[68ch] space-y-3">
              <p className="font-medium">{v.explain.assessment}</p>
              <p className="text-muted">{v.explain.meaning}</p>
              <p className="text-muted">
                <span className="font-medium text-ink">Why it matters. </span>
                {v.explain.why}
              </p>
              <div>
                <p className="font-medium">What may be contributing</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
                  {v.explain.contributors.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
              {v.note && <p className="text-sm text-muted">{v.note}</p>}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
