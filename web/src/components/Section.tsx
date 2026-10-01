import type { ReactNode } from 'react';

interface Props {
  title: string;
  intro?: string;
  children: ReactNode;
}

export default function Section({ title, intro, children }: Props) {
  return (
    <section className="glass-panel mt-16 border-t border-line pt-8">
      <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
      {intro && <p className="mt-2 max-w-[64ch] text-muted">{intro}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
