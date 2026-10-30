import type { Activity, SelectableActivity } from '@/shared/types';
import { complianceFor, deriveSummary, type SimSummary } from '@/simulator/derived';
import type { SimState } from '@/simulator/state';
import { CONTINUOUS_DRIVING_LIMIT } from '@/regulations/continuousDriving';
import { eventDuration, eventsInRange, driverEvents } from '@/time-engine/timeline';
import { formatDuration } from '@/time-engine/units';
import { addZonedDays, formatDate, formatTime, startOfZonedDay, zonedParts } from '@/time-engine/zoned';
import type { WarningCode } from './types';
import { COUNTRIES, MENU, SPAIN_REGIONS, type ManualActivity } from './types';
import { N_, t } from '@/i18n';

/**
 * Pantalla del TL-1: LCD de 2 líneas × 20 caracteres, como los tacógrafos
 * digitales reales. Los pictogramas normalizados se codifican en el texto con
 * fichas que la interfaz sustituye por dibujos:
 *   {D} conducción · {W} otros trabajos · {A} disponibilidad · {R} pausa/descanso
 *   {C} tarjeta · {L} hora local · {U} hora UTC · {?} actividad desconocida · {M} entrada manual
 *   {O} modo operativo · {F} transbordador/tren · {X} fuera de ámbito
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

const TOKEN = /\{[DWARCLU?MOFX]\}/g;

/** Longitud visible (cada ficha cuenta como una celda). */
export function lcdLength(s: string): number {
  return s.replace(TOKEN, '#').length;
}

