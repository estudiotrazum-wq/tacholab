import { useMemo, useState } from 'react';
import { ExercisePanel } from '../components/ExercisePanel';
import { ACTIVITY_LABEL, type EpochMs } from '@/shared/types';
import type { ComplianceReport, Finding } from '@/regulations/compliance';
import { complianceFor } from '@/simulator/derived';
import { useSimStore } from '@/simulator/store';
import { driverEvents, eventDuration, eventEnd, type ActivityEvent } from '@/time-engine/timeline';
import { formatDuration, HOUR } from '@/time-engine/units';
import { addZonedDays, formatDate, formatDateTime, formatTime, formatWeekday } from '@/time-engine/zoned';
import { SCENARIO_DAYS } from '@/scenarios/scenario';
import { ActivityIcon, ACTIVITY_COLOR } from '../components/icons';
import { Panel } from '../components/Panel';

/** Clasificación visual de los bloques de descanso según el motor normativo. */
type RestTag = { start: EpochMs; end: EpochMs; label: string; color: string };

/** Paleta de la franja normativa, distinta de los colores de actividad. */
const REST_COLORS = {
  weeklyNormal: '#818cf8',
  weeklyReduced: '#f472b6',
  dailyNormal: '#a3e635',
  split: '#22d3ee',
  reduced: '#facc15',
  insufficient: '#f43f5e',
};

function restTags(report: ComplianceReport): RestTag[] {
  const tags: RestTag[] = [];
  for (const p of report.periods) {
    const c = p.closing;
    if (!c) continue;
    const { start, end } = c.block;
    if (c.weekly) {
      const normal = end - start >= 45 * HOUR;
      tags.push({ start, end, label: normal ? 'Descanso semanal normal' : 'Descanso semanal reducido', color: normal ? REST_COLORS.weeklyNormal : REST_COLORS.weeklyReduced });
    } else if (c.kind === 'SPLIT') {
      tags.push({ start: c.splitFirst!.start, end: c.splitFirst!.end, label: 'Descanso fraccionado (1.ª parte, 3 h)', color: REST_COLORS.split });
      tags.push({ start, end, label: 'Descanso fraccionado (2.ª parte, 9 h)', color: REST_COLORS.split });
    } else {
      const map = { NORMAL: ['Descanso diario normal', REST_COLORS.dailyNormal], REDUCED: ['Descanso diario reducido', REST_COLORS.reduced], INSUFFICIENT: ['Descanso diario insuficiente', REST_COLORS.insufficient] } as const;
      const [label, color] = map[c.kind as 'NORMAL' | 'REDUCED' | 'INSUFFICIENT'];
      tags.push({ start, end, label, color });
    }
  }
  return tags;
}

interface Day {
  start: EpochMs;
  end: EpochMs;
}

