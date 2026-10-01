import { motion, useReducedMotion } from 'framer-motion';
import { ratingFromScore } from '../lib/format';

const STROKE = { good: '#1e8a5e', 'needs-improvement': '#a9701a', poor: '#c2374a' } as const;

interface Props {
  value: number;
  size?: number;
  label?: string;
}

export default function ScoreRing({ value, size = 88, label }: Props) {
  const reduce = useReducedMotion();
  const r = 40;
  const c = 2 * Math.PI * r;
  const color = STROKE[ratingFromScore(value)];
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label ?? 'Score'} ${value} out of 100`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-line)" strokeWidth="8" />
        <motion.circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - value / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="57" textAnchor="middle" className="tnum" style={{ font: '700 28px var(--font-display)', fill: 'var(--color-ink)' }}>
          {value}
        </text>
      </svg>
      {label && <span className="text-sm text-muted">{label}</span>}
    </div>
  );
}
