import { t } from '@/i18n';
import { useEffect, useRef, useState } from 'react';
import { exerciseDef } from '@/academy/catalog';
import { useAcademyStore } from '@/academy/store';
import { useSimStore } from '@/simulator/store';
import { useTutorialStore } from '@/tutorial/store';
import { formatDateTime } from '@/time-engine/zoned';
import { confirmThen } from '../confirm';

/**
 * Reiniciar: «Repetir la jornada» vuelve a justo antes de meter la tarjeta (para corregir errores del
 * procedimiento) y «Empezar de cero» borra las dos semanas. En un ejercicio, ambos reinician el ejercicio.
 */
export function ResetMenu() {
  const [open, setOpen] = useState(false);
  const store = useSimStore();
  const session = useAcademyStore((s) => s.session);
  const ref = useRef<HTMLDivElement>(null);
  const tz = store.sim.scenario.timeZone;
  const shiftAt = open ? store.shiftStartAt() : null;
  const inExercise = session !== null && !session.result;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  /** Tras reiniciar, el tutorial (si está en curso) vuelve a empezar con el nuevo estado. */
  const after = () => {
    setOpen(false);
    const t = useTutorialStore.getState();
    if (t.active) t.begin(useSimStore.getState().sim);
  };
  const restartExercise = () => {
    const def = session ? exerciseDef(session.exerciseId) : undefined;
    if (def) useAcademyStore.getState().start(def);
    after();
  };

  const item = 'w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-testid="reset-menu"
        className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-slate-200 ${open ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" /></svg>
        {t('Reiniciar')}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-[min(92vw,20rem)] rounded-2xl border border-white/10 bg-[#0b1220] p-2 text-sm shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
          {inExercise ? (
            <button type="button" role="menuitem" className={item} data-testid="restart-exercise" onClick={() => confirmThen(t('¿Repetir el ejercicio desde el principio?'), restartExercise, { confirmLabel: t('Repetir') })}>
              <div className="font-semibold text-white">{t('↺ Repetir el ejercicio')}</div>
              <div className="text-xs text-slate-400">{t('Vuelve al inicio del ejercicio en curso.')}</div>
            </button>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                className={item}
                disabled={shiftAt === null}
                data-testid="restart-shift"
                onClick={() =>
                  confirmThen(t('¿Repetir la jornada? Se borra todo lo hecho desde que metiste la tarjeta y vuelves a ese momento.'), () => {
                    store.restartShift();
                    after();
                  }, { confirmLabel: t('Repetir la jornada') })
                }
              >
                <div className="font-semibold text-white">{t('↺ Repetir la jornada')}</div>
                <div className="text-xs text-slate-400">
                  {shiftAt !== null ? t('Vuelve a justo antes de meter la tarjeta ({time} UTC).', { time: formatDateTime(shiftAt, tz) }) : t('Disponible en cuanto metas la tarjeta.')}
                </div>
              </button>
              <button
                type="button"
                role="menuitem"
                className={item}
                data-testid="restart-all"
                onClick={() =>
                  confirmThen(t('¿Empezar de cero? Se borran las dos semanas y vuelves al lunes a las 06:00 UTC.'), () => {
                    store.reset();
                    after();
                  }, { confirmLabel: t('Empezar de cero'), danger: true })
                }
              >
                <div className="font-semibold text-rose-200">{t('⟲ Empezar de cero')}</div>
                <div className="text-xs text-slate-400">{t('Borra todo el escenario de dos semanas.')}</div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
