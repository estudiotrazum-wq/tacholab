import type { Activity, EpochMs } from '@/shared/types';

/**
 * Línea temporal de actividades: única fuente de verdad para todos los cálculos.
 * Los contadores de pantalla se derivan siempre de aquí.
 */

export type EventSource = 'device' | 'manual';

export interface ActivityEvent {
  id: string;
  activity: Activity;
  start: EpochMs;
  /** null = periodo en curso (termina en el instante actual del reloj). */
  end: EpochMs | null;
  /** Conductor ficticio; null = registrado sin tarjeta (memoria del vehículo). */
  driverId: string | null;
  scenarioId: string;
  source: EventSource;
  meta?: Record<string, string>;
}

export interface Timeline {
  events: ActivityEvent[];
  nextSeq: number;
}

export interface ActivityTarget {
  activity: Activity;
  driverId: string | null;
}

export function emptyTimeline(): Timeline {
  return { events: [], nextSeq: 1 };
}

export function eventEnd(e: ActivityEvent, now: EpochMs): EpochMs {
  return e.end ?? now;
}

export function eventDuration(e: ActivityEvent, now: EpochMs): number {
  return Math.max(0, eventEnd(e, now) - e.start);
}

export function openEvent(tl: Timeline): ActivityEvent | null {
  for (let i = tl.events.length - 1; i >= 0; i--) {
    const e = tl.events[i]!;
    if (e.end === null) return e;
  }
  return null;
}

/**
 * Cambia la actividad registrada en el instante `at`. Cierra el periodo abierto,
 * elimina periodos de duración cero y fusiona con el anterior si es idéntico y contiguo.
 * target = null detiene el registro (p. ej. tarjeta retirada y vehículo parado).
 */
export function switchActivity(
  tl: Timeline,
  target: ActivityTarget | null,
  at: EpochMs,
  scenarioId: string,
): Timeline {
  const open = openEvent(tl);
  if (open && target && open.activity === target.activity && open.driverId === target.driverId) {
    return tl;
  }
  if (!open && !target) return tl;

  let events = tl.events;
  if (open) {
    events =
      at <= open.start
        ? events.filter((e) => e.id !== open.id)
        : events.map((e) => (e.id === open.id ? { ...e, end: at } : e));
  }
  if (!target) return { ...tl, events };

  const prev = [...events].reverse().find((e) => e.driverId === target.driverId && e.source === 'device');
  if (prev && prev.end === at && prev.activity === target.activity) {
    return { ...tl, events: events.map((e) => (e.id === prev.id ? { ...e, end: null } : e)) };
  }
  const ev: ActivityEvent = {
    id: `ev-${tl.nextSeq}`,
    activity: target.activity,
    start: at,
    end: null,
    driverId: target.driverId,
    scenarioId,
    source: 'device',
  };
  return { events: [...events, ev], nextSeq: tl.nextSeq + 1 };
}

export interface ManualSegment {
  activity: Activity;
  start: EpochMs;
  end: EpochMs;
}

/**
 * Inserta periodos introducidos manualmente para un conductor. Rechaza solapes
 * con periodos ya registrados de ese conductor.
 */
export function insertManualSegments(
  tl: Timeline,
  segments: ManualSegment[],
  driverId: string,
  scenarioId: string,
  now: EpochMs,
): Timeline {
  const existing = tl.events.filter((e) => e.driverId === driverId);
  for (const s of segments) {
    if (s.end <= s.start) throw new Error('Segmento manual con duración no positiva');
    for (const e of existing) {
      if (s.start < eventEnd(e, now) && e.start < s.end) {
        throw new Error('El segmento manual se solapa con actividad registrada');
      }
    }
  }
  let seq = tl.nextSeq;
  const added: ActivityEvent[] = segments.map((s) => ({
    id: `ev-${seq++}`,
    activity: s.activity,
    start: s.start,
    end: s.end,
    driverId,
    scenarioId,
    source: 'manual',
  }));
  const events = [...tl.events, ...added].sort((a, b) => a.start - b.start);
  return { events, nextSeq: seq };
}

/** Eventos de un conductor, ordenados por inicio. */
export function driverEvents(tl: Timeline, driverId: string): ActivityEvent[] {
  return tl.events.filter((e) => e.driverId === driverId).sort((a, b) => a.start - b.start);
}

/** Duración del evento recortada a la ventana [from, to). */
export function clippedDuration(e: ActivityEvent, from: EpochMs, to: EpochMs, now: EpochMs): number {
  const s = Math.max(e.start, from);
  const en = Math.min(eventEnd(e, now), to, now);
  return Math.max(0, en - s);
}

export type ActivityTotals = Record<Activity, number>;

export function zeroTotals(): ActivityTotals {
  return { DRIVING: 0, WORK: 0, AVAILABILITY: 0, REST: 0 };
}

export function sumActivities(
  events: readonly ActivityEvent[],
  from: EpochMs,
  to: EpochMs,
  now: EpochMs,
): ActivityTotals {
  const totals = zeroTotals();
  for (const e of events) totals[e.activity] += clippedDuration(e, from, to, now);
  return totals;
}

export function eventsInRange(
  events: readonly ActivityEvent[],
  from: EpochMs,
  to: EpochMs,
  now: EpochMs,
): ActivityEvent[] {
  return events.filter((e) => e.start < to && eventEnd(e, now) > from);
}
