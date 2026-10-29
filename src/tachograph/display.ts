import { ACTIVITY_SHORT, type Activity, type SelectableActivity } from '@/shared/types';
import { complianceFor, deriveSummary, type SimSummary } from '@/simulator/derived';
import type { SimState } from '@/simulator/state';
import { eventDuration, eventsInRange, driverEvents } from '@/time-engine/timeline';
import { formatDuration } from '@/time-engine/units';
import { addZonedDays, formatDate, formatTime, startOfZonedDay, zonedParts } from '@/time-engine/zoned';
import { breakRemainingMs } from '@/regulations/continuousDriving';
import { COUNTRIES, MENU_ITEMS, type ManualActivity } from './types';

/**
 * Modelo de pantalla del dispositivo ficticio TL-1, derivado del estado.
 * Diseño propio: cabecera + 3 líneas de texto + fila de iconos.
 */
export interface DisplayModel {
  title: string;
  lines: [string, string, string];
  /** Línea seleccionada (cursor), si aplica. */
  cursor: number | null;
  recorded: Activity | null;
  selected: SelectableActivity;
  cardIn: boolean;
  moving: boolean;
  mode: 'normal' | 'warning' | 'notice';
}

const MANUAL_LABEL: Record<ManualActivity, string> = {
  REST: 'Descanso',
  WORK: 'Otros trabajos',
  AVAILABILITY: 'Disponibilidad',
  UNKNOWN: 'Desconocida ?',
};

function short(ms: number, tz: string): string {
  const p = zonedParts(ms, tz);
  return `${String(p.day).padStart(2, '0')}/${String(p.month).padStart(2, '0')} ${formatTime(ms, tz)}`;
}

function window3<T>(items: readonly T[], offset: number): { slice: T[]; offset: number } {
  const max = Math.max(0, items.length - 3);
  const o = Math.min(offset, max);
  return { slice: items.slice(o, o + 3), offset: o };
}

function pad3(lines: string[]): [string, string, string] {
  return [lines[0] ?? '', lines[1] ?? '', lines[2] ?? ''];
}

export function ticketLines(sim: SimState, sum: SimSummary): string[] {
  const tz = sim.scenario.timeZone;
  const card = sim.cards[sum.driverId ?? ''];
  const now = sim.clock.now;
  return [
    `${card?.holderName ?? '—'}`,
    `${card?.displayId ?? ''}`,
    `Día ${formatDate(now, tz)}`,
    `Conducción  ${formatDuration(sum.today.DRIVING)}`,
    `Otros trab. ${formatDuration(sum.today.WORK)}`,
    `Disponib.   ${formatDuration(sum.today.AVAILABILITY)}`,
    `Descanso    ${formatDuration(sum.today.REST)}`,
    `Cont. ${formatDuration(sum.continuous?.drivingSinceBreakMs ?? 0)} / 4:30`,
    `Jornada: ${formatDuration(complianceFor(sim, sum.driverId)?.current.dailyDrivingMs ?? 0)} cond.`,
    `Semana ${sum.weekIndex}: ${formatDuration(sum.week.DRIVING)}`,
    `2 semanas: ${formatDuration(sum.twoWeeks.DRIVING)}`,
    '— Simulador educativo —',
  ];
}