/** Ajusta a 20 celdas: recorta o rellena con espacios. */
export function fit(s: string): string {
  let out = '';
  let n = 0;
  for (const part of s.split(/(\{[DWARCLU?MOFX]\})/)) {
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
  const map: Record<string, string> = { '{D}': '◉', '{W}': '⚒', '{A}': '◪', '{R}': '▬', '{C}': '▣', '{L}': '⊙', '{U}': 'U', '{?}': '?', '{M}': 'M', '{O}': '⛟', '{F}': '⛴', '{X}': 'Ø' };
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

/** Textos de los avisos en pantalla (máximo 20 columnas en cada idioma). */
const WARNING_TEXT: Record<WarningCode, [string, string]> = {
  CONT_DRIVING_PREWARN: [N_('!{D} 4h15 PAUSA'), N_('próxima pausa')],
  CONT_DRIVING_EXCEEDED: ['!{D} 4h30', N_('pausa ahora')],
  DRIVING_WITHOUT_CARD: [N_('!{C} sin tarjeta'), N_('conducción')],
  DAILY_DRIVING_PREWARN: [N_('!{D} jornada'), N_('faltan 15 min')],
  DAILY_EXTENSION: [N_('i {D} ampliación'), N_('a 10h en uso')],
  DAILY_DRIVING_EXCEEDED: [N_('!{D} límite diario'), N_('detenga el vehículo')],
  WEEKLY_DRIVING_PREWARN: [N_('!{D} semana 55h'), N_('límite 56h')],
  WEEKLY_DRIVING_EXCEEDED: [N_('!{D} semana 56h'), N_('límite alcanzado')],
  BIWEEKLY_DRIVING_PREWARN: [N_('!{D} 2 semanas 89h'), N_('límite 90h')],
  BIWEEKLY_DRIVING_EXCEEDED: [N_('!{D} 2 semanas 90h'), N_('límite alcanzado')],
  DAILY_REST_DUE: [N_('!{R} descanso diario'), N_('iniciar ahora')],
  DAILY_REST_LAST_CALL: [N_('!{R} descanso diario'), N_('fuera de plazo')],
  WEEKLY_REST_DUE: [N_('!{R} desc. semanal'), N_('pendiente')],
};

export function ticketLines(sim: SimState, sum: SimSummary): string[] {
  const tz = sim.scenario.timeZone;
  const card = sim.cards[sum.driverId ?? ''];
  const now = sim.clock.now;
  return [
    `${card?.holderName ?? '—'}`,
    `${card?.displayId ?? ''}`,
    t('Día {date} (UTC)', { date: formatDate(now, tz) }),
    t('Conducción  {d}', { d: formatDuration(sum.today.DRIVING) }),
    t('Otros trab. {d}', { d: formatDuration(sum.today.WORK) }),
    t('Disponib.   {d}', { d: formatDuration(sum.today.AVAILABILITY) }),
    t('Descanso    {d}', { d: formatDuration(sum.today.REST) }),
    t('Cont. {d} / 4:30', { d: formatDuration(sum.continuous?.drivingSinceBreakMs ?? 0) }),
    t('Jornada: {d} cond.', { d: formatDuration(complianceFor(sim, sum.driverId)?.current.dailyDrivingMs ?? 0) }),
    t('Semana {n}: {d}', { n: sum.weekIndex, d: formatDuration(sum.week.DRIVING) }),
    t('2 semanas: {d}', { d: formatDuration(sum.twoWeeks.DRIVING) }),
    t('— Simulador educativo —'),
  ];
}

/** Ticket completo de la impresión diaria (cabecera + resumen), o null si no hay tarjeta. */
export function printoutLines(sim: SimState): string[] | null {
  const sum = deriveSummary(sim);
  if (!sum.driverId) return null;
  return [`TL-1 EDU · ${formatDate(sim.clock.now, sim.scenario.timeZone)} ${formatTime(sim.clock.now, sim.scenario.timeZone)} UTC`, t('IMPRESIÓN DIARIA (24 h)'), '────────────────────', ...ticketLines(sim, sum)];
}

/** Duración de la actividad actual del conductor (desde que empezó, uniendo tramos contiguos iguales). */
function currentActivityMs(sim: SimState, driverId: string, now: number): number {
  const evs = driverEvents(sim.timeline, driverId);
  const last = evs[evs.length - 1];
  if (!last || last.end !== null) return 0;
  let start = last.start;
  for (let i = evs.length - 2; i >= 0; i--) {
    const e = evs[i]!;
    if (e.activity !== last.activity || e.end !== start) break;
    start = e.start;
  }
  return Math.max(0, now - start);
}

function short(ms: number, tz: string, year = false): string {
  const p = zonedParts(ms, tz);
  const yy = year ? `.${String(p.year % 100).padStart(2, '0')}` : '';
  return `${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')}${yy} ${formatTime(ms, tz)}`;
}

/** Selector SÍ / NO de la pantalla. */
function yesNo(yes: boolean): string {
  return yes ? t('   [SÍ]      no') : t('    sí     [NO]');
}

/** Lectura del cuentakilómetros con un decimal. */
function odometer(sim: SimState): string {
  return (sim.vehicle.odometerKm ?? 248_310).toFixed(1);
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
    const code = d.warning.code;
    if (code === 'CONT_DRIVING_PREWARN' || code === 'CONT_DRIVING_EXCEEDED') {
      // «1 ¡Pausa!» con la conducción continua y el descanso acumulado del conductor 1
      const c = sum.continuous;
      return view(spread(t('1 ¡Pausa!'), 'OK'), `1{D}${hm(c?.drivingSinceBreakMs ?? 0)} {R}${hm(c?.currentBreakMs ?? 0)}`, 'warning');
    }
    const [a, b] = WARNING_TEXT[code];
    return view(t(a), `${t(b)}`.padEnd(LCD_COLS - 2) + 'OK', 'warning');
  }
  if (d.notice) return { ...base, mode: 'notice', lines: wrap(t(d.notice.text)) };

  const s = d.screen;
  const act = sum.recorded ? ACTIVITY_TOKEN[sum.recorded] : ' ';
  switch (s.kind) {
    case 'STANDARD': {
      if (s.page === 0) {
        // Pantalla estándar (a): hora local, modo de funcionamiento, condición abierta y velocidad;
        // abajo, ranura 1 (tarjeta y actividad), cuentakilómetros y actividad de la ranura 2.
        const cond = d.condition === 'FERRY' ? '{F}' : d.condition === 'OUT' ? '{X}' : '';
        const top = spread(`${formatTime(now, sim.scenario.localTimeZone)}{L} {O}${cond}`, `${speed}km/h`);
        if (!card) return view(top, spread(t(' Inserte tarjeta'), '2 -'));
        return view(top, spread(`1{C}${act}`, `${odometer(sim)}km  -2`));
      }
      if (s.page === 1) {
        // Tiempos del conductor (b), anexo IC req. 160: si conduce, conducción continua y descanso acumulado;
        // si no, duración de la actividad actual y descanso acumulado. Debajo, el segundo conductor.
        if (!card) return view(t(' 1 sin tarjeta'), t(' 2 sin tarjeta'));
        const c = sum.continuous;
        const driving = sum.recorded === 'DRIVING';
        const dur = driving ? (c?.drivingSinceBreakMs ?? 0) : currentActivityMs(sim, d.insertedCardId!, now);
        return view(`1${act}${hm(dur)} {R}${hm(c?.currentBreakMs ?? 0)}`, t(' 2 sin tarjeta'));
      }
      if (s.page === 2) {
        // Tiempo de conducción restante: hasta la pausa obligatoria (art. 7) y hasta el límite diario (art. 6.1).
        if (!cur) return view(t('{D} restante'), t(' Sin tarjeta'));
        const remCont = Math.max(0, CONTINUOUS_DRIVING_LIMIT - (sum.continuous?.drivingSinceBreakMs ?? 0));
        const remDay = Math.max(0, cur.dailyCapMs - cur.dailyDrivingMs);
        return view(spread(t('{D}hasta pausa'), hm(remCont)), spread(t('{D}fin jornada'), hm(remDay)));
      }
      if (s.page === 3) {
        // Amplitud de la jornada (art. 8.2 R. 561/2006): el descanso diario debe caber en las 24 h desde el inicio
        // de la jornada → como máximo 13 h de jornada con descanso normal (11 h) o 15 h con reducido (9 h).
        const by = cur?.dailyRestStartBy;
        if (!cur || !by) return view(t('{R} jornada'), t(' Sin jornada abierta'));
        const left = (at: number) => hm(Math.max(0, at - now));
        return view(spread(t('Jornada 13h'), left(by.normal)), spread(t('Reducida 15h'), by.reduced !== null ? left(by.reduced) : t('agotada')));
      }
      if (s.page === 4) {
        if (!cur) return view(t('{D} acumulados'), t(' Sin tarjeta'));
        return view(t('{D}jorn {d}/{cap}', { d: hm(cur.dailyDrivingMs), cap: hm(cur.dailyCapMs) }), t('sem {w} 2s {b}', { w: hm(cur.weekDrivingMs), b: hm(cur.biweekDrivingMs) }));
      }
      return view(spread(`${formatTime(now, 'UTC')}{U}`, 'UTC'), spread(`${formatTime(now, sim.scenario.localTimeZone)}{L}`, t('local')));
    }
    case 'MENU': {
      const group = MENU[s.index]!;
      return view(spread(t('MENÚ'), `${s.index + 1}/${MENU.length}`), `▸${t(group.label)}`);
    }
    case 'SUBMENU': {
      const group = MENU[s.group]!;
      const item = group.items[s.index]!;
      const label =
        item.id === 'FERRY' ? (d.condition === 'FERRY' ? t('{F}Final ferry/tren') : t('{F}Comienzo ferry/tren'))
        : item.id === 'OUT' ? (d.condition === 'OUT' ? t('{X}Final OUT') : t('{X}Comienzo OUT'))
        : item.id === 'ENTRY_START' ? t('{L}País comienzo')
        : item.id === 'ENTRY_END' ? t('{L}País final')
        : t(item.label);
      return view(spread(t(group.label), group.items.length > 1 ? `${s.index + 1}/${group.items.length}` : ''), `▸${label}`);
    }
    case 'TIMES': {
      const c = sum.continuous;
      return view(t('{D}cont {d} /4h30', { d: hm(c?.drivingSinceBreakMs ?? 0) }), t('disp {a} {R}{b}', { a: hm(cur?.availableDrivingMs ?? 0), b: hm(c?.currentBreakMs ?? 0) }));
    }
    case 'DAY_ACTIVITIES': {
      const dayStart = startOfZonedDay(now, tz);
      const evs = d.insertedCardId ? eventsInRange(driverEvents(sim.timeline, d.insertedCardId), dayStart, addZonedDays(dayStart, 1, tz), now) : [];
      if (evs.length === 0) return view(t('HOY'), t('Sin actividades'));
      const i = Math.min(s.offset, evs.length - 1);
      const e = evs[i]!;
      return view(spread(t('HOY'), `${i + 1}/${evs.length}`), `${formatTime(Math.max(e.start, dayStart), tz)} ${ACTIVITY_TOKEN[e.activity]} ${hm(eventDuration(e, now))}${e.source === 'manual' ? ' {M}' : ''}`);
    }
    case 'TICKET': {
      const rows = ticketLines(sim, sum);
      const i = Math.min(s.offset, rows.length - 1);
      return view(spread(t('RESUMEN'), `${i + 1}/${rows.length}`), rows[i]!);
    }
    case 'DEVICE_INFO':
      return view(t('TL-1 EDU   simulador'), t('NO HOMOLOGADO'));
    case 'WELCOME':
      // Nombre del titular y hora local y UTC (unos segundos, como en los equipos reales)
      return view(`1{C} ${card?.holderName ?? ''}`, spread(`${formatTime(now, sim.scenario.localTimeZone)}{L}`, `${formatTime(now, 'UTC')}UTC`));
    case 'LAST_WITHDRAWAL': {
      // Fin de la jornada anterior: fecha y hora de la última retirada de la tarjeta.
      const last = card?.lastWithdrawalAt;
      // En hora local, como la muestran los equipos
      return view(t('Última retirada'), last != null ? `{C}↑ ${short(last, sim.scenario.localTimeZone, true)}{L}` : t('{C}↑ primer uso'));
    }
    case 'MANUAL_ASK':
      return view(t('¿Entrada manual?'), yesNo(s.yes));
    case 'WITHDRAW_PRINT':
      return view(t('¿Imprimir 24 h?'), yesNo(s.yes));
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
      return view(t('{M}¿Confirmar?'), yesNo(s.yes));
    case 'COUNTRY': {
      const c = COUNTRIES[s.index]!;
      const title = s.purpose === 'start' ? N_('{L}País de inicio') : s.purpose === 'manual-start' ? N_('{M}País comienzo') : s.purpose === 'border' ? N_('{L}País: frontera') : s.purpose === 'entry-start' ? N_('{L}País comienzo') : s.purpose === 'entry-end' ? N_('{L}País final') : N_('{L}País de fin');
      return view(t(title), `▸ ${c.code.padEnd(3)}${t(c.name)}`);
    }
    case 'REGION': {
      const r = SPAIN_REGIONS[s.index]!;
      const title = s.purpose === 'start' ? N_('{L}E Región inicio') : s.purpose === 'manual-start' ? N_('{M}E Región comienzo') : s.purpose === 'border' ? N_('{L}E Región entrada') : s.purpose === 'entry-start' ? N_('{L}E Región comienzo') : s.purpose === 'entry-end' ? N_('{L}E Región final') : N_('{L}E Región de fin');
      return view(t(title), `▸${r.code.padEnd(4)}${t(r.name)}`);
    }
  }
}
