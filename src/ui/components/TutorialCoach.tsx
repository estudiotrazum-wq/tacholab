import { t } from '@/i18n';
import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '@/simulator/store';
import { TUTORIAL_STEPS } from '@/tutorial/steps';
import { useTutorialStore } from '@/tutorial/store';
import { useUiStore } from '../uiStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { DriverNameField } from './DriverNameField';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GAP = 14;
const MARGIN = 12;
/** Alto aproximado de la tarjeta minimizada. */
const COMPACT_H = 64;

const toRect = (r: DOMRect): Rect => ({ top: r.top, left: r.left, width: r.width, height: r.height });
const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);
const intersects = (a: Rect, b: Rect) =>
  a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;

/**
 * Busca un hueco para la tarjeta que no tape la pieza señalada ni el tacógrafo:
 * debajo, encima, a la derecha o a la izquierda de la pieza y, si no, en las esquinas.
 */
export function placeCard(
  size: { w: number; h: number },
  target: Rect,
  avoid: Rect[],
  view: { w: number; h: number; top: number; bottom: number },
): { top: number; left: number } | null {
  const clampX = (x: number) => Math.min(Math.max(x, MARGIN), view.w - size.w - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(y, view.top + MARGIN), view.h - view.bottom - size.h - MARGIN);
  const candidates = [
    { top: target.top + target.height + GAP, left: clampX(target.left + target.width / 2 - size.w / 2) },
    { top: target.top - size.h - GAP, left: clampX(target.left + target.width / 2 - size.w / 2) },
    { top: clampY(target.top), left: target.left + target.width + GAP },
    { top: clampY(target.top), left: target.left - size.w - GAP },
    { top: view.h - view.bottom - size.h - MARGIN, left: view.w - size.w - MARGIN },
    { top: view.top + MARGIN, left: view.w - size.w - MARGIN },
    { top: view.h - view.bottom - size.h - MARGIN, left: MARGIN },
    { top: view.top + MARGIN, left: MARGIN },
  ];
  for (const c of candidates) {
    const box = { top: c.top, left: c.left, width: size.w, height: size.h };
    const inside = box.left >= MARGIN - 0.5 && box.top >= view.top + MARGIN - 0.5 && box.left + box.width <= view.w - MARGIN + 0.5 && box.top + box.height <= view.h - view.bottom - MARGIN + 0.5;
    if (inside && !avoid.some((a) => intersects(box, a))) return c;
  }
  return null;
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
  const [device, setDevice] = useState<Rect | null>(null);
  const [cardSize, setCardSize] = useState({ w: 384, h: 240 });
  const [userMin, setUserMin] = useState(false);
  /** El alumno pide ver el texto completo aunque no haya hueco libre. */
  const [forceFull, setForceFull] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
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
      const r = findTarget(step.target!)?.getBoundingClientRect();
      const d = findTarget('tachograph')?.getBoundingClientRect();
      const next = r ? toRect(r) : null;
      const nextDev = d ? toRect(d) : null;
      setRect((prev) => (sameRect(prev, next) ? prev : next));
      setDevice((prev) => (sameRect(prev, nextDev) ? prev : nextDev));
      // Tamaño de la tarjeta desplegada (para decidir si cabe sin tapar nada)
      const c = cardRef.current;
      if (c && c.dataset.compact !== 'true') {
        const w = c.offsetWidth;
        const h = c.offsetHeight;
        setCardSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
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

  useEffect(() => {
    setUserMin(false);
    setForceFull(false);
  }, [index]);

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

  // La tarjeta busca un hueco que no tape la pieza ni el tacógrafo; si no cabe, se minimiza.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const viewport = { w: vw, h: vh, top: mobile ? 48 : 0, bottom: mobile ? 64 : 0 };
  const pad = 8;
  const centered = !step.target || !onPanel || !rect;
  const padded = (r: Rect): Rect => ({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  const avoid = rect ? [padded(rect), ...(device ? [padded(device)] : [])] : [];
  const fullPos = centered ? null : placeCard(cardSize, rect!, avoid, viewport);
  const compactW = Math.min(cardSize.w, vw - 2 * MARGIN);
  const compactPos = centered || fullPos ? null : placeCard({ w: compactW, h: COMPACT_H }, rect!, avoid, viewport);
  const compact = !centered && (userMin || (!fullPos && !forceFull));
  const pos = compact ? (userMin && fullPos ? placeCard({ w: compactW, h: COMPACT_H }, rect!, avoid, viewport) : compactPos) : fullPos;
  // Último recurso: franja superior o inferior, la que quede más lejos de la pieza.
  const targetLow = rect ? rect.top + rect.height / 2 > vh / 2 : false;
  const style: React.CSSProperties = centered
    ? {}
    : pos
      ? { top: pos.top, left: pos.left, width: compact ? compactW : undefined }
      : targetLow
        ? { top: viewport.top + MARGIN, left: MARGIN, right: MARGIN }
        : { bottom: viewport.bottom + MARGIN, left: MARGIN, right: MARGIN };

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
            boxShadow: '0 0 0 9999px rgba(2,6,23,0.35), 0 0 24px 4px rgba(34,211,238,0.45)',
          }}
          data-testid="tutorial-spotlight"
        />
      ) : (
        centered && <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[45] bg-slate-950/60" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tutorial-title"
        data-testid="tutorial"
        data-compact={compact ? 'true' : 'false'}
        style={style}
        className={`fixed z-[46] rounded-2xl border border-cyan-300/30 bg-[#0b1220]/95 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.95)] backdrop-blur transition-[top,left] duration-300 ${
          centered ? 'left-1/2 top-1/2 w-[min(24rem,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 p-5' : compact ? 'px-3 py-2' : 'w-[min(24rem,calc(100vw-24px))] p-5'
        }`}
      >
        {compact ? (
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400 text-[11px] font-bold text-slate-950">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <h2 id="tutorial-title" className="truncate text-sm font-semibold text-white">{t(step.title)}</h2>
              <p className="truncate text-[11px] text-slate-400">{step.done ? t('Hazlo en el simulador') : t('Paso informativo')}</p>
            </div>
            {!step.done && (
              <button type="button" onClick={() => next(sim)} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900" data-testid="tutorial-next">{t('Siguiente')}</button>
            )}
            <button type="button" onClick={() => { setUserMin(false); setForceFull(true); }} title={t('Ver las instrucciones completas')} className="shrink-0 rounded-lg bg-white/10 px-2 py-1.5 text-xs text-slate-200" data-testid="tutorial-expand" aria-label={t('Ver las instrucciones')}>▴</button>
            <button type="button" onClick={quit} className="shrink-0 rounded-lg px-1.5 py-1.5 text-xs text-slate-400 hover:text-white" aria-label={t('Salir del tutorial')} data-testid="tutorial-exit">✕</button>
          </div>
        ) : (
        <>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
          {t('Tutorial · paso {n} de {total}', { n: index + 1, total: TUTORIAL_STEPS.length })}
          {!centered && (
            <button type="button" onClick={() => { setUserMin(true); setForceFull(false); }} className="ml-auto rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal text-slate-400 hover:bg-white/10 hover:text-white" data-testid="tutorial-minimize" aria-label={t('Minimizar el tutorial')}>
              {t('▾ Minimizar')}
            </button>
          )}
          <button type="button" onClick={quit} className={`${centered ? 'ml-auto' : ''} rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal text-slate-400 hover:bg-white/10 hover:text-white`} data-testid="tutorial-exit">
            {t('Salir ✕')}
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-500" style={{ width: `${((index + 1) / TUTORIAL_STEPS.length) * 100}%` }} />
        </div>

        {!onPanel ? (
          <>
            <h2 id="tutorial-title" className="mt-3 text-lg font-semibold text-white">{t('El tutorial sigue en el Panel')}</h2>
            <p className="mt-1 text-sm text-slate-300">{t('Vuelve al simulador para continuar donde lo dejaste.')}</p>
            <button type="button" onClick={() => go('device')} className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-900">{t('Volver al Panel')}</button>
          </>
        ) : (
          <>
            <h2 id="tutorial-title" className="mt-3 text-lg font-semibold text-white">{t(step.title)}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-200" data-testid="tutorial-text">{t(step.text)}</p>
            {step.hint && <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">💡 {t(step.hint)}</p>}
            {step.id === 'intro' && (
              <div className="mt-3 rounded-xl bg-white/5 p-3">
                <p className="mb-2 text-xs text-slate-300">{t('Antes de empezar, pon tu nombre en la tarjeta (opcional):')}</p>
                <DriverNameField compact />
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              {index > 0 && !last && (
                <button type="button" onClick={() => back(sim)} className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10">{t('← Atrás')}</button>
              )}
              {last ? (
                <>
                  <button type="button" onClick={() => finish()} className="rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10" data-testid="tutorial-finish">{t('Terminar')}</button>
                  <button type="button" onClick={() => finish('academy')} className="ml-auto rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">{t('Ir a la Academia →')}</button>
                </>
              ) : step.done ? (
                <>
                  <span className="ml-auto flex items-center gap-2 text-xs text-cyan-200" data-testid="tutorial-waiting">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" aria-hidden="true" />
                    {t('Hazlo en el simulador')}
                  </span>
                  <button type="button" onClick={() => next(sim)} className="rounded-xl px-2 py-2 text-xs text-slate-500 hover:text-slate-200" title={t('Pasar al siguiente paso sin hacerlo')}>{t('Saltar')}</button>
                </>
              ) : (
                <button type="button" autoFocus onClick={() => next(sim)} className="ml-auto rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900" data-testid="tutorial-next">
                  {index === 0 ? t('Empezar') : t('Siguiente →')}
                </button>
              )}
            </div>
          </>
        )}
        </>
        )}
      </div>
    </>
  );
}
