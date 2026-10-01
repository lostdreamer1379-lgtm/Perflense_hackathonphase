import { animate, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TYPE_COLORS, fmtBytes, hostname, ratingColor } from '../../lib/format';
import type { Report } from '../../types/report';
import ScoreRing from '../ScoreRing';

function WeightBar({ items }: { items: Report['distribution']['bytes'] }) {
  const reduce = useReducedMotion();
  return (
    <div>
      <div
        className="flex h-14 w-full overflow-hidden rounded-md bg-line"
        role="img"
        aria-label={`Page weight by type: ${items.map((i) => `${i.label} ${i.percent}%`).join(', ')}`}
      >
        {items.map((it, i) => (
          <motion.div
            key={it.type}
            title={`${it.label}: ${fmtBytes(it.bytes)}`}
            style={{ background: TYPE_COLORS[it.type] ?? '#A9B6C6', flexShrink: 0 }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${it.percent}%` }}
            transition={{ duration: 0.9, delay: i * 0.08, ease: 'easeOut' }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
        {items.map((it) => (
          <li key={it.type} className="flex items-center gap-2 text-sm">
            <span className="inline-block size-3 rounded-sm" style={{ background: TYPE_COLORS[it.type] }} />
            <span>{it.label}</span>
            <span className="tnum text-muted">
              {fmtBytes(it.bytes)} ({it.percent}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useCountUp(target: number) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) {
      setV(target);
      return;
    }
    const c = animate(0, target, { duration: 1, ease: 'easeOut', onUpdate: (n) => setV(Math.round(n)) });
    return () => c.stop();
  }, [target, reduce]);
  return v;
}

export default function Hero({ report }: { report: Report }) {
  const host = hostname(report.meta.finalUrl);
  const shown = useCountUp(report.scores.performance);
  const date = new Date(report.meta.analyzedAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="pt-6 sm:pt-10">
      <p className="text-muted">Tested {date} on a simulated phone</p>
      <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        {host} weighs {fmtBytes(report.profile.bytes.total)} on first load.
      </h1>

      <div className="mt-8">
        <WeightBar items={report.distribution.bytes} />
        <p className="mt-3 text-sm text-muted">
          Sizes are what travels over the network (compressed). {report.profile.requests.total} requests in total.
        </p>
      </div>

      <div className="mt-12 grid items-start gap-8 md:grid-cols-[auto_1fr_auto]">
        <div className="flex items-center gap-4 md:flex-col md:items-start">
          <ScoreRing value={shown} size={112} />
          <p className={`font-display text-xl font-bold ${ratingColor(report.status.rating)}`}>
            {report.status.label}
          </p>
        </div>
        <div className="max-w-[60ch]">
          <h2 className="font-display text-xl font-bold">Summary</h2>
          <p className="mt-2 text-lg leading-relaxed">{report.summary.executive}</p>
        </div>
        {report.meta.screenshot && (
          <img
            src={report.meta.screenshot}
            alt={`What ${host} looked like when the test finished`}
            className="hidden max-h-56 rounded-md border border-line md:block"
          />
        )}
      </div>
    </div>
  );
}
