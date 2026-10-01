import { useState, type FormEvent } from 'react';

interface Props {
  onSubmit: (url: string) => Promise<void>;
}

export default function AnalyzeForm({ onSubmit }: Props) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} className="max-w-xl">
      <label htmlFor="url" className="sr-only">
        Website address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-4 py-3 text-lg outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-md bg-ink px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Starting…' : 'Analyze website'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-bad">
          {error}
        </p>
      )}
    </form>
  );
}
