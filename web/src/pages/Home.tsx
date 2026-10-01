import AnalyzeForm from '../components/AnalyzeForm';
import { DEMO_REPORTS } from '../demo';
import { submitUrl } from '../hooks/useAnalysis';

export default function Home() {
  async function start(url: string) {
    const id = await submitUrl(url);
    window.location.hash = `#/report/${id}`;
  }

  return (
    <main className="pt-12 sm:pt-20">
      <h1 className="max-w-[16ch] font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
        What is your website made of?
      </h1>
      <p className="mt-6 max-w-[52ch] text-lg text-muted">
        Enter an address. You get the page weight broken down by type, the scripts, images and third
        parties costing the most, and a test of what happens when you remove them.
      </p>
      <div className="mt-10">
        <AnalyzeForm onSubmit={start} />
      </div>

      {DEMO_REPORTS.length > 0 && (
        <div className="mt-12">
          <p className="text-sm text-muted">Or open a ready-made report</p>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {DEMO_REPORTS.map((d) => (
              <li key={d.id}>
                <a className="text-accent underline underline-offset-4" href={`#/report/${d.id}`}>
                  {d.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
