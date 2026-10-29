import { useState } from 'react';
import { SPEEDS, type Speed } from '@/time-engine/clock';
import { HOUR, MINUTE } from '@/time-engine/units';
import { formatDateTime, formatTime, formatWeekday, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/time-engine/zoned';
import { nextRelevantEvent } from '@/simulator/engine';
import { useSimStore } from '@/simulator/store';
import type { AssistTarget } from '@/academy/assist';
import { Panel } from './Panel';

/** Laboratorio de tiempo: control del reloj virtual y de los puntos guardados. */
export function TimeLab({ highlight }: { highlight: AssistTarget }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const store = useSimStore();
  const tz = sim.scenario.timeZone;
  const [target, setTarget] = useState(() => toDateTimeLocalValue(sim.clock.now + HOUR, tz));
  const [msg, setMsg] = useState<string | null>(null);
  const next = nextRelevantEvent(sim);
  const finished = sim.clock.now >= sim.clock.endsAt;
  const flash = (m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg(null), 2500);
  };

  return (
    <Panel title="Laboratorio de tiempo" className={highlight === 'CLOCK' ? 'assist-target' : ''}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="font-mono text-2xl text-cyan-200" data-testid="virtual-clock">
            {formatDateTime(sim.clock.now, tz)}
          </div>
          <div className="text-xs text-slate-400">
            {formatWeekday(sim.clock.now, tz)} · UTC · local {formatTime(sim.clock.now, sim.scenario.localTimeZone)} ({sim.scenario.localTimeZone})
          </div>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs ${sim.clock.speed ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/50 text-slate-300'}`}>
          {finished ? 'FIN' : sim.clock.speed ? `×${sim.clock.speed}` : 'PAUSA'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5" role="group" aria-label="Velocidad del reloj">
        {SPEEDS.map((sp) => (
          <button
            key={sp}
            type="button"
            disabled={finished}
            aria-pressed={sim.clock.speed === sp}
            onClick={() => dispatch({ type: 'SET_SPEED', speed: sp as Speed })}
            className={`rounded-md border px-2 py-1.5 text-sm transition disabled:opacity-40 ${
              sim.clock.speed === sp ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100' : 'border-ink-600 bg-ink-800 text-slate-300 hover:border-cyan-700'
            }`}
          >
            {sp === 0 ? '❚❚' : `×${sp}`}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <SmallBtn onClick={() => dispatch({ type: 'ADVANCE_BY', ms: 15 * MINUTE })} disabled={finished}>+15 min</SmallBtn>
        <SmallBtn onClick={() => dispatch({ type: 'ADVANCE_BY', ms: HOUR })} disabled={finished}>+1 h</SmallBtn>
        <SmallBtn onClick={() => dispatch({ type: 'JUMP_NEXT_EVENT' })} disabled={finished} title={next.label}>Siguiente ⏭</SmallBtn>
      </div>
      <p className="mt-1 text-xs text-slate-500">Próximo evento: {next.label} ({formatDateTime(next.at, tz)})</p>

      <form
        className="mt-3 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          const at = fromDateTimeLocalValue(target, tz);
          if (at === null || at <= sim.clock.now) return flash('Elige un instante posterior al actual');
          dispatch({ type: 'ADVANCE_TO', at });
        }}
      >
        <label className="sr-only" htmlFor="advance-to">Avanzar hasta (UTC)</label>
        <input
          id="advance-to"
          type="datetime-local"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-ink-600 bg-ink-900 px-2 py-1.5 text-sm text-slate-200 [color-scheme:dark]"
        />
        <SmallBtn type="submit" disabled={finished}>Avanzar (UTC)</SmallBtn>
      </form>

      <div className="mt-3 grid grid-cols-3 gap-1.5 border-t border-ink-700 pt-3">
        <SmallBtn onClick={() => flash(store.saveCheckpoint() ? 'Punto guardado' : 'No se pudo guardar')}>Guardar punto</SmallBtn>
        <SmallBtn onClick={() => flash(store.restoreCheckpoint() ? 'Punto restaurado' : 'No hay punto guardado')}>Restaurar</SmallBtn>
        <SmallBtn
          onClick={() => {
            if (window.confirm('¿Reiniciar el escenario? Se perderá la actividad no guardada como punto.')) store.reset();
          }}
        >
          Reiniciar
        </SmallBtn>
      </div>
      <p className="mt-1 h-4 text-xs text-cyan-300" role="status">{msg}</p>
      <p className="text-[11px] text-slate-500">
        Escenario: {formatDateTime(sim.scenario.weekOneStart, tz)} → {formatDateTime(sim.scenario.endsAt, tz)} (14 días). Todas las horas en UTC. El tiempo solo avanza; para volver atrás, restaura un punto.
      </p>
    </Panel>
  );
}

function SmallBtn({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="rounded-md border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-slate-200 transition hover:border-cyan-700 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
