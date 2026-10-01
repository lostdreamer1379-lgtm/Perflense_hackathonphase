import { fmtBytes } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-muted">{k}</dt>
          <dd className="tnum font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function TechnicalProfile({ report }: { report: Report }) {
  const { bytes, requests, dom, counts } = report.profile;
  return (
    <Section title="Technical profile" intro="How complex the page is and what it is made of.">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-display text-lg font-bold">Transfer size</h3>
          <Rows
            rows={[
              ['HTML', fmtBytes(bytes.html)],
              ['CSS', fmtBytes(bytes.css)],
              ['JavaScript', fmtBytes(bytes.js)],
              ['Images', fmtBytes(bytes.images)],
              ['Fonts', fmtBytes(bytes.fonts)],
              ['Media and other', fmtBytes(bytes.media + bytes.other)],
              ['Total page size', fmtBytes(bytes.total)],
              ['Of which third-party', fmtBytes(bytes.thirdParty)],
            ]}
          />
        </div>
        <div>
          <h3 className="mb-2 font-display text-lg font-bold">Counts</h3>
          <Rows
            rows={[
              ['Total requests', String(requests.total)],
              ['Third-party requests', String(requests.thirdParty)],
              ['DOM elements', dom.toLocaleString('en-US')],
              ['Images', String(counts.images)],
              ['JavaScript files', String(counts.jsFiles)],
              ['CSS files', String(counts.cssFiles)],
              ['Fonts', String(counts.fonts)],
              ['Embedded pages (iframes)', String(counts.iframes)],
            ]}
          />
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">
        "Third-party" means a different registrable domain than the page itself, so a separate CDN domain
        you own is counted as third-party.
      </p>
    </Section>
  );
}
