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

/** Ajusta el final de un segmento en pasos de 15 min dentro de (inicio, inserción]. */
export function stepManualEnd(draft: ManualDraftSegment, dir: 1 | -1, limit: EpochMs): EpochMs {
  const min = Math.min(draft.start + MANUAL_STEP, limit);
  const next = draft.end + dir * MANUAL_STEP;
  return Math.min(Math.max(next, min), limit);
}

export function newDraft(start: EpochMs, limit: EpochMs): ManualDraftSegment {
  return { activity: 'REST', start, end: limit };
}
