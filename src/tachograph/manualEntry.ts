import type { EpochMs } from '@/shared/types';
import { MINUTE } from '@/time-engine/units';
import { MANUAL_ACTIVITIES, type ManualActivity, type ManualDraftSegment } from './types';

export const MANUAL_STEP = 15 * MINUTE;
export const MIN_MANUAL_GAP = MINUTE;

export function cycleManualActivity(a: ManualActivity, dir: 1 | -1): ManualActivity {
  const i = MANUAL_ACTIVITIES.indexOf(a);
  const n = MANUAL_ACTIVITIES.length;
  return MANUAL_ACTIVITIES[(i + dir + n) % n]!;
}

/** Ajusta el final de un segmento (horas o minutos) dentro de (inicio, inserción]. */
export function stepManualEnd(draft: ManualDraftSegment, dir: 1 | -1, limit: EpochMs, step: number = MANUAL_STEP): EpochMs {
  const min = Math.min(draft.start + MINUTE, limit);
  const next = draft.end + dir * step;
  return Math.min(Math.max(next, min), limit);
}

export const HOUR_STEP = 60 * MINUTE;
export const MINUTE_STEP = MINUTE;

export function newDraft(start: EpochMs, limit: EpochMs): ManualDraftSegment {
  return { activity: 'REST', start, end: limit };
}
