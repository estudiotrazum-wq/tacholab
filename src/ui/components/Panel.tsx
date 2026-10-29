import type { ReactNode } from 'react';

export function Panel({ title, children, className = '', aside }: { title: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={`glass rounded-2xl p-4 sm:p-5 ${className}`} aria-label={title}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
