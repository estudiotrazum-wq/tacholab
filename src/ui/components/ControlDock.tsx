import { useEffect, useRef, useState } from 'react';
import { ACTIVITY_LABEL } from '@/shared/types';
import type { AssistTarget } from '@/academy/assist';
import { nextRelevantEvent } from '@/simulator/engine';
import { useSimStore } from '@/simulator/store';
import { openEvent } from '@/time-engine/timeline';
import { HOUR, MINUTE } from '@/time-engine/units';
import { formatDate, formatDateTime, formatTime, formatWeekday, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/time-engine/zoned';
import type { Speed } from '@/time-engine/clock';
import { ActivityIcon, ACTIVITY_COLOR } from './icons';
import { confirmThen } from '../confirm';

const SPEED_OPTIONS: Speed[] = [1, 5, 30, 60];

/**
 * Barra de control única, al estilo de un reproductor: reloj, reproducción,
 * velocidad, siguiente evento y marcha del vehículo. Lo avanzado va en «Más».
 */
export function ControlDock({ highlight, inline = false }: { highlight: AssistTarget; inline?: boolean }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const [tools, setTools] = useState(false);
  const tz = sim.scenario.timeZone;
  const speed = sim.clock.speed;
  const finished = sim.clock.now >= sim.clock.endsAt;
  const moving = sim.vehicle.moving;
  const recorded = openEvent(sim.timeline)?.activity ?? null;
  const [lastSpeed, setLastSpeed] = useState<Speed>(60);

  const setSpeed = (sp: Speed) => {
    if (sp) setLastSpeed(sp);
    dispatch({ type: 'SET_SPEED', speed: sp });
  };

  return (
    <div className={inline ? 'relative z-20 print:hidden' : 'pointer-events-none fixed inset-x-0 bottom-[60px] z-30 px-2 md:bottom-4 print:hidden'} data-testid="control-dock">
      <div className={`${inline ? 'glass' : 'glass-strong pointer-events-auto mx-auto max-w-4xl'} relative flex items-center gap-2 rounded-2xl px-2 py-2 sm:gap-3 sm:px-3 ${highlight === 'CLOCK' ? 'assist-target' : ''}`}>
        {/* Reloj */}
        <div className="min-w-0 px-1 sm:px-2">
          <div className="whitespace-nowrap font-mono text-2xl leading-tight text-white" data-testid="virtual-clock">
            {formatTime(sim.clock.now, tz)}<span className="ml-1 text-xs text-slate-400">UTC</span>
          </div>
          <div className="whitespace-nowrap text-[11px] text-slate-400">
            {formatWeekday(sim.clock.now, tz)} {formatDate(sim.clock.now, tz)} · local {formatTime(sim.clock.now, sim.scenario.localTimeZone)}
          </div>
        </div>

        {/* Reproducción */}
        <button
          type="button"
          disabled={finished}
          onClick={() => setSpeed(speed === 0 ? lastSpeed : 0)}
          aria-label={speed === 0 ? 'Reproducir' : 'Pausa'}
          data-testid="play-toggle"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-slate-900 shadow-lg transition hover:scale-105 disabled:opacity-40"
        >
          {speed === 0 ? (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7Z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          )}
        </button>
        <div className="hidden rounded-full bg-white/5 p-0.5 sm:flex" role="group" aria-label="Velocidad del reloj">
          {SPEED_OPTIONS.map((sp) => (
            <button
              key={sp}
              type="button"
              disabled={finished}
              aria-pressed={speed === sp}
              onClick={() => setSpeed(sp)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${speed === sp ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              ×{sp}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={finished}
          onClick={() => dispatch({ type: 'JUMP_NEXT_EVENT' })}
          title={`Saltar a: ${nextRelevantEvent(sim).label}`}
          aria-label="Siguiente evento"
          className="hidden h-9 items-center gap-1 rounded-full px-3 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40 sm:flex"
        >
          Siguiente
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M5 6v12l9-6Zm9 0v12l2 0V6Z" /></svg>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {recorded && (
            <span className="hidden items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-200 lg:flex" title="Actividad registrada">
              <span style={{ color: ACTIVITY_COLOR[recorded] }}><ActivityIcon activity={recorded} className="h-4 w-4" /></span>
              {ACTIVITY_LABEL[recorded]}
            </span>
          )}
          {!inline && <button
            type="button"
            data-testid="vehicle-toggle"
            aria-pressed={moving}
            onClick={() => dispatch({ type: 'SET_MOVING', moving: !moving })}
            className={`h-11 rounded-xl px-3 text-sm font-semibold transition sm:px-4 ${highlight === 'VEHICLE' ? 'assist-target' : ''} ${
              moving ? 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/60' : 'bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/60'
            }`}
          >
            {moving ? '■ Detener' : '▶ Arrancar'}
          </button>}
          <button
            type="button"
            onClick={() => setTools((t) => !t)}
            aria-expanded={tools}
            aria-label="Más controles de tiempo"
            data-testid="time-tools"
            className={`grid h-11 w-11 place-items-center rounded-xl text-slate-200 transition ${tools ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
        </div>

        {tools && <TimeTools onClose={() => setTools(false)} />}
      </div>
    </div>
  );
}

function TimeTools({ onClose }: { onClose: () => void }) {
  const store = useSimStore();
  const sim = store.sim;
  const dispatch = store.dispatch;
  const tz = sim.scenario.timeZone;
  const [target, setTarget] = useState(() => toDateTimeLocalValue(sim.clock.now + HOUR, tz));
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const finished = sim.clock.now >= sim.clock.endsAt;
  const next = nextRelevantEvent(sim);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const btn = 'rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-100 hover:bg-white/10 disabled:opacity-40';
  return (
    <div ref={ref} className="absolute bottom-full right-0 mb-2 w-[min(94vw,22rem)] rounded-2xl border border-white/10 bg-[#0b1220] p-4 text-sm shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]" role="dialog" aria-label="Controles de tiempo">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Velocidad</div>
      <div className="mb-3 grid grid-cols-5 gap-1">
        {([0, 1, 5, 30, 60] as Speed[]).map((sp) => (
          <button key={sp} type="button" disabled={finished} aria-pressed={sim.clock.speed === sp} onClick={() => dispatch({ type: 'SET_SPEED', speed: sp })} className={`rounded-lg px-2 py-1.5 text-xs ${sim.clock.speed === sp ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-200'}`}>
            {sp === 0 ? '❚❚' : `×${sp}`}
          </button>
        ))}
      </div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Avanzar</div>
      <div className="grid grid-cols-3 gap-1">
        <button type="button" className={btn} disabled={finished} onClick={() => dispatch({ type: 'ADVANCE_BY', ms: 15 * MINUTE })}>+15 min</button>
        <button type="button" className={btn} disabled={finished} onClick={() => dispatch({ type: 'ADVANCE_BY', ms: HOUR })}>+1 h</button>
        <button type="button" className={btn} disabled={finished} onClick={() => dispatch({ type: 'JUMP_NEXT_EVENT' })}>Siguiente ⏭</button>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Próximo: {next.label} ({formatDateTime(next.at, tz)} UTC)</p>
      <form
        className="mt-2 flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const at = fromDateTimeLocalValue(target, tz);
          if (at === null || at <= sim.clock.now) return setMsg('Elige un instante posterior al actual');
          dispatch({ type: 'ADVANCE_TO', at });
        }}
      >
        <label className="sr-only" htmlFor="advance-to">Avanzar hasta (UTC)</label>
        <input id="advance-to" type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-slate-100 [color-scheme:dark]" />
        <button type="submit" className={btn} disabled={finished}>Avanzar (UTC)</button>
      </form>
      <div className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Punto de restauración</div>
      <div className="grid grid-cols-3 gap-1">
        <button type="button" className={btn} onClick={() => setMsg(store.saveCheckpoint() ? 'Punto guardado' : 'No se pudo guardar')}>Guardar punto</button>
        <button type="button" className={btn} onClick={() => setMsg(store.restoreCheckpoint() ? 'Punto restaurado' : 'No hay punto guardado')}>Restaurar</button>
        <button type="button" className={btn} onClick={() => confirmThen('¿Reiniciar el escenario? Se perderá la actividad que no hayas guardado como punto.', () => store.reset(), { confirmLabel: 'Reiniciar', danger: true })}>Reiniciar</button>
      </div>
      <p className="mt-2 h-4 text-xs text-cyan-300" role="status">{msg}</p>
      <p className="text-[11px] text-slate-500">El tiempo solo avanza; para volver atrás, restaura un punto. Escenario de 14 días, horas en UTC.</p>
    </div>
  );
}
