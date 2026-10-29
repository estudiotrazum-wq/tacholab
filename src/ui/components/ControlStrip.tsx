import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { AssistTarget } from '@/academy/assist';
import { DEFAULT_SPEED_KMH, MAX_SPEED_KMH, nextRelevantEvent } from '@/simulator/engine';
import { useSimStore } from '@/simulator/store';
import type { Speed } from '@/time-engine/clock';
import { driverEvents, eventEnd } from '@/time-engine/timeline';
import { DAY, HOUR, MINUTE } from '@/time-engine/units';
import { formatDate, formatDateTime, formatTime, formatWeekday } from '@/time-engine/zoned';
import { SCENARIO_DAYS } from '@/scenarios/scenario';
import { ACTIVITY_COLOR } from './icons';
import { TimeTools } from './ControlDock';

const CLOCK_STEPS: Speed[] = [0, 1, 5, 30, 60];
const CLOCK_LABELS = ['Pausa', '×1', '×5', '×30', '×60'];
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Barra de control bajo el tacógrafo, manejable con el cursor:
 * línea de tiempo de 14 días (arrastrar para avanzar), velocidad del reloj y velocidad del camión.
 */
export function ControlStrip({ highlight }: { highlight: AssistTarget }) {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const [tools, setTools] = useState(false);
  const tz = sim.scenario.timeZone;
  const speed = sim.clock.speed;
  const finished = sim.clock.now >= sim.clock.endsAt;
  const kmh = sim.vehicle.moving ? (sim.vehicle.speedKmh ?? DEFAULT_SPEED_KMH) : 0;
  const clockIndex = Math.max(0, CLOCK_STEPS.indexOf(speed));

  return (
    <section aria-label="Controles de la simulación" className={`glass relative z-10 rounded-2xl p-4 ${highlight === 'CLOCK' ? 'assist-target' : ''}`} data-testid="control-dock">
      {/* Reloj y acciones rápidas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <div className="whitespace-nowrap font-mono text-2xl leading-tight text-white" data-testid="virtual-clock">
            {formatTime(sim.clock.now, tz)}
            <span className="ml-1 text-xs text-slate-400">UTC</span>
          </div>
          <div className="whitespace-nowrap text-[11px] text-slate-400">
            {formatWeekday(sim.clock.now, tz)} {formatDate(sim.clock.now, tz)} · local {formatTime(sim.clock.now, sim.scenario.localTimeZone)}
          </div>
        </div>
        <button
          type="button"
          disabled={finished}
          onClick={() => dispatch({ type: 'SET_SPEED', speed: speed === 0 ? 60 : 0 })}
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
        <button
          type="button"
          disabled={finished}
          onClick={() => dispatch({ type: 'JUMP_NEXT_EVENT' })}
          title={`Saltar a: ${nextRelevantEvent(sim).label}`}
          className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-40"
        >
          Siguiente evento ⏭
        </button>
        <div className="relative ml-auto">
          <button type="button" onClick={() => setTools((t) => !t)} aria-expanded={tools} aria-label="Más controles de tiempo" data-testid="time-tools" className={`grid h-10 w-10 place-items-center rounded-xl text-slate-200 ${tools ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
          </button>
          {tools && <TimeTools onClose={() => setTools(false)} />}
        </div>
      </div>

      <Timeline />

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <Slider
          id="clock-speed"
          label="Velocidad del reloj"
          value={clockIndex}
          min={0}
          max={CLOCK_STEPS.length - 1}
          step={1}
          display={CLOCK_LABELS[clockIndex]!}
          ticks={CLOCK_LABELS}
          disabled={finished}
          onChange={(i) => dispatch({ type: 'SET_SPEED', speed: CLOCK_STEPS[i]! })}
          valueText={(i) => CLOCK_LABELS[i]!}
        />
        <Slider
          id="truck-speed"
          label="Acelerador"
          value={kmh}
          min={0}
          max={MAX_SPEED_KMH}
          step={5}
          display={kmh === 0 ? 'Parado' : `${kmh} km/h`}
          ticks={['0', '30', '60', '90']}
          onChange={(v) => dispatch({ type: 'SET_VEHICLE_SPEED', kmh: v })}
          valueText={(v) => (v === 0 ? 'Parado' : `${v} km/h`)}
          highlight={highlight === 'VEHICLE'}
        />
      </div>
    </section>
  );
}

function Slider(p: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  ticks: string[];
  onChange: (v: number) => void;
  valueText: (v: number) => string;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const pct = ((p.value - p.min) / (p.max - p.min)) * 100;
  return (
    <div className={p.highlight ? 'assist-target rounded-xl p-1' : ''}>
      <div className="flex items-baseline justify-between text-xs">
        <label htmlFor={p.id} className="text-slate-300">{p.label}</label>
        <span className="font-mono text-white">{p.display}</span>
      </div>
      <input
        id={p.id}
        type="range"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        disabled={p.disabled}
        aria-valuetext={p.valueText(p.value)}
        onChange={(e) => p.onChange(Number(e.target.value))}
        className="tl-range mt-2 w-full"
        style={{ ['--pct' as string]: `${pct}%` }}
        data-testid={p.id}
      />
      <div className="mt-1 flex justify-between text-[10px] text-slate-500" aria-hidden="true">
        {p.ticks.map((t) => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
}

/** Línea de tiempo de las dos semanas: arrastra el cursor hacia la derecha para avanzar. */
function Timeline() {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const tz = sim.scenario.timeZone;
  const { weekOneStart: from, endsAt: to } = sim.scenario;
  const now = sim.clock.now;
  const span = to - from;
  const track = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const driver = sim.device.insertedCardId ?? 'card-a';
  const events = useMemo(() => driverEvents(sim.timeline, driver), [sim.timeline, driver]);
  const pos = (t: number) => ((t - from) / span) * 100;
  const shown = preview ?? now;

  const timeAt = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const t = from + ((clientX - r.left) / r.width) * span;
    // Pasos de 15 min, nunca hacia atrás ni más allá del final.
    const snapped = Math.round(t / (15 * MINUTE)) * 15 * MINUTE;
    setBlocked(snapped < now);
    return Math.min(to, Math.max(now, snapped));
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setPreview(timeAt(e.clientX));
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (preview !== null) setPreview(timeAt(e.clientX));
  };
  const onUp = () => {
    if (preview !== null && preview > now) dispatch({ type: 'ADVANCE_TO', at: preview });
    setPreview(null);
    window.setTimeout(() => setBlocked(false), 1500);
  };
  const onKey = (e: KeyboardEvent) => {
    const jump = { ArrowRight: e.shiftKey ? HOUR : 15 * MINUTE, ArrowUp: HOUR, PageUp: DAY, End: to - now }[e.key];
    if (jump) {
      e.preventDefault();
      dispatch({ type: 'ADVANCE_BY', ms: jump });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'Home') {
      e.preventDefault();
      setBlocked(true);
      window.setTimeout(() => setBlocked(false), 1500);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-300">Tiempo · arrastra para avanzar</span>
        <span className={`font-mono ${preview !== null ? 'text-cyan-200' : 'text-white'}`}>{formatWeekday(shown, tz)} {formatDateTime(shown, tz)} UTC</span>
      </div>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="Línea de tiempo de las dos semanas"
        aria-valuemin={from}
        aria-valuemax={to}
        aria-valuenow={now}
        aria-valuetext={`${formatWeekday(now, tz)} ${formatDateTime(now, tz)} UTC`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setPreview(null)}
        onKeyDown={onKey}
        data-testid="timeline"
        className="relative mt-2 h-12 cursor-ew-resize touch-none select-none rounded-xl bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        {/* Días */}
        {Array.from({ length: SCENARIO_DAYS }, (_, i) => (
          <span key={i} className={`absolute inset-y-0 border-l ${i === 7 ? 'border-white/30' : 'border-white/10'}`} style={{ left: `${(i / SCENARIO_DAYS) * 100}%` }}>
            <span className="absolute left-1 top-0.5 text-[9px] text-slate-500">{DAY_LETTERS[i % 7]}</span>
          </span>
        ))}
        {/* Actividad registrada */}
        <div className="absolute inset-x-0 bottom-2 h-3">
          {events.map((e) => {
            const s = pos(e.start);
            const w = pos(eventEnd(e, now)) - s;
            return w > 0 ? <span key={e.id} className="absolute inset-y-0" style={{ left: `${s}%`, width: `${Math.max(w, 0.15)}%`, background: ACTIVITY_COLOR[e.activity] }} /> : null;
          })}
        </div>
        {/* Tiempo ya transcurrido */}
        <span className="pointer-events-none absolute inset-y-0 left-0 rounded-l-xl bg-cyan-400/10" style={{ width: `${pos(now)}%` }} />
        {/* Avance previsto al arrastrar */}
        {preview !== null && preview > now && (
          <span className="pointer-events-none absolute inset-y-0 bg-cyan-300/25" style={{ left: `${pos(now)}%`, width: `${pos(preview) - pos(now)}%` }} />
        )}
        {/* Cursor */}
        <span className="pointer-events-none absolute inset-y-[-4px] w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]" style={{ left: `${pos(shown)}%` }}>
          <span className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-white" />
        </span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>Semana 1</span>
        <span className={blocked ? 'text-amber-300' : ''}>{blocked ? 'El tiempo solo avanza: para volver atrás, restaura un punto guardado.' : 'Semana 2'}</span>
      </div>
    </div>
  );
}
