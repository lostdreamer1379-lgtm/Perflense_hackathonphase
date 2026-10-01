import type { Report } from '../../types/report';
import Section from '../Section';

const GROUPS = [
  { key: 'high', title: 'High impact', dot: 'bg-bad' },
  { key: 'medium', title: 'Medium impact', dot: 'bg-warn' },
  { key: 'low', title: 'Low impact', dot: 'bg-accent' },
  { key: 'healthy', title: 'Healthy', dot: 'bg-good' },
] as const;

export default function Bottlenecks({ report }: { report: Report }) {
  const groups = GROUPS.filter((g) => report.bottlenecks[g.key].length > 0);
  return (
    <Section title="Bottlenecks" intro="The same findings, grouped by how much they matter.">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <div key={g.key}>
            <h3 className="flex items-center gap-2 font-display text-lg font-bold">
              <span className={`inline-block size-3 rounded-full ${g.dot}`} />
              {g.title}
            </h3>
            <ul className="mt-2 space-y-1">
              {report.bottlenecks[g.key].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
