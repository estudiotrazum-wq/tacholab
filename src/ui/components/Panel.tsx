import type { ReactNode } from 'react';

export function Panel({ title, children, className = '', aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-ink-700 bg-ink-900/80 p-4 ${className}`} aria-label={title}>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
