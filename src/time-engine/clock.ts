import type { EpochMs } from '@/shared/types';

/** Velocidades de simulación disponibles (0 = pausa). */
export const SPEEDS = [0, 1, 5, 30, 60] as const;
export type Speed = (typeof SPEEDS)[number];

/**
 * Reloj virtual determinista. El tiempo solo avanza: retroceder implica
 * restaurar un punto guardado, como en un dispositivo real.
 */
export interface ClockState {
  now: EpochMs;
  speed: Speed;
  /** Fracción de milisegundo acumulada para no perder precisión con velocidades altas. */
  carryMs: number;
  /** Límites del escenario. */
  startsAt: EpochMs;
  endsAt: EpochMs;
}

export function createClock(startsAt: EpochMs, endsAt: EpochMs): ClockState {
  return { now: startsAt, speed: 0, carryMs: 0, startsAt, endsAt };
}

/** Avanza el reloj según el tiempo real transcurrido y la velocidad actual. */
export function tickClock(clock: ClockState, realDeltaMs: number): ClockState {
  if (clock.speed === 0 || realDeltaMs <= 0) return clock;
  // Redondeo a microsegundos para que el arrastre no acumule error de coma flotante.
  const exact = Math.round((realDeltaMs * clock.speed + clock.carryMs) * 1000) / 1000;
  const whole = Math.floor(exact);
  return advanceClockTo({ ...clock, carryMs: Math.round((exact - whole) * 1000) / 1000 }, clock.now + whole);
}

/** Mueve el reloj hasta target (nunca hacia atrás, nunca más allá del final del escenario). */
export function advanceClockTo(clock: ClockState, target: EpochMs): ClockState {
  const t = Math.min(Math.max(Math.round(target), clock.now), clock.endsAt);
  if (t >= clock.endsAt) return { ...clock, now: clock.endsAt, speed: 0, carryMs: 0 };
  return { ...clock, now: t };
}

export function setSpeed(clock: ClockState, speed: Speed): ClockState {
  if (clock.now >= clock.endsAt) return { ...clock, speed: 0 };
  return { ...clock, speed, carryMs: 0 };
}

export function isFinished(clock: ClockState): boolean {
  return clock.now >= clock.endsAt;
}
