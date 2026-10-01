import { fmtBytes, fmtMs, shortUrl } from '../../lib/format';
import type { Report } from '../../types/report';
import Section from '../Section';

const th = 'py-2 font-normal';

export default function Blame({ report }: { report: Report }) {
  const { scripts, images, thirdParties, lcpElement } = report.blame;
  return (
    <Section
      title="What is costing the most"
      intro="The specific files and companies behind the totals above."
    >
      {lcpElement && (
        <div className="mb-10 max-w-3xl">
          <h3 className="font-display text-lg font-bold">The largest element on screen</h3>
          <p className="mt-1 text-muted">
            This is the element the Largest Contentful Paint time is measuring
            {lcpElement.label ? `: ${lcpElement.label}` : ''}.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted">
            Captured HTML
          </p>
          <pre
            aria-label="Captured HTML for the largest element on screen"
            className="mt-1 overflow-x-auto rounded-md border border-line bg-ink p-4 text-sm text-white"
          >
            <code>{lcpElement.snippet || lcpElement.selector}</code>
          </pre>
        </div>
      )}

      {scripts.length > 0 ? (
        <div className="mb-10">
          <h3 className="font-display text-lg font-bold">Heaviest scripts</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="text-muted">
                  <th className={th}>Script</th>
                  <th className={`${th} text-right`}>Size</th>
                  <th className={`${th} text-right`}>CPU time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-y border-line">
                {scripts.map((s) => (
                  <tr key={s.url}>
                    <td className="py-2 pr-4">
                      <span title={s.url}>{shortUrl(s.url)}</span>
                      {s.thirdParty && <span className="ml-2 text-xs text-muted">third-party</span>}
                    </td>
                    <td className="tnum py-2 text-right">{fmtBytes(s.transferSize)}</td>
                    <td className="tnum py-2 text-right">{s.cpuMs ? fmtMs(s.cpuMs) : 'under 25 ms'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mb-10 rounded-md border border-line bg-surface p-4 text-sm text-muted">
          No script costs were recorded for this report.
        </p>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        {images.length > 0 ? (
          <div>
            <h3 className="font-display text-lg font-bold">Heaviest images</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[22rem] text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className={th}>Image</th>
                    <th className={`${th} text-right`}>Size</th>
                    <th className={`${th} text-right`}>Could save</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-y border-line">
                  {images.map((im) => (
                    <tr key={im.url}>
                      <td className="py-2 pr-4" title={im.url}>
                        {shortUrl(im.url, 36)}
                      </td>
                      <td className="tnum py-2 text-right">{fmtBytes(im.transferSize)}</td>
                      <td className="tnum py-2 text-right">
                        {im.potentialSavings > 0 ? fmtBytes(im.potentialSavings) : 'none found'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-display text-lg font-bold">Heaviest images</h3>
            <p className="mt-2 rounded-md border border-line bg-surface p-4 text-sm text-muted">
              No image costs were recorded for this report.
            </p>
          </div>
        )}

        {thirdParties.length > 0 ? (
          <div>
            <h3 className="font-display text-lg font-bold">Third parties</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[22rem] text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th className={th}>Company or domain</th>
                    <th className={`${th} text-right`}>Requests</th>
                    <th className={`${th} text-right`}>Size</th>
                    <th className={`${th} text-right`}>Blocking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-y border-line">
                  {thirdParties.map((t) => (
                    <tr key={t.name}>
                      <td className="py-2 pr-4" title={t.hosts.join(', ')}>
                        {t.name}
                      </td>
                      <td className="tnum py-2 text-right">{t.requests}</td>
                      <td className="tnum py-2 text-right">{fmtBytes(t.transferSize)}</td>
                      <td className="tnum py-2 text-right">{t.blockingMs ? fmtMs(t.blockingMs) : 'none'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-display text-lg font-bold">Third parties</h3>
            <p className="mt-2 rounded-md border border-line bg-surface p-4 text-sm text-muted">
              No third-party costs were recorded for this report.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}
