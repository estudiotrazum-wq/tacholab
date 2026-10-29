import type { AssistHint } from '@/academy/assist';

export function AssistBanner({ hint }: { hint: AssistHint }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-cyan-800/60 bg-cyan-950/40 px-4 py-3 text-sm text-cyan-100" role="note" aria-live="polite" data-testid="assist-hint">
      <span className="mt-0.5 rounded bg-cyan-400/20 px-1.5 text-[10px] font-semibold tracking-wider text-cyan-200">GUÍA</span>
      <p>{hint.text}</p>
    </div>
  );
}
