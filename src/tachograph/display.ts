import type { Activity, SelectableActivity } from '@/shared/types';
import { complianceFor, deriveSummary, type SimSummary } from '@/simulator/derived';
import type { SimState } from '@/simulator/state';
import { eventDuration, eventsInRange, driverEvents } from '@/time-engine/timeline';
import { formatDuration } from '@/time-engine/units';
import { addZonedDays, formatDate, formatTime, startOfZonedDay, zonedParts } from '@/time-engine/zoned';
import type { WarningCode } from './types';
import { COUNTRIES, MENU_ITEMS, type ManualActivity } from './types';

/**
 * Pantalla del TL-1: LCD de 2 líneas × 20 caracteres, como los tacógrafos
 * digitales reales. Los pictogramas normalizados se codifican en el texto con
 * fichas que la interfaz sustituye por dibujos:
 *   {D} conducción · {W} otros trabajos · {A} disponibilidad · {R} pausa/descanso
 *   {C} tarjeta · {L} hora local · {U} hora UTC · {?} actividad desconocida · {M} entrada manual
 * Las fichas ocupan una celda; los textos se ajustan a 20 celdas.
 */
export const LCD_COLS = 20;

export interface DisplayModel {
  lines: [string, string];
  recorded: Activity | null;
  selected: SelectableActivity;
  cardIn: boolean;
  moving: boolean;
  mode: 'normal' | 'warning' | 'notice';
  /** Retroiluminación encendida (contacto puesto). */
  backlight: boolean;
}

export const ACTIVITY_TOKEN: Record<Activity, string> = { DRIVING: '{D}', WORK: '{W}', AVAILABILITY: '{A}', REST: '{R}' };
const MANUAL_TOKEN: Record<ManualActivity, string> = { REST: '{R}', WORK: '{W}', AVAILABILITY: '{A}', UNKNOWN: '{?}' };

const TOKEN = /\{[DWARCLU?M]\}/g;

/** Longitud visible (cada ficha cuenta como una celda). */
export function lcdLength(s: string): number {
  return s.replace(TOKEN, '#').length;
}

/** Ajusta a 20 celdas: recorta o rellena con espacios. */
export function fit(s: string): string {
  let out = '';
  let n = 0;
  for (const part of s.split(/(\{[DWARCLU?M]\})/)) {
    if (!part) continue;
    const isToken = TOKEN.test(part);
    TOKEN.lastIndex = 0;
    const len = isToken ? 1 : part.length;
    if (n + len > LCD_COLS) {
      if (!isToken) out += part.slice(0, LCD_COLS - n);
      n = LCD_COLS;
      break;
    }
    out += part;
    n += len;
  }
  return out + ' '.repeat(LCD_COLS - n);
}

/** Texto alineado a izquierda y derecha en la misma línea. */
function spread(left: string, right: string): string {
  const gap = Math.max(1, LCD_COLS - lcdLength(left) - lcdLength(right));
  return fit(left + ' '.repeat(gap) + right);
}

/** Versión de solo texto (para la miniatura de la cabina y lectores de pantalla). */
export function lcdPlain(s: string): string {
  const map: Record<string, string> = { '{D}': '◉', '{W}': '⚒', '{A}': '◪', '{R}': '▬', '{C}': '▣', '{L}': '⊙', '{U}': 'U', '{?}': '?', '{M}': 'M' };
  return s.replace(TOKEN, (t) => map[t] ?? '');
}

/** Duración en formato de tacógrafo: 4h29, 0h45. */
function hm(ms: number): string {
  return formatDuration(ms).replace(':', 'h');
}

/** Dos líneas a partir de un texto largo (mensajes). */
function wrap(text: string): [string, string] {
  const words = text.split(' ');
  let a = '';
  let i = 0;
  while (i < words.length && (a ? `${a} ${words[i]}` : words[i]!).length <= LCD_COLS) a = a ? `${a} ${words[i++]}` : words[i++]!;
  return [fit(a), fit(words.slice(i).join(' '))];
}

