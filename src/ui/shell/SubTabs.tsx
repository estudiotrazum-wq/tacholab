import { t } from '@/i18n';
import { useUiStore } from '../uiStore';
import { sectionOf } from './nav';

/** Pestañas de la sección actual (p. ej. Cabina / Tacógrafo). */
export function SubTabs() {
  const { view, go } = useUiStore();
  const section = sectionOf(view);
  if (!section || section.views.length < 2) return null;
  return (
    <div className="mx-auto flex max-w-7xl justify-center px-4 pt-4 print:hidden">
      <div className="glass inline-flex rounded-full p-1" role="tablist" aria-label={t(section.label)}>
        {section.views.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => go(v.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${view === v.id ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'}`}
          >
            {t(v.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
