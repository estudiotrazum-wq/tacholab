import type { EpochMs } from '@/shared/types';
import { HOUR } from './units';

/**
 * Utilidades de zona horaria basadas en Intl (sin dependencias).
 * Internamente todo es UTC; la zona horaria solo se usa para presentar y para
 * determinar límites de día/semana locales. Gestiona cambios de horario de verano.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 1 = lunes … 7 = domingo (ISO 8601). */
  isoWeekday: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function zonedParts(ms: EpochMs, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return {
    year,
    month,
    day,
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
    isoWeekday: utcDay === 0 ? 7 : utcDay,
  };
}

/** Desfase de la zona respecto a UTC en el instante dado (ms). Madrid invierno = +1 h. */
export function tzOffsetMs(ms: EpochMs, timeZone: string): number {
  const floored = Math.floor(ms / 1000) * 1000;
  const p = zonedParts(floored, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - floored;
}

export interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
}

/**
 * Convierte una fecha-hora local de pared a UTC. Si la hora no existe (salto de
 * primavera) se desplaza hacia delante; si es ambigua (otoño) se toma la primera.
 */
export function zonedToUtc(local: LocalDateTime, timeZone: string): EpochMs {
  const wall = Date.UTC(local.year, local.month - 1, local.day, local.hour ?? 0, local.minute ?? 0);
  // Probar los desfases vigentes alrededor de ese instante y quedarnos con el primero que encaje.
  const candidates = [tzOffsetMs(wall - 12 * HOUR, timeZone), tzOffsetMs(wall + 12 * HOUR, timeZone)];
  const matches = candidates
    .map((off) => wall - off)
    .filter((utc) => tzOffsetMs(utc, timeZone) === wall - utc)
    .sort((a, b) => a - b);
  if (matches.length > 0) return matches[0]!;
  // Hora inexistente: usar el desfase previo al cambio (resultado posterior en hora de pared).
  return wall - candidates[0]!;
}

export function startOfZonedDay(ms: EpochMs, timeZone: string): EpochMs {
  const p = zonedParts(ms, timeZone);
  return zonedToUtc({ year: p.year, month: p.month, day: p.day }, timeZone);
}

/** Inicio del día local desplazado n días (respeta días de 23 h y 25 h). */
export function addZonedDays(ms: EpochMs, days: number, timeZone: string): EpochMs {
  const p = zonedParts(ms, timeZone);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return zonedToUtc({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }, timeZone);
}

/** Lunes 00:00 local de la semana que contiene ms. */
export function startOfZonedWeek(ms: EpochMs, timeZone: string): EpochMs {
  const p = zonedParts(ms, timeZone);
  return addZonedDays(startOfZonedDay(ms, timeZone), -(p.isoWeekday - 1), timeZone);
}

const pad = (n: number) => n.toString().padStart(2, '0');

export function formatTime(ms: EpochMs, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDate(ms: EpochMs, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  return `${pad(p.day)}/${pad(p.month)}/${p.year}`;
}

export function formatDateTime(ms: EpochMs, timeZone: string): string {
  return `${formatDate(ms, timeZone)} ${formatTime(ms, timeZone)}`;
}

const WEEKDAYS_ES = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export function formatWeekday(ms: EpochMs, timeZone: string): string {
  return WEEKDAYS_ES[zonedParts(ms, timeZone).isoWeekday] ?? '';
}

/** Valor para <input type="datetime-local"> en la zona indicada. */
export function toDateTimeLocalValue(ms: EpochMs, timeZone: string): string {
  const p = zonedParts(ms, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function fromDateTimeLocalValue(value: string, timeZone: string): EpochMs | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return zonedToUtc(
    { year: +m[1]!, month: +m[2]!, day: +m[3]!, hour: +m[4]!, minute: +m[5]! },
    timeZone,
  );
}
