import type { Section } from './nav';

const PATHS: Record<Section['icon'] | 'settings' | 'star' | 'help', string> = {
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.5-11.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  drive: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3.5 10.5h6M14.5 10.5h6M12 14v7',
  weeks: 'M4 6h16v14H4Zm0 4h16M8 3v4M16 3v4M7.5 14h3M13.5 14h3M7.5 17h3',
  learn: 'M3 9 12 5l9 4-9 4-9-4Zm4 2v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4M21 9v5',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  star: 'm12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z',
};

export function NavIcon({ name, className = 'h-5 w-5' }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
