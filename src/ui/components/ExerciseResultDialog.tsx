import { exerciseDef } from '@/academy/catalog';
import { useAcademyStore } from '@/academy/store';
import { BADGES, earnedBadges } from '@/achievements/badges';
import { RULES } from '@/regulations/rules';
import { useUiStore } from '../uiStore';

/** Resultado del ejercicio: puntuación, condiciones, errores con su norma y explicación final. */
export function ExerciseResultDialog() {
  const { session, progress, close, start } = useAcademyStore();
  const go = useUiStore((s) => s.go);
  const r = session?.result;
  const def = session && exerciseDef(session.exerciseId);
  if (!r || !def) return null;
  const badges = earnedBadges(progress);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="res-title">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0b1220] p-6" data-testid="exercise-result">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Ejercicio {def.number} · resultado</div>
        <h2 id="res-title" className="mt-1 text-lg font-semibold text-white">{def.title}</h2>
        <div className="mt-3 flex items-center gap-4">
          <div className={`font-mono text-4xl ${r.passed ? 'text-emerald-300' : 'text-rose-300'}`} data-testid="exercise-score">{r.score}</div>
          <div>
            <div className="text-xl text-amber-300" aria-label={`${r.stars} de 3 estrellas`}>{'★'.repeat(r.stars)}<span className="text-slate-600">{'★'.repeat(3 - r.stars)}</span></div>
            <div className={`text-sm ${r.passed ? 'text-emerald-300' : 'text-rose-300'}`}>{r.passed ? 'Superado' : 'No superado'}</div>
          </div>
        </div>
        <ul className="mt-4 space-y-1 text-sm">
          {r.criteria.map((c) => <li key={c.text} className={c.ok ? 'text-emerald-200' : 'text-rose-200'}>{c.ok ? '✓' : '✗'} {c.text}</li>)}
        </ul>
        {r.errors.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {r.errors.map((e) => (
              <li key={e.text} className="text-amber-200">
                −{e.penalty} · {e.text}
                {e.ruleId && <span className="block text-xs text-slate-400">{RULES.find((x) => x.id === e.ruleId)?.reference}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-300">{def.explanation}</p>
        {badges.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">Insignias: {badges.map((b) => b.title).join(' · ')} ({badges.length}/{BADGES.length})</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => { close(); go('academy'); }} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900" data-testid="result-back">Volver a la academia</button>
          <button type="button" onClick={() => { start(def); go('device'); }} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-200">Repetir</button>
        </div>
      </div>
    </div>
  );
}
