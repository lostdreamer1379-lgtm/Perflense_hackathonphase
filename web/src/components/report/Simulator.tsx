import { motion } from 'framer-motion';
import { useSimulations } from '../../hooks/useSimulations';
import { cn, fmtBytes, fmtMs } from '../../lib/format';
import type { Report, SimulationPlanItem, SimulationResult, SimulationRow } from '../../types/report';
import Section from '../Section';

interface Row {
  label: string;
  before: number;
  after: number;
  fmt: (n: number) => string;
  higherBetter?: boolean;
}

function ResultTable({ r }: { r: SimulationResult }) {
  const rows: Row[] = [
    { label: 'Performance score', before: r.before.performance, after: r.after.performance, fmt: String, higherBetter: true },
    { label: 'Largest Contentful Paint', before: r.before.lcp, after: r.after.lcp, fmt: fmtMs },
    { label: 'First Contentful Paint', before: r.before.fcp, after: r.after.fcp, fmt: fmtMs },
    { label: 'Total Blocking Time', before: r.before.tbt, after: r.after.tbt, fmt: fmtMs },
    { label: 'Layout shift', before: r.before.cls, after: r.after.cls, fmt: String },
    { label: 'Page size', before: r.before.pageBytes, after: r.after.pageBytes, fmt: fmtBytes },
    { label: 'Requests', before: r.before.requests, after: r.after.requests, fmt: String },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="mt-4">
      <p className="mb-2 text-sm font-semibold text-good">Measured by re-testing the page</p>
      <table className="w-full max-w-xl text-left text-sm">
        <thead>
          <tr className="text-muted">
            <th className="py-1.5 font-normal">Metric</th>
            <th className="py-1.5 text-right font-normal">Before</th>
            <th className="py-1.5 text-right font-normal">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line border-y border-line">
          {rows.map((row) => {
            const better = row.higherBetter ? row.after > row.before : row.after < row.before;
            const worse = row.higherBetter ? row.after < row.before : row.after > row.before;
            return (
              <tr key={row.label}>
                <td className="py-1.5">{row.label}</td>
                <td className="tnum py-1.5 text-right text-muted">{row.fmt(row.before)}</td>
                <td className={cn('tnum py-1.5 text-right font-semibold', better && 'text-good', worse && 'text-bad')}>
                  {row.fmt(row.after)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 max-w-[68ch] text-sm text-muted">{r.caveat}</p>
    </motion.div>
  );
}

function Scenario({
  item,
  sim,
  onRun,
}: {
  item: SimulationPlanItem;
  sim: SimulationRow | undefined;
  onRun: () => void;
}) {
  const active = sim?.status === 'queued' || sim?.status === 'running';
  return (
    <article className="py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[60ch]">
          <h3 className="font-display text-xl font-bold">{item.label}</h3>
          <p className="mt-1 text-muted">{item.description}</p>
        </div>
        <button
          onClick={onRun}
          disabled={active}
          className="rounded-md bg-ink px-5 py-2.5 font-semibold text-white transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60"
        >
          {active ? 'Measuring…' : sim?.status === 'done' ? 'Measure again' : sim?.status === 'error' ? 'Try again' : 'Measure it'}
        </button>
      </div>
      {active && (
        <p className="mt-3 text-sm text-muted" aria-live="polite">
          The page is being loaded twice, with and without these requests. This takes about a minute.
        </p>
      )}
      {sim?.status === 'error' && <p className="mt-3 text-bad">{sim.error ?? 'The measurement failed.'}</p>}
      {sim?.status === 'done' && sim.result && <ResultTable r={sim.result} />}
    </article>
  );
}

export default function Simulator({ analysisId, report }: { analysisId: string; report: Report }) {
  const { sims, run, error } = useSimulations(analysisId);
  const latest = (id: string) => [...sims].reverse().find((s) => s.scenario === id);

  if (report.simulationPlan.length === 0 && report.estimates.length === 0) return null;

  return (
    <Section
      title="What if you removed it?"
      intro="Measured results come from loading the page again with the requests blocked. Estimated results use Lighthouse's own savings figures and are not re-tested. Neither is a guarantee of what a real change will do."
    >
      {report.simulationPlan.length > 0 && (
        <div className="divide-y divide-line border-y border-line">
          {report.simulationPlan.map((item) => (
            <Scenario key={item.id} item={item} sim={latest(item.id)} onRun={() => run(item.id)} />
          ))}
        </div>
      )}
      {error && <p className="mt-3 text-bad">{error}</p>}

      {report.estimates.length > 0 && (
        <div className="mt-10">
          <h3 className="font-display text-lg font-bold">Estimated savings</h3>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {report.estimates.map((e) => (
              <li key={e.id} className="py-4">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-medium">{e.label}</span>
                  <span className="tnum">
                    {fmtBytes(e.beforeBytes)} to <span className="font-semibold text-good">{fmtBytes(e.afterBytes)}</span>
                  </span>
                  <span className="text-sm text-muted">Estimated, not measured</span>
                </p>
                <p className="mt-1 max-w-[68ch] text-sm text-muted">{e.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
