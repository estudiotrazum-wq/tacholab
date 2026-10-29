import { useEffect, useState } from 'react';
import { useSimStore } from '@/simulator/store';
import { TUTORIAL_STEPS } from '@/tutorial/steps';
import { useTutorialStore } from '@/tutorial/store';
import { useUiStore } from '../uiStore';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Primer elemento visible con ese `data-tour`. */
function findTarget(id: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * Tutorial de inicio: oscurece la pantalla salvo la pieza del paso actual y
 * muestra una tarjeta con la instrucción. El oscurecido no bloquea los clics:
 * el alumno maneja el simulador de verdad y el paso avanza solo al hacerlo.
 */
export function TutorialCoach() {
  const { active, index, next, back, exit } = useTutorialStore();
  const sim = useSimStore((s) => s.sim);
  const { view, go, update } = useUiStore();
  const mobile = !useMediaQuery('(min-width: 768px)');
  const step = TUTORIAL_STEPS[index];
  const [rect, setRect] = useState<Rect | null>(null);
  const onPanel = view === 'device';

  // Lleva la pieza a la vista al cambiar de paso.
  useEffect(() => {
    if (!active || !step?.target || !onPanel) return;
    const t = window.setTimeout(() => findTarget(step.target!)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60);
    return () => window.clearTimeout(t);
  }, [active, step?.target, onPanel]);

  // Sigue la posición de la pieza (scroll, cambios de tamaño, animaciones).
  useEffect(() => {
    if (!active || !step?.target || !onPanel) {
      setRect(null);
      return;
    }
    let raf = 0;
    const loop = () => {
      const el = findTarget(step.target!);
      const r = el?.getBoundingClientRect();
      setRect((prev) => {
        if (!r) return null;
        if (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height) return prev;
        return { top: r.top, left: r.left, width: r.width, height: r.height };
      });
      raf = window.requestAnimationFrame(loop);
    };
    loop();
    return () => window.cancelAnimationFrame(raf);
  }, [active, step?.target, onPanel]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.shiftKey) exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, exit]);

  if (!active || !step) return null;

  const last = index === TUTORIAL_STEPS.length - 1;
  const finish = (to?: 'academy') => {
    update({ tutorialDone: true });
    exit();
    if (to) go(to);
  };
  const quit = () => {
    update({ tutorialDone: true });
    exit();
  };

  // La tarjeta se coloca en la mitad de pantalla donde no está la pieza.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const targetLow = rect ? rect.top + rect.height / 2 > vh / 2 : false;
  const centered = !step.target || !onPanel;
  const pad = 8;
  const cardPos = centered
    ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
    : mobile
      ? targetLow ? 'inset-x-3 top-14' : 'inset-x-3 bottom-[72px]'
      : targetLow ? 'right-6 top-6' : 'right-6 bottom-6';

  return (
    <>
      {/* Oscurecido con hueco sobre la pieza; no captura los clics */}
      {rect && onPanel ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[45] rounded-xl ring-2 ring-cyan-300 transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(2,6,23,0.6), 0 0 24px 4px rgba(34,211,238,0.45)',
          }}
          data-testid="tutorial-spotlight"
        />
      ) : (
        centered && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45] bg-slate-950/60" />
      )}

      <div
        role="dialog"
        aria-modal="false"
        aria-labelledby="tutorial-title"
        data-testid="tutorial"
        className={`fixed z-[46] w-auto max-w-md rounded-2xl border border-cyan-300/30 bg-[#0b1220]/95 p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)] backdrop-blur md:w-[24rem] ${cardPos}`}
      >
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
          Tutorial · paso {index + 1} de {TUTORIAL_STEPS.length}
          <button type="button" onClick={quit} className="ml-auto rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal text-slate-400 hover:bg-white/10 hover:text-white" data-testid="tutorial-exit">
            Salir ✕
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-500" style={{ width: `${((index + 1) / TUTORIAL_STEPS.length) * 100}%` }} />
        </div>

        {!onPanel ? (
          <>
            <h2 id="tutorial-title" className="mt-3 text-lg font-semibold text-white">El tutorial sigue en el Panel</h2>
            <p className="mt-1 text-sm text-slate-300">Vuelve al simulador para continuar donde lo dejaste.</p>
            <button type="button" onClick={() => go('device')} className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-900">Volver al Panel</button>
          </>
        ) : (
          <>
            <h2 id="tutorial-title" className="mt-3 text-lg font-semibold text-white">{step.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-200" data-testid="tutorial-text">{step.text}</p>
            {step.hint && <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">💡 {step.hint}</p>}

            <div className="mt-4 flex items-center gap-2">
              {index > 0 && !last && (
                <button type="button" onClick={() => back(sim)} className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10">← Atrás</button>
              )}
              {last ? (
                <>
                  <button type="button" onClick={() => finish()} className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10" data-testid="tutorial-finish">Terminar</button>
                  <button type="button" onClick={() => finish('academy')} className="ml-auto rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">Ir a la Academia →</button>
                </>
              ) : step.done ? (
                <>
                  <span className="ml-auto flex items-center gap-2 text-xs text-cyan-200" data-testid="tutorial-waiting">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" aria-hidden="true" />
                    Hazlo en el simulador
                  </span>
                  <button type="button" onClick={() => next(sim)} className="rounded-xl px-2 py-2 text-xs text-slate-500 hover:text-slate-200" title="Pasar al siguiente paso sin hacerlo">Saltar</button>
                </>
              ) : (
                <button type="button" autoFocus onClick={() => next(sim)} className="ml-auto rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900" data-testid="tutorial-next">
                  {index === 0 ? 'Empezar' : 'Siguiente →'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
