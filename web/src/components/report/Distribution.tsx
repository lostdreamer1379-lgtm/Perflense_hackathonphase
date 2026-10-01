import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { TYPE_COLORS, fmtBytes } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

export default function Distribution({ report }: { report: Report }) {
  const { bytes, requests } = report.distribution;
  const totalReq = requests.firstParty + requests.thirdParty || 1;
  const thirdPct = Math.round((requests.thirdParty / totalReq) * 100);

  return (
    <Section title="Resource distribution" intro="Where the weight and the requests come from.">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div className="h-64" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={bytes} dataKey="bytes" nameKey="label" innerRadius={62} outerRadius={104} paddingAngle={1} stroke="none" isAnimationActive={false}>
                {bytes.map((b) => (
                  <Cell key={b.type} fill={TYPE_COLORS[b.type] ?? '#A9B6C6'} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtBytes(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <table className="w-full text-left">
          <caption className="sr-only">Page weight by resource type</caption>
          <thead>
            <tr className="text-sm text-muted">
              <th className="py-2 font-normal">Type</th>
              <th className="py-2 text-right font-normal">Size</th>
              <th className="py-2 text-right font-normal">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line border-y border-line">
            {bytes.map((b) => (
              <tr key={b.type}>
                <td className="py-2">
                  <span className="mr-2 inline-block size-3 rounded-sm align-middle" style={{ background: TYPE_COLORS[b.type] }} />
                  {b.label}
                </td>
                <td className="tnum py-2 text-right">{fmtBytes(b.bytes)}</td>
                <td className="tnum py-2 text-right">{b.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 max-w-2xl">
        <h3 className="font-display text-lg font-bold">Requests</h3>
        <div className="mt-3 flex h-6 overflow-hidden rounded-md bg-line" role="img" aria-label={`${requests.firstParty} first-party and ${requests.thirdParty} third-party requests`}>
          <div className="bg-accent" style={{ width: `${100 - thirdPct}%` }} />
          <div className="bg-warn" style={{ width: `${thirdPct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span>
            <span className="mr-2 inline-block size-3 rounded-sm bg-accent align-middle" />
            First-party <span className="tnum font-semibold">{requests.firstParty}</span>
          </span>
          <span>
            <span className="mr-2 inline-block size-3 rounded-sm bg-warn align-middle" />
            Third-party <span className="tnum font-semibold">{requests.thirdParty}</span>
          </span>
        </div>
      </div>
    </Section>
  );
}
