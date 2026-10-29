import type { EpochMs } from '@/shared/types';
import { eventEnd, type ActivityEvent } from '@/time-engine/timeline';
import { MINUTE } from '@/time-engine/units';

/**
 * Regla R561-ART7 (implementación PRELIMINAR, pendiente de validación jurídica):
 * tras 4 h 30 min de conducción, pausa ininterrumpida de 45 min, o bien 15 min
 * seguidos de 30 min distribuidos dentro del periodo.
 *
 * Decisiones pedagógicas documentadas en docs/REGULATIONS.md:
 *  - Solo REST cuenta como pausa (otros trabajos y disponibilidad no).
 *  - Los huecos sin registro (tarjeta ausente sin entrada manual) NO cuentan como pausa.
 *  - Periodos REST contiguos se suman como un único bloque.
 */

export const CONTINUOUS_DRIVING_LIMIT = 270 * MINUTE;
export const CONTINUOUS_DRIVING_PREWARN = 255 * MINUTE;
export const FULL_BREAK = 45 * MINUTE;
export const SPLIT_FIRST = 15 * MINUTE;
export const SPLIT_SECOND = 30 * MINUTE;

export interface ContinuousDrivingStatus {
  /** Conducción acumulada desde la última pausa válida. */
  drivingSinceBreakMs: number;
  /** Se ha tomado la primera fracción (≥15 min) de una pausa fraccionada. */
  splitFirstTaken: boolean;
  /** Duración de la pausa en curso (0 si la actividad actual no es pausa). */
  currentBreakMs: number;
  /** Instante de la última pausa válida completada (null si ninguna). */
  lastValidBreakEnd: EpochMs | null;
  /** Exceso sobre 4 h 30 min en el periodo actual. */
  overrunMs: number;
  /** Instantes en que se superó el límite (uno por periodo de conducción). */
  overruns: EpochMs[];
}

interface Block {
  rest: boolean;
  driving: number;
  start: EpochMs;
  end: EpochMs;
}

function toBlocks(events: readonly ActivityEvent[], now: EpochMs): Block[] {
  const blocks: Block[] = [];
  for (const e of events) {
    const end = eventEnd(e, now);
    if (end <= e.start) continue;
    const rest = e.activity === 'REST';
    const last = blocks[blocks.length - 1];
    if (last && last.rest && rest && last.end === e.start) {
      last.end = end;
      continue;
    }
    // Un hueco temporal rompe la continuidad de una pausa.
    blocks.push({ rest, driving: e.activity === 'DRIVING' ? end - e.start : 0, start: e.start, end });
  }
  return blocks;
}

export function computeContinuousDriving(
  events: readonly ActivityEvent[],
  now: EpochMs,
): ContinuousDrivingStatus {
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const blocks = toBlocks(sorted, now);
  let acc = 0;
  let splitFirst = false;
  let lastValidBreakEnd: EpochMs | null = null;
  const overruns: EpochMs[] = [];
  let overrunRecorded = false;

  blocks.forEach((b, i) => {
    if (!b.rest) {
      if (b.driving > 0) {
        if (!overrunRecorded && acc + b.driving > CONTINUOUS_DRIVING_LIMIT) {
          overruns.push(b.start + (CONTINUOUS_DRIVING_LIMIT - acc));
          overrunRecorded = true;
        }
        acc += b.driving;
      }
      return;
    }
    const d = b.end - b.start;
    const ongoing = i === blocks.length - 1 && b.end === now;
    const valid = d >= FULL_BREAK || (splitFirst && d >= SPLIT_SECOND);
    if (valid) {
      acc = 0;
      splitFirst = false;
      overrunRecorded = false;
      lastValidBreakEnd = ongoing ? null : b.end;
    } else if (d >= SPLIT_FIRST && !ongoing) {
      splitFirst = true;
    }
  });

  const last = blocks[blocks.length - 1];
  const currentBreakMs = last && last.rest && last.end === now ? last.end - last.start : 0;
  // Si la pausa en curso ya supera 15 min, se considera tomada la primera fracción al terminarla.
  return {
    drivingSinceBreakMs: acc,
    splitFirstTaken: splitFirst,
    currentBreakMs,
    lastValidBreakEnd,
    overrunMs: Math.max(0, acc - CONTINUOUS_DRIVING_LIMIT),
    overruns,
  };
}

/** Minutos de pausa que faltan para que la pausa en curso sea válida. */
export function breakRemainingMs(status: ContinuousDrivingStatus): number {
  if (status.drivingSinceBreakMs === 0 && status.currentBreakMs > 0) return 0;
  const needed = status.splitFirstTaken ? SPLIT_SECOND : FULL_BREAK;
  return Math.max(0, needed - status.currentBreakMs);
}
