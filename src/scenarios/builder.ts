import type { Activity, EpochMs } from '@/shared/types';
import type { ActivityEvent } from '@/time-engine/timeline';
import { MINUTE } from '@/time-engine/units';

/**
 * Pequeño lenguaje para construir calendarios de actividad coherentes:
 * secuencias de [actividad, minutos] encadenadas sin huecos.
 */
export type Step = readonly [Activity, number];

export const D = (m: number): Step => ['DRIVING', m];
export const W = (m: number): Step => ['WORK', m];
export const A = (m: number): Step => ['AVAILABILITY', m];
export const R = (m: number): Step => ['REST', m];
export const Rh = (hours: number): Step => ['REST', hours * 60];

/** Jornada de 9 h de conducción: comprobaciones, 4 h 30, pausa de 45 min, 4 h 30, descarga. Dura 10 h 15 min. */
export const day9 = (): Step[] => [W(15), D(270), R(45), D(270), W(15)];
/** Jornada de 10 h de conducción (ampliación) con dos pausas de 45 min. Dura 12 h. */
export const day10 = (): Step[] => [W(15), D(270), R(45), D(270), R(45), D(60), W(15)];
/** Jornada corta de 7 h de conducción. */
export const day7 = (): Step[] => [W(15), D(270), R(45), D(150), W(15)];

export const minutes = (steps: readonly Step[]) => steps.reduce((a, [, m]) => a + m, 0);

/** Plan con cursor temporal: añade pasos y rellena con descanso hasta un instante. */
export class SchedulePlan {
  readonly steps: Step[] = [];
  cursor: EpochMs;

  constructor(readonly start: EpochMs) {
    this.cursor = start;
  }

  add(...steps: Step[]): this {
    for (const s of steps) {
      if (s[1] <= 0) continue;
      this.steps.push(s);
      this.cursor += s[1] * MINUTE;
    }
    return this;
  }

  /** Descansa desde el cursor hasta `at` (no hace nada si ya se ha pasado). */
  restUntil(at: EpochMs): this {
    if (at > this.cursor) this.add(R((at - this.cursor) / MINUTE));
    return this;
  }
}

export interface BuildOptions {
  driverId: string;
  scenarioId: string;
  /** El último periodo queda abierto (en curso). */
  openLast?: boolean;
  idPrefix?: string;
}

export function buildEvents(steps: readonly Step[], start: EpochMs, o: BuildOptions): { events: ActivityEvent[]; end: EpochMs } {
  let t = start;
  const events: ActivityEvent[] = [];
  steps.forEach(([activity, min], i) => {
    if (min <= 0) return;
    const prev = events[events.length - 1];
    const end = t + min * MINUTE;
    // Fusiona actividades iguales contiguas, como hace el registro del equipo.
    if (prev && prev.activity === activity && prev.end === t) prev.end = end;
    else events.push({ id: `${o.idPrefix ?? 'b'}-${i}`, activity, start: t, end, driverId: o.driverId, scenarioId: o.scenarioId, source: 'device' });
    t = end;
  });
  if (o.openLast && events.length) events[events.length - 1]!.end = null;
  return { events, end: t };
}
