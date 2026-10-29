import { EXERCISES } from '@/academy/exercises';
import { DEFAULT_ENTITLEMENTS, hasFeature } from '@/billing/plans';
import { Panel } from '../components/Panel';

export function AcademyScreen() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="rounded-xl border border-ink-700 bg-ink-900/70 p-4 text-sm text-slate-300">
        La Academia (ejercicios guiados con evaluación, puntuación e insignias) se implementará en la <strong>Fase 5</strong>.
        Mientras tanto, el <strong>modo asistido</strong> del simulador ofrece una guía paso a paso.
      </div>
      <Panel title="Programa previsto">
        <ol className="divide-y divide-ink-700/60 text-sm">
          {EXERCISES.map((ex) => {
            const allowed = hasFeature(DEFAULT_ENTITLEMENTS, ex.feature);
            return (
              <li key={ex.id} className="flex items-center justify-between py-2">
                <span className="text-slate-200"><span className="mr-2 font-mono text-slate-500">{String(ex.id).padStart(2, '0')}</span>{ex.title}</span>
                <span className="flex gap-2 text-[10px] uppercase tracking-wider">
                  <span className={`rounded px-1.5 py-0.5 ${allowed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-violet-500/15 text-violet-300'}`}>{allowed ? 'Gratis' : 'Premium'}</span>
                  <span className="rounded bg-slate-700/60 px-1.5 py-0.5 text-slate-300">Próximamente</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}
