import { useMemo, useState } from 'react';
import { ACTIVITY_LABEL } from '@/shared/types';
import { useSimStore } from '@/simulator/store';
import { driverEvents, eventDuration, eventEnd } from '@/time-engine/timeline';
import { formatDuration } from '@/time-engine/units';
import { addZonedDays, formatDate, formatDateTime, formatWeekday } from '@/time-engine/zoned';
import { SCENARIO_DAYS } from '@/scenarios/scenario';
import { ActivityIcon, ACTIVITY_COLOR } from '../components/icons';
import { Panel } from '../components/Panel';

/** Historial: barras de 14 días + tabla de eventos + registro del equipo. */
export function HistoryScreen() {
  const sim = useSimStore((s) => s.sim);
  const tz = sim.scenario.timeZone;
  const now = sim.clock.now;
  const [driverId, setDriverId] = useState(sim.device.insertedCardId ?? 'card-a');
  const events = useMemo(() => driverEvents(sim.timeline, driverId), [sim.timeline, driverId]);
  const days = useMemo(
    () => Array.from({ length: SCENARIO_DAYS }, (_, i) => {
      const start = addZonedDays(sim.scenario.weekOneStart, i, tz);
      return { start, end: addZonedDays(sim.scenario.weekOneStart, i + 1, tz) };
    }),
    [sim.scenario.weekOneStart, tz],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="driver" className="text-sm text-slate-400">Conductor ficticio</label>
        <select id="driver" value={driverId} onChange={(e) => setDriverId(e.target.value)} className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm">
          {Object.values(sim.cards).map((c) => (
            <option key={c.id} value={c.id}>{c.holderName} ({c.displayId})</option>
          ))}
        </select>
        <Legend />
      </div>

      <Panel title="Dos semanas — vista por días">
        <div className="space-y-1" data-testid="history-days">
          {days.map((d, i) => {
            const len = d.end - d.start;
            const dayEvents = events.filter((e) => e.start < d.end && eventEnd(e, now) > d.start);
            const driving = dayEvents.filter((e) => e.activity === 'DRIVING').reduce((acc, e) => acc + Math.max(0, Math.min(eventEnd(e, now), d.end, now) - Math.max(e.start, d.start)), 0);
            return (
              <div key={d.start} className={`flex items-center gap-2 ${i === 7 ? 'mt-3 border-t border-ink-700 pt-3' : ''}`}>
                <div className="w-24 shrink-0 text-xs text-slate-400">
                  <span className="inline-block w-7">{formatWeekday(d.start, tz)}</span>
                  {formatDate(d.start, tz).slice(0, 5)}
                </div>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-ink-800" aria-label={`Actividad del ${formatDate(d.start, tz)}`}>
                  {[6, 12, 18].map((h) => (
                    <span key={h} className="absolute inset-y-0 w-px bg-ink-600" style={{ left: `${(h / 24) * 100}%` }} />
                  ))}
                  {dayEvents.map((e) => {
                    const s = Math.max(e.start, d.start);
                    const en = Math.min(eventEnd(e, now), d.end);
                    return (
                      <span
                        key={e.id}
                        title={`${ACTIVITY_LABEL[e.activity]} ${formatDateTime(s, tz)} – ${formatDateTime(en, tz)}`}
                        className="absolute inset-y-0.5 rounded-sm"
                        style={{ left: `${((s - d.start) / len) * 100}%`, width: `${Math.max(0.2, ((en - s) / len) * 100)}%`, background: ACTIVITY_COLOR[e.activity], opacity: e.source === 'manual' ? 0.55 : 1 }}
                      />
                    );
                  })}
                  {now > d.start && now < d.end && <span className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${((now - d.start) / len) * 100}%` }} />}
                </div>
                <div className="w-14 shrink-0 text-right font-mono text-xs text-slate-300">{formatDuration(driving)}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Barras por día UTC (00–24 h UTC; la hora local de España va 1 h por delante en invierno y 2 h en verano). Columna derecha: conducción del día natural. Entradas manuales en tono atenuado.</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Registro de actividades (${events.length})`}>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs" data-testid="history-table">
              <thead className="sticky top-0 bg-ink-900 text-slate-500">
                <tr><th className="text-left font-normal">Actividad</th><th className="text-left font-normal">Inicio</th><th className="text-left font-normal">Fin</th><th className="text-right font-normal">Duración</th></tr>
              </thead>
              <tbody>
                {[...events].reverse().map((e) => (
                  <tr key={e.id} className="border-t border-ink-700/60">
                    <td className="py-1">
                      <span className="flex items-center gap-1.5" style={{ color: ACTIVITY_COLOR[e.activity] }}>
                        <ActivityIcon activity={e.activity} className="h-4 w-4" />
                        <span className="text-slate-200">{ACTIVITY_LABEL[e.activity]}</span>
                        {e.source === 'manual' && <span className="rounded bg-slate-700 px-1 text-[9px] text-slate-300">MANUAL</span>}
                      </span>
                    </td>
                    <td className="font-mono text-slate-300">{formatDateTime(e.start, tz)}</td>
                    <td className="font-mono text-slate-300">{e.end === null ? 'en curso' : formatDateTime(e.end, tz)}</td>
                    <td className="text-right font-mono text-slate-200">{formatDuration(eventDuration(e, now))}</td>
                  </tr>
                ))}
                {events.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-slate-500">Sin actividades registradas para este conductor.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={`Registro del equipo (${sim.log.length})`}>
          <ul className="max-h-96 space-y-1 overflow-auto text-xs">
            {[...sim.log].reverse().map((l) => (
              <li key={l.id} className={`flex gap-2 border-t border-ink-700/60 py-1 ${l.kind === 'WARNING' ? 'text-amber-200' : 'text-slate-300'}`}>
                <span className="shrink-0 font-mono text-slate-500">{formatDateTime(l.at, tz)}</span>
                <span>{l.text}</span>
              </li>
            ))}
            {sim.log.length === 0 && <li className="py-4 text-center text-slate-500">Sin eventos.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="ml-auto flex flex-wrap gap-3 text-xs text-slate-400">
      {(['DRIVING', 'WORK', 'AVAILABILITY', 'REST'] as const).map((a) => (
        <span key={a} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ACTIVITY_COLOR[a] }} />{ACTIVITY_LABEL[a]}</span>
      ))}
    </div>
  );
}
