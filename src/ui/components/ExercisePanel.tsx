import { t } from '@/i18n';
import { exerciseDef } from '@/academy/catalog';
import { useAcademyStore } from '@/academy/store';
import { useUiStore } from '../uiStore';
import { confirmThen } from '../confirm';

/** Panel del ejercicio en curso: pasos, instrucciones opcionales, cuestionario y evaluación. */
export function ExercisePanel({ compact = false }: { compact?: boolean }) {
  const { session, setShowInstructions, toggleAnswer, finish, close } = useAcademyStore();
  const go = useUiStore((s) => s.go);
  if (!session || session.result) return null;
  const def = exerciseDef(session.exerciseId);
  if (!def) return null;
  const done = session.stepIndex >= def.steps.length;

  return (
    <section className="rounded-xl border border-violet-700/50 bg-violet-950/30 p-4 text-sm" aria-label={t('Ejercicio en curso')} data-testid="exercise-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">{t('Ejercicio {n}', { n: def.number })}</div>
          <h2 className="font-semibold text-white">{t(def.title)}</h2>
          {!compact && <p className="mt-0.5 text-xs text-slate-300">{t(def.objective)}</p>}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-300">
          <input type="checkbox" checked={session.showInstructions} onChange={(e) => setShowInstructions(e.target.checked)} className="accent-violet-400" />
          {t('Mostrar instrucciones')}
        </label>
      </div>

      {def.steps.length > 0 && (
        <ol className="mt-3 space-y-1" data-testid="exercise-steps">
          {def.steps.map((st, i) => {
            const state = i < session.stepIndex ? 'done' : i === session.stepIndex ? 'current' : 'todo';
            if (!session.showInstructions && state !== 'done') {
              return state === 'current' ? <li key={i} className="text-xs text-slate-400">{t('Paso {n} de {total} (instrucciones ocultas)', { n: i + 1, total: def.steps.length })}</li> : null;
            }
            return (
              <li key={i} className={`flex gap-2 text-xs ${state === 'done' ? 'text-emerald-300' : state === 'current' ? 'font-medium text-white' : 'text-slate-500'}`}>
                <span className="w-4 shrink-0">{state === 'done' ? '✓' : `${i + 1}.`}</span>
                <span>{t(st.text)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {def.quiz && (
        <fieldset className="mt-3">
          <legend className="text-xs text-slate-200">{t(def.quiz.question)}</legend>
          <div className="mt-1 space-y-1">
            {def.quiz.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-xs text-slate-300">
                <input type="checkbox" checked={session.answers.includes(o.id)} onChange={() => toggleAnswer(o.id)} className="accent-violet-400" data-testid={`quiz-${o.id}`} />
                {t(o.text)}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{t('Pista: consulta el Calendario y el Informe.')}</p>
        </fieldset>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="exercise-finish"
          onClick={() => {
            if (done || def.quiz) finish();
            else confirmThen(t('Aún no has completado todos los pasos. ¿Evaluar igualmente?'), finish, { confirmLabel: t('Evaluar') });
          }}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${done || def.quiz ? 'bg-violet-500 text-white hover:bg-violet-400' : 'border border-violet-600/60 text-violet-200'}`}
        >
          {done ? t('Evaluar ejercicio ✓') : t('Evaluar ahora')}
        </button>
        <button type="button" onClick={() => confirmThen(t('¿Abandonar el ejercicio? No se guardará el resultado.'), () => { close(); go('academy'); }, { confirmLabel: t('Abandonar'), danger: true })} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-slate-300">
          {t('Abandonar')}
        </button>
      </div>
    </section>
  );
}
