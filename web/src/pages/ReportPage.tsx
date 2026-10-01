import ProgressView from '../components/ProgressView';
import Report from '../components/report/Report';
import { useAnalysis } from '../hooks/useAnalysis';

export default function ReportPage({ id }: { id: string }) {
  const { row, loading } = useAnalysis(id);

  if (loading && !row) return <p className="py-20 text-muted">Loading report…</p>;

  if (!row) {
    return (
      <div className="max-w-xl py-16">
        <h1 className="font-display text-3xl font-bold">Report not found</h1>
        <p className="mt-2 text-muted">This link may be wrong or the report was removed.</p>
        <a href="#/" className="mt-6 inline-block text-accent underline underline-offset-4">
          Analyze a website
        </a>
      </div>
    );
  }

  if (row.status === 'error') {
    return (
      <div className="max-w-xl py-16">
        <h1 className="font-display text-3xl font-bold">The analysis did not finish</h1>
        <p className="mt-3 rounded-md border border-bad/30 bg-bad/5 p-4 text-bad">{row.error}</p>
        <p className="mt-3 text-muted">
          Check the address is public and loads in a browser, then try again.
        </p>
        <a href="#/" className="mt-6 inline-block text-accent underline underline-offset-4">
          Try another address
        </a>
      </div>
    );
  }

  if (row.status !== 'done' || !row.report) return <ProgressView row={row} />;

  return <Report analysisId={row.id} report={row.report} />;
}
