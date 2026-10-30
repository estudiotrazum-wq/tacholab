import { N_ } from '@/i18n';
import type { Activity } from '@/shared/types';
import { createInitialSim, type SimState } from '@/simulator/state';
import { REFERENCE_ANCHOR } from '@/scenarios/scenario';
import { buildEvents, type Step } from '@/scenarios/builder';
import { advanceClockTo } from '@/time-engine/clock';
import { driverEvents, eventDuration } from '@/time-engine/timeline';
import { HOUR, MINUTE } from '@/time-engine/units';

export const DRIVER = 'card-a';

/** Simulación base de un ejercicio (escenario propio, reloj el lunes a las 06:00 UTC). */
export function exerciseSim(id: string, title: string): SimState {
  const base = createInitialSim(REFERENCE_ANCHOR);
  return { ...base, scenario: { ...base.scenario, id: `ex-${id}`, title, libraryId: `exercise:${id}` } };
}

/** Con la tarjeta ya insertada y el procedimiento de inserción completado a las 06:00 UTC. */
export function withCardInserted(sim: SimState, steps: Step[] = [], opts: { moving?: boolean } = {}): SimState {
  const start = sim.scenario.startsAt;
  const built = buildEvents(steps, start, { driverId: DRIVER, scenarioId: sim.scenario.id, openLast: true, idPrefix: 'ex' });
  // Sin actividad previa: descanso en curso desde la inserción (registro abierto, como haría el equipo).
  const events = built.events.length
    ? built.events
    : [{ id: 'ex-0', activity: 'REST' as const, start, end: null, driverId: DRIVER, scenarioId: sim.scenario.id, source: 'device' as const }];
  const last = events[events.length - 1]!;
  const selected = last.activity === 'DRIVING' ? 'WORK' : last.activity;
  return {
    ...sim,
    clock: advanceClockTo(sim.clock, built.end),
    timeline: { events, nextSeq: 1 },
    vehicle: { moving: opts.moving ?? false },
    device: { ...sim.device, insertedCardId: DRIVER, insertedAt: start, selected, screen: { kind: 'STANDARD', page: 0 } },
    log: [
      { id: 1, at: start, kind: 'CARD_IN', text: N_('Tarjeta SIM-ES-0000-A1 insertada'), driverId: DRIVER },
      { id: 2, at: start, kind: 'COUNTRY_START', text: N_('País de inicio: España'), driverId: DRIVER },
    ],
    logSeq: 3,
  };
}

/** Tiempo total registrado de una actividad para la tarjeta del ejercicio. */
export function total(sim: SimState, activity: Activity): number {
  return driverEvents(sim.timeline, DRIVER)
    .filter((e) => e.activity === activity)
    .reduce((a, e) => a + eventDuration(e, sim.clock.now), 0);
}

export { HOUR, MINUTE };