const WARNING_TEXT: Record<WarningCode, [string, string]> = {
  CONT_DRIVING_PREWARN: ['!{D} 4h15 PAUSA', 'próxima pausa'],
  CONT_DRIVING_EXCEEDED: ['!{D} 4h30', 'pausa ahora'],
  DRIVING_WITHOUT_CARD: ['!{C} sin tarjeta', 'conducción'],
  DAILY_DRIVING_PREWARN: ['!{D} jornada', 'faltan 15 min'],
  DAILY_EXTENSION: ['i {D} ampliación', 'a 10h en uso'],
  DAILY_DRIVING_EXCEEDED: ['!{D} límite diario', 'detenga el vehículo'],
  WEEKLY_DRIVING_PREWARN: ['!{D} semana 55h', 'límite 56h'],
  WEEKLY_DRIVING_EXCEEDED: ['!{D} semana 56h', 'límite alcanzado'],
  BIWEEKLY_DRIVING_PREWARN: ['!{D} 2 semanas 89h', 'límite 90h'],
  BIWEEKLY_DRIVING_EXCEEDED: ['!{D} 2 semanas 90h', 'límite alcanzado'],
  DAILY_REST_DUE: ['!{R} descanso diario', 'iniciar ahora'],
  DAILY_REST_LAST_CALL: ['!{R} descanso diario', 'fuera de plazo'],
  WEEKLY_REST_DUE: ['!{R} desc. semanal', 'pendiente'],
};

