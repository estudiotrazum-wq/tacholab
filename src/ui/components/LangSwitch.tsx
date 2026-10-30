import { LANGS } from '@/i18n';
import { useUiStore } from '../uiStore';

/** Selector de idioma (ES · EN). */
export function LangSwitch({ compact = false }: { compact?: boolean }) {
  const lang = useUiStore((s) => s.lang);
  const update = useUiStore((s) => s.update);
  return (
    <div className={`flex rounded-full bg-white/5 p-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`} role="group" aria-label="Idioma / Language" data-testid="lang-switch">
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          lang={l.id}
          title={l.label}
          aria-pressed={lang === l.id}
          onClick={() => update({ lang: l.id })}
          data-testid={`lang-${l.id}`}
          className={`rounded-full px-2 py-1 font-semibold transition ${lang === l.id ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