/** Calendario de catorce días: actividad, descansos clasificados, infracciones y detalle por día. */
export function CalendarScreen() {
  const sim = useSimStore((s) => s.sim);
  const tz = sim.scenario.timeZone;
  const now = sim.clock.now;
  const [driverId, setDriverId] = useState(sim.device.insertedCardId ?? 'card-a');
  const events = useMemo(() => driverEvents(sim.timeline, driverId), [sim.timeline, driverId]);
  const report = useMemo(() => complianceFor(sim, driverId)!, [sim, driverId]);
  const tags = useMemo(() => restTags(report), [report]);
  const days: Day[] = useMemo(
    () => Array.from({ length: SCENARIO_DAYS }, (_, i) => ({ start: addZonedDays(sim.scenario.weekOneStart, i, tz), end: addZonedDays(sim.scenario.weekOneStart, i + 1, tz) })),
    [sim.scenario.weekOneStart, tz],
  );
  const todayIdx = days.findIndex((d) => now >= d.start && now < d.end);
  const [selected, setSelected] = useState(todayIdx === -1 ? (now >= sim.scenario.endsAt ? SCENARIO_DAYS - 1 : 0) : todayIdx);
  const day = days[selected]!;
  const c = report.current;
  const infr = report.findings.filter((f) => f.severity === 'infringement');

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <ExercisePanel compact />
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="cal-driver" className="text-sm text-slate-400">Conductor ficticio</label>
        <select id="cal-driver" value={driverId} onChange={(e) => setDriverId(e.target.value)} className="rounded-md border border-white/15 bg-[#0b1220] px-2 py-1 text-sm">
          {Object.values(sim.cards).map((card) => <option key={card.id} value={card.id}>{card.holderName} ({card.displayId})</option>)}
        </select>
        <span className="text-xs text-slate-500">{sim.scenario.title} · todas las horas en UTC</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <Kpi label="Semana 1" value={formatDuration(report.weeks[0]!.drivingMs)} sub="/ 56:00" bad={report.weeks[0]!.drivingMs > 56 * HOUR} />
        <Kpi label="Semana 2" value={formatDuration(report.weeks[1]!.drivingMs)} sub="/ 56:00" bad={report.weeks[1]!.drivingMs > 56 * HOUR} />
        <Kpi label="Dos semanas" value={formatDuration(report.weeks[0]!.drivingMs + report.weeks[1]!.drivingMs)} sub="/ 90:00" bad={report.weeks[0]!.drivingMs + report.weeks[1]!.drivingMs > 90 * HOUR} />
        <Kpi label="Ampliaciones 10 h" value={`${report.weeks[0]!.extensions} · ${report.weeks[1]!.extensions}`} sub="sem. 1 · sem. 2" bad={report.weeks.some((w) => w.extensions > 2)} />
        <Kpi label="Reducidos" value={`${c.reducedDailySinceWeekly} / 3`} sub="desde el último semanal" bad={false} />
        {now >= sim.scenario.endsAt ? (
          <Kpi label="Disponible ahora" value="—" sub="escenario terminado" bad={false} />
        ) : (
          <Kpi label="Disponible ahora" value={formatDuration(c.availableDrivingMs)} sub={c.limitingFactor} bad={false} />
        )}
        <Kpi label="Infracciones" value={String(infr.length)} sub={`${report.obligations.filter((o) => o.status === 'pending').length} obligaciones pendientes`} bad={infr.length > 0} />
      </div>

      <Panel title="Calendario de dos semanas" aside={<Legend />}>
        <div className="space-y-1.5" data-testid="history-days">
          {days.map((d, i) => (
            <DayRow
              key={d.start}
              day={d}
              index={i}
              selected={i === selected}
              onSelect={() => setSelected(i)}
              events={events}
              tags={tags}
              findings={report.findings}
              now={now}
              tz={tz}
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Barra superior: actividad registrada (00–24 h UTC). Franja inferior: clasificación normativa de los descansos. ▲ = infracción simulada. Pulsa un día para ver el detalle.
        </p>
      </Panel>

      <DayDetail day={day} events={events} tags={tags} findings={report.findings} now={now} tz={tz} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Registro de actividades (${events.length})`}>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs" data-testid="history-table">
              <thead className="sticky top-0 bg-[#0b1220] text-slate-500">
                <tr><th className="text-left font-normal">Actividad</th><th className="text-left font-normal">Inicio</th><th className="text-left font-normal">Fin</th><th className="text-right font-normal">Duración</th></tr>
              </thead>
              <tbody>
                {[...events].reverse().map((e) => (
                  <tr key={e.id} className="border-t border-white/5">
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
              <li key={l.id} className={`flex gap-2 border-t border-white/5 py-1 ${l.kind === 'WARNING' ? 'text-amber-200' : 'text-slate-300'}`}>
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

function clip(start: EpochMs, end: EpochMs, d: Day) {
  const s = Math.max(start, d.start);
  const e = Math.min(end, d.end);
  return e > s ? { left: ((s - d.start) / (d.end - d.start)) * 100, width: ((e - s) / (d.end - d.start)) * 100, s, e } : null;
}

function DayRow(p: { day: Day; index: number; selected: boolean; onSelect: () => void; events: ActivityEvent[]; tags: RestTag[]; findings: Finding[]; now: EpochMs; tz: string }) {
  const { day: d, now, tz } = p;
  const driving = p.events
    .filter((e) => e.activity === 'DRIVING')
    .reduce((acc, e) => acc + Math.max(0, Math.min(eventEnd(e, now), d.end, now) - Math.max(e.start, d.start)), 0);
  const dayFindings = p.findings.filter((f) => f.severity === 'infringement' && f.at >= d.start && f.at < d.end);
  return (
    <button
      type="button"
      onClick={p.onSelect}
      aria-pressed={p.selected}
      aria-label={`${formatWeekday(d.start, tz)} ${formatDate(d.start, tz)}: ${formatDuration(driving)} de conducción${dayFindings.length ? `, ${dayFindings.length} infracción(es)` : ''}`}
      className={`flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left ${p.index === 7 ? 'mt-3' : ''} ${p.selected ? 'bg-cyan-500/10 ring-1 ring-cyan-700' : 'hover:bg-white/5'}`}
    >
      <div className="w-20 shrink-0 text-xs text-slate-400">
        <span className="inline-block w-7">{formatWeekday(d.start, tz)}</span>
        {formatDate(d.start, tz).slice(0, 5)}
      </div>
      <div className="relative h-7 flex-1">
        <div className="absolute inset-x-0 top-0 h-4 overflow-hidden rounded bg-white/5">
          {[6, 12, 18].map((h) => <span key={h} className="absolute inset-y-0 w-px bg-ink-600" style={{ left: `${(h / 24) * 100}%` }} />)}
          {p.events.map((e) => {
            const c = clip(e.start, eventEnd(e, now), d);
            return c && (
              <span key={e.id} className="absolute inset-y-0.5 rounded-sm" title={`${ACTIVITY_LABEL[e.activity]} ${formatTime(c.s, tz)}–${formatTime(c.e, tz)}`} style={{ left: `${c.left}%`, width: `${Math.max(0.2, c.width)}%`, background: ACTIVITY_COLOR[e.activity], opacity: e.source === 'manual' ? 0.55 : 1 }} />
            );
          })}
          {now > d.start && now < d.end && <span className="absolute inset-y-0 w-0.5 bg-white" style={{ left: `${((now - d.start) / (d.end - d.start)) * 100}%` }} />}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1.5 overflow-hidden rounded-sm">
          {p.tags.map((t) => {
            const c = clip(t.start, t.end, d);
            return c && <span key={`${t.start}-${t.label}`} className="absolute inset-y-0" title={t.label} style={{ left: `${c.left}%`, width: `${c.width}%`, background: t.color }} />;
          })}
        </div>
        {dayFindings.map((f) => (
          <span key={f.id} className="absolute -top-1 -translate-x-1/2 text-[10px] leading-none text-rose-400" style={{ left: `${((f.at - d.start) / (d.end - d.start)) * 100}%` }} title={f.title}>▲</span>
        ))}
      </div>
      <div className={`w-12 shrink-0 text-right font-mono text-xs ${driving > 10 * HOUR ? 'text-rose-300' : driving > 9 * HOUR ? 'text-amber-300' : 'text-slate-300'}`}>{formatDuration(driving)}</div>
    </button>
  );
}

function DayDetail(p: { day: Day; events: ActivityEvent[]; tags: RestTag[]; findings: Finding[]; now: EpochMs; tz: string }) {
  const { day: d, now, tz } = p;
  // Solo periodos con duración visible ese día (un periodo recién iniciado dura 0).
  const evs = p.events.filter((e) => clip(e.start, eventEnd(e, now), d) !== null);
  const fs = p.findings.filter((f) => f.at >= d.start && f.at < d.end);
  const hours = Math.round((d.end - d.start) / HOUR);
  return (
    <Panel title={`Detalle: ${formatWeekday(d.start, tz)} ${formatDate(d.start, tz)} (UTC)`}>
      <div className="relative h-14 rounded bg-white/5" data-testid="day-detail">
        {evs.map((e) => {
          const c = clip(e.start, eventEnd(e, now), d);
          return c && (
            <span key={e.id} className="absolute top-1 h-8 overflow-hidden rounded-sm px-1 text-[10px] leading-8 text-ink-950" style={{ left: `${c.left}%`, width: `${c.width}%`, background: ACTIVITY_COLOR[e.activity] }} title={`${ACTIVITY_LABEL[e.activity]} ${formatTime(c.s, tz)}–${formatTime(c.e, tz)}`}>
              {c.width > 6 ? formatDuration(c.e - c.s) : ''}
            </span>
          );
        })}
        {p.tags.map((t) => {
          const c = clip(t.start, t.end, d);
          return c && <span key={`${t.start}-${t.label}`} className="absolute bottom-1 h-2 rounded-sm" style={{ left: `${c.left}%`, width: `${c.width}%`, background: t.color }} title={t.label} />;
        })}
      </div>
      <div className="relative mt-1 h-4 text-[10px] text-slate-500">
        {Array.from({ length: hours + 1 }, (_, h) => h).filter((h) => h % 3 === 0).map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${(h / hours) * 100}%` }}>{String(h).padStart(2, '0')}</span>
        ))}
      </div>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <ul className="space-y-1 text-xs">
          {evs.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <span style={{ color: ACTIVITY_COLOR[e.activity] }}><ActivityIcon activity={e.activity} className="h-4 w-4" /></span>
              <span className="w-28 font-mono text-slate-400">{formatTime(Math.max(e.start, d.start), tz)}–{eventEnd(e, now) >= d.end ? '24:00' : formatTime(eventEnd(e, now), tz)}</span>
              <span className="text-slate-200">{ACTIVITY_LABEL[e.activity]}</span>
              <span className="ml-auto font-mono text-slate-400">{formatDuration(eventDuration(e, now))}</span>
            </li>
          ))}
          {evs.length === 0 && <li className="text-slate-500">Sin actividad registrada este día.</li>}
        </ul>
        <ul className="space-y-1 text-xs">
          {fs.map((f) => (
            <li key={f.id} className={`rounded border px-2 py-1 ${f.severity === 'infringement' ? 'border-rose-500/40 text-rose-200' : 'border-violet-500/40 text-violet-200'}`}>
              <strong>{formatTime(f.at, tz)} · {f.title}</strong>
              <div className="text-slate-400">{f.detail}</div>
            </li>
          ))}
          {fs.length === 0 && <li className="text-emerald-300">Sin infracciones este día.</li>}
        </ul>
      </div>
    </Panel>
  );
}

function Kpi({ label, value, sub, bad }: { label: string; value: string; sub: string; bad: boolean }) {
  return (
    <div className="glass rounded-2xl px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-lg ${bad ? 'text-rose-300' : 'text-slate-100'}`}>{value}</div>
      <div className="truncate text-[10px] text-slate-500" title={sub}>{sub}</div>
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ...(['DRIVING', 'WORK', 'AVAILABILITY', 'REST'] as const).map((a): [string, string] => [ACTIVITY_LABEL[a], ACTIVITY_COLOR[a]]),
    ['Diario normal', REST_COLORS.dailyNormal],
    ['Fraccionado', REST_COLORS.split],
    ['Reducido', REST_COLORS.reduced],
    ['Semanal', REST_COLORS.weeklyNormal],
    ['Sem. reducido', REST_COLORS.weeklyReduced],
    ['Insuficiente', REST_COLORS.insufficient],
  ];
  return (
    <div className="hidden flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] text-slate-400 md:flex">
      {items.map(([l, c]) => <span key={l} className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: c }} />{l}</span>)}
    </div>
  );
}
