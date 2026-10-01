import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { hostname } from '../lib/format';
import type { AnalysisRow } from '../types/report';

const STAGES = [
  { key: 'launching', label: 'Starting a browser' },
  { key: 'measuring', label: 'Loading the page on a simulated phone and slow network' },
  { key: 'analyzing', label: 'Reading the measurements' },
  { key: 'summarizing', label: 'Writing the summary' },
];

export default function ProgressView({ row }: { row: AnalysisRow }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const queued = row.status === 'queued';
  const active = queued ? -1 : Math.max(0, STAGES.findIndex((s) => s.key === row.stage));
  const pct = queued ? 4 : ((active + 0.5) / STAGES.length) * 100;

  return (
    <div className="max-w-xl py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Analyzing {hostname(row.url)}
      </h1>
      <p className="mt-2 text-muted">
        {queued ? 'Waiting for a free worker.' : 'This usually takes under a minute.'} {seconds}s
      </p>

      <div className="mt-8 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <ol className="mt-6 space-y-3" aria-live="polite">
        {STAGES.map((s, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'pending';
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span
                className={
                  'inline-block size-2.5 rounded-full ' +
                  (state === 'done' ? 'bg-good' : state === 'active' ? 'bg-accent' : 'bg-line')
                }
              />
              <span className={state === 'pending' ? 'text-muted' : 'font-medium'}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