export function renderDisplay(sim: SimState): DisplayModel {
  const tz = sim.scenario.timeZone;
  const now = sim.clock.now;
  const d = sim.device;
  const sum = deriveSummary(sim);
  const cur = complianceFor(sim)?.current ?? null;
  const base = {
    cursor: null,
    recorded: sum.recorded,
    selected: d.selected,
    cardIn: d.insertedCardId !== null,
    moving: sim.vehicle.moving,
  };

  if (d.warning) {
    return { ...base, mode: 'warning', title: d.warning.severity === 'info' ? 'i AVISO' : '! AVISO', lines: pad3([d.warning.title, '', 'OK para confirmar']) };
  }
  if (d.notice) {
    return { ...base, mode: 'notice', title: 'INFO', lines: pad3([d.notice.text]) };
  }

  const s = d.screen;
  const card = d.insertedCardId ? sim.cards[d.insertedCardId] : undefined;
  const view = (title: string, lines: string[], cursor: number | null = null): DisplayModel => ({
    ...base,
    mode: 'normal',
    title,
    lines: pad3(lines),
    cursor,
  });

  switch (s.kind) {
    case 'STANDARD': {
      const curDur = sum.currentEvent ? formatDuration(eventDuration(sum.currentEvent, now)) : '--:--';
      if (s.page === 0) {
        return view(`${formatTime(now, tz)} UTC   ${formatDate(now, tz).slice(0, 5)}`, [
          sum.recorded ? `${ACTIVITY_SHORT[sum.recorded]}  ${curDur}` : 'SIN REGISTRO',
          card ? `Cont ${formatDuration(sum.continuous?.drivingSinceBreakMs ?? 0)}  Jorn ${formatDuration(cur?.dailyDrivingMs ?? 0)}` : 'SIN TARJETA',
          card ? `Pausa ${formatDuration(sum.continuous?.currentBreakMs ?? 0)}${sum.continuous?.splitFirstTaken ? ' (15✓)' : ''}` : 'Inserte tarjeta',
        ]);
      }
      if (s.page === 1) {
        if (!cur) return view('ACUMULADOS', ['Sin tarjeta']);
        return view('CONDUCCIÓN', [
          `Jorn.  ${formatDuration(cur.dailyDrivingMs)}/${formatDuration(cur.dailyCapMs)}`,
          `Sem.  ${formatDuration(cur.weekDrivingMs)}/56:00`,
          `2 sem ${formatDuration(cur.biweekDrivingMs)}/90:00`,
        ]);
      }
      return view('HORA', [`UTC   ${formatTime(now, 'UTC')}`, `LOCAL ${formatTime(now, sim.scenario.localTimeZone)}`, card ? card.displayId : 'Sin tarjeta']);
    }
    case 'MENU': {
      const items = MENU_ITEMS.map((m) => m.label);
      const start = Math.min(Math.max(0, s.index - 1), Math.max(0, items.length - 3));
      return view(`MENÚ  ${s.index + 1}/${items.length}`, items.slice(start, start + 3), s.index - start);
    }
    case 'TIMES': {
      const c = sum.continuous;
      return view('TIEMPOS', [
        `Cont.  ${formatDuration(c?.drivingSinceBreakMs ?? 0)} / 4:30`,
        c && c.currentBreakMs > 0 ? `Pausa  ${formatDuration(c.currentBreakMs)} faltan ${formatDuration(breakRemainingMs(c))}` : `Pausa  —${c?.splitFirstTaken ? ' (15✓)' : ''}`,
        `Disponible ${formatDuration(cur?.availableDrivingMs ?? 0)}`,
      ]);
    }
    case 'DAY_ACTIVITIES': {
      const dayStart = startOfZonedDay(now, tz);
      const evs = d.insertedCardId
        ? eventsInRange(driverEvents(sim.timeline, d.insertedCardId), dayStart, addZonedDays(dayStart, 1, tz), now)
        : [];
      const rows = evs.map(
        (e) => `${formatTime(Math.max(e.start, dayStart), tz)} ${ACTIVITY_SHORT[e.activity]} ${formatDuration(eventDuration(e, now))}${e.source === 'manual' ? ' M' : ''}`,
      );
      if (rows.length === 0) return view('HOY', ['Sin actividades']);
      const w = window3(rows, s.offset);
      return view(`HOY ${w.offset + 1}-${w.offset + w.slice.length}/${rows.length}`, w.slice);
    }
    case 'TICKET': {
      const rows = ticketLines(sim, sum);
      const w = window3(rows, s.offset);
      return view(`RESUMEN ${w.offset + 1}/${rows.length}`, w.slice);
    }
    case 'DEVICE_INFO':
      return view('EQUIPO', ['TL-1 EDU  v0.1', 'Simulador educativo', 'NO HOMOLOGADO']);
    case 'WELCOME': {
      const last = card?.lastWithdrawalAt;
      return view('BIENVENIDA', [card?.holderName ?? '', 'Última retirada:', last != null ? short(last, tz) : '— primer uso']);
    }
    case 'MANUAL_ASK':
      return view('ENTRADA MANUAL', ['¿Añadir actividad', 'sin tarjeta?', s.yes ? '[SÍ]   no ' : ' sí   [NO]']);
    case 'MANUAL_EDIT': {
      const n = s.segments.length + 1;
      return view(
        `MANUAL #${n}`,
        [`Desde ${short(s.draft.start, tz)}`, `${s.field === 'activity' ? '▸' : ' '}${MANUAL_LABEL[s.draft.activity]}`, `${s.field === 'end' ? '▸' : ' '}Hasta ${short(s.draft.end, tz)}`],
        s.field === 'activity' ? 1 : 2,
      );
    }
    case 'MANUAL_CONFIRM':
      return view('CONFIRMAR', [`${s.segments.length} periodo(s)`, '¿Guardar entrada?', s.yes ? '[SÍ]   no ' : ' sí   [NO]']);
    case 'COUNTRY': {
      const start = Math.min(Math.max(0, s.index - 1), COUNTRIES.length - 3);
      const rows = COUNTRIES.slice(start, start + 3).map((c) => `${c.code.padEnd(3)}${c.name}`);
      return view(s.purpose === 'start' ? 'PAÍS INICIO' : 'PAÍS FIN', rows, s.index - start);
    }
  }
}