export function ticketLines(sim: SimState, sum: SimSummary): string[] {
  const tz = sim.scenario.timeZone;
  const card = sim.cards[sum.driverId ?? ''];
  const now = sim.clock.now;
  return [
    `${card?.holderName ?? '—'}`,
    `${card?.displayId ?? ''}`,
    `Día ${formatDate(now, tz)} (UTC)`,
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

/** Ticket completo de la impresión diaria (cabecera + resumen), o null si no hay tarjeta. */
export function printoutLines(sim: SimState): string[] | null {
  const sum = deriveSummary(sim);
  if (!sum.driverId) return null;
  return [`TL-1 EDU · ${formatDate(sim.clock.now, sim.scenario.timeZone)} ${formatTime(sim.clock.now, sim.scenario.timeZone)} UTC`, 'IMPRESIÓN DIARIA (24 h)', '────────────────────', ...ticketLines(sim, sum)];
}

function short(ms: number, tz: string): string {
  const p = zonedParts(ms, tz);
  return `${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')} ${formatTime(ms, tz)}`;
}

export function renderDisplay(sim: SimState): DisplayModel {
  const tz = sim.scenario.timeZone;
  const now = sim.clock.now;
  const d = sim.device;
  const sum = deriveSummary(sim);
  const cur = complianceFor(sim)?.current ?? null;
  const card = d.insertedCardId ? sim.cards[d.insertedCardId] : undefined;
  const speed = sim.vehicle.moving ? (sim.vehicle.speedKmh ?? 80) : 0;
  const base = { recorded: sum.recorded, selected: d.selected, cardIn: card !== undefined, moving: sim.vehicle.moving, backlight: (sim.vehicle.ignition ?? 'off') !== 'off' };
  const view = (a: string, b: string, mode: DisplayModel['mode'] = 'normal'): DisplayModel => ({ ...base, mode, lines: [fit(a), fit(b)] });

  if (d.warning) {
    const [a, b] = WARNING_TEXT[d.warning.code];
    return view(a, `${b}`.padEnd(LCD_COLS - 2) + 'OK', 'warning');
  }
  if (d.notice) return { ...base, mode: 'notice', lines: wrap(d.notice.text) };

  const s = d.screen;
  const act = sum.recorded ? ACTIVITY_TOKEN[sum.recorded] : ' ';
  switch (s.kind) {
    case 'STANDARD': {
      if (s.page === 0) {
        // Línea 1: hora local, actividad, tarjeta y velocidad. Línea 2: conducción continua y pausa acumulada.
        const left = `${formatTime(now, tz)}{L} ${card ? `${act}{C}` : ''}`;
        const top = spread(left, `${speed}km/h`);
        if (!card) return view(top, ' Inserte tarjeta');
        const c = sum.continuous;
        return view(top, `{D}${hm(c?.drivingSinceBreakMs ?? 0)}  {R}${hm(c?.currentBreakMs ?? 0)}`);
      }
      if (s.page === 1) {
        if (!cur) return view('{D} acumulados', ' Sin tarjeta');
        return view(`{D}jorn ${hm(cur.dailyDrivingMs)}/${hm(cur.dailyCapMs)}`, `sem ${hm(cur.weekDrivingMs)} 2s ${hm(cur.biweekDrivingMs)}`);
      }
      return view(spread(`${formatTime(now, 'UTC')}{U}`, 'UTC'), spread(`${formatTime(now, sim.scenario.localTimeZone)}{L}`, 'local'));
    }
    case 'MENU': {
      const item = MENU_ITEMS[s.index]!;
      return view(spread('MENÚ', `${s.index + 1}/${MENU_ITEMS.length}`), `▸${item.label}`);
    }
    case 'TIMES': {
      const c = sum.continuous;
      return view(`{D}cont ${hm(c?.drivingSinceBreakMs ?? 0)} /4h30`, `disp ${hm(cur?.availableDrivingMs ?? 0)} {R}${hm(c?.currentBreakMs ?? 0)}`);
    }
    case 'DAY_ACTIVITIES': {
      const dayStart = startOfZonedDay(now, tz);
      const evs = d.insertedCardId ? eventsInRange(driverEvents(sim.timeline, d.insertedCardId), dayStart, addZonedDays(dayStart, 1, tz), now) : [];
      if (evs.length === 0) return view('HOY', 'Sin actividades');
      const i = Math.min(s.offset, evs.length - 1);
      const e = evs[i]!;
      return view(spread('HOY', `${i + 1}/${evs.length}`), `${formatTime(Math.max(e.start, dayStart), tz)} ${ACTIVITY_TOKEN[e.activity]} ${hm(eventDuration(e, now))}${e.source === 'manual' ? ' {M}' : ''}`);
    }
    case 'TICKET': {
      const rows = ticketLines(sim, sum);
      const i = Math.min(s.offset, rows.length - 1);
      return view(spread('RESUMEN', `${i + 1}/${rows.length}`), rows[i]!);
    }
    case 'DEVICE_INFO':
      return view('TL-1 EDU   v0.9', 'NO HOMOLOGADO');
    case 'WELCOME':
      return view(spread('Bienvenido/a', `${formatTime(now, sim.scenario.localTimeZone)}{L}`), `{C} ${card?.holderName ?? ''}`);
    case 'LAST_WITHDRAWAL': {
      // Fin de la jornada anterior: fecha y hora de la última retirada de la tarjeta.
      const last = card?.lastWithdrawalAt;
      return view('Última retirada', last != null ? `{C}↑ ${short(last, tz)} UTC` : '{C}↑ primer uso');
    }
    case 'MANUAL_ASK':
      return view('¿Entrada manual?', s.yes ? '   [SÍ]      no' : '    sí     [NO]');
    case 'WITHDRAW_PRINT':
      return view('¿Imprimir 24 h?', s.yes ? '   [SÍ]      no' : '    sí     [NO]');
    case 'MANUAL_EDIT': {
      // Línea 1: inicio del tramo. Línea 2: actividad y fin; el campo en edición va entre corchetes.
      const a = MANUAL_TOKEN[s.draft.activity];
      const p = zonedParts(s.draft.end, tz);
      const date = `${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')}`;
      const hh = String(p.hour).padStart(2, '0');
      const mm = String(p.minute).padStart(2, '0');
      const line2 =
        s.field === 'activity' ? `[${a}] ${date} ${hh}:${mm}` : s.field === 'hour' ? ` ${a}  ${date} [${hh}]:${mm}` : ` ${a}  ${date} ${hh}:[${mm}]`;
      return view(`{M}  ${short(s.draft.start, tz)}`, line2);
    }
    case 'MANUAL_CONFIRM':
      return view('{M}¿Confirmar?', s.yes ? '   [SÍ]      no' : '    sí     [NO]');
    case 'COUNTRY': {
      const c = COUNTRIES[s.index]!;
      const title = s.purpose === 'start' ? '{L}País de inicio' : s.purpose === 'prev-end' ? '{M}País fin jornada' : '{L}País de fin';
      return view(title, `▸ ${c.code.padEnd(3)}${c.name}`);
    }
  }
}
