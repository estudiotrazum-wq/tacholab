import { t } from '@/i18n';
import type { AssistHint } from '@/academy/assist';

export function AssistBanner({ hint }: { hint: AssistHint }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50" role="note" aria-live="polite" data-testid="assist-hint">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 text-xs font-bold text-slate-950">?</span>
      <p>{t(hint.text)}</p>
    </div>
  );
}
