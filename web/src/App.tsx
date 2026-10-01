import { useEffect, useState } from 'react';
import Home from './pages/Home';
import ReportPage from './pages/ReportPage';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem('perflens-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('perflens-theme', theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((current) => (current === 'light' ? 'dark' : 'light')) };
}

export default function App() {
  const hash = useHash();
  const { theme, toggle } = useTheme();
  const match = hash.match(/^#\/report\/([0-9a-f-]{36})$/i);

  return (
    <div className="mx-auto max-w-[1040px] px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between gap-4 py-6">
        <a href="#/" className="font-display text-xl font-bold tracking-tight">
          Perflens
        </a>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted sm:inline">Website performance report</span>
          <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
          >
            <span aria-hidden>{theme === 'light' ? '☾' : '☀'}</span>
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>
      {match ? <ReportPage key={match[1]} id={match[1]} /> : <Home />}
    </div>
  );
}
