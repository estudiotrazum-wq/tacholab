import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/types';
import type { ActivityEvent } from '@/time-engine/timeline';
import { MINUTE } from '@/time-engine/units';
import { breakRemainingMs, computeContinuousDriving } from './continuousDriving';

const t0 = Date.UTC(2026, 10, 2, 6);

/** Construye eventos contiguos a partir de [actividad, minutos]. */
function seq(...parts: [Activity, number][]): { events: ActivityEvent[]; end: number } {
  let t = t0;
  const events = parts.map(([activity, min], i) => {
    const e: ActivityEvent = { id: `e${i}`, activity, start: t, end: t + min * MINUTE, driverId: 'd', scenarioId: 's', source: 'device' };
    t += min * MINUTE;
    return e;
  });
  return { events, end: t };
}

const contMin = (...p: [Activity, number][]) => {
  const { events, end } = seq(...p);
  return computeContinuousDriving(events, end).drivingSinceBreakMs / MINUTE;
};

describe('R561-ART7 conducción continua (preliminar)', () => {
  it('acumula conducción', () => {
    expect(contMin(['DRIVING', 120], ['DRIVING', 60])).toBe(180);
  });
  it('una pausa de 45 min reinicia', () => {
    expect(contMin(['DRIVING', 270], ['REST', 45], ['DRIVING', 30])).toBe(30);
  });
  it('44 min no reinicia', () => {
    expect(contMin(['DRIVING', 200], ['REST', 44], ['DRIVING', 30])).toBe(230);
  });
  it('15 + 30 reinicia', () => {
    expect(contMin(['DRIVING', 120], ['REST', 15], ['DRIVING', 120], ['REST', 30], ['DRIVING', 10])).toBe(10);
  });
  it('30 + 15 NO reinicia (orden inválido)', () => {
    // 30 cuenta como primera fracción (≥15) pero 15 no basta como segunda (<30).
    expect(contMin(['DRIVING', 120], ['REST', 30], ['DRIVING', 120], ['REST', 15], ['DRIVING', 10])).toBe(250);
  });
  it('otros trabajos y disponibilidad no son pausa', () => {
    expect(contMin(['DRIVING', 200], ['WORK', 60], ['AVAILABILITY', 60], ['DRIVING', 30])).toBe(230);
  });
  it('pausas contiguas registradas por separado se suman', () => {
    expect(contMin(['DRIVING', 200], ['REST', 20], ['REST', 25], ['DRIVING', 10])).toBe(10);
  });
  it('registra el instante de exceso de 4 h 30', () => {
    const { events, end } = seq(['DRIVING', 300]);
    const st = computeContinuousDriving(events, end);
    expect(st.overrunMs).toBe(30 * MINUTE);
    expect(st.overruns).toEqual([t0 + 270 * MINUTE]);
  });
  it('pausa en curso: minutos restantes', () => {
    const { events } = seq(['DRIVING', 200], ['REST', 20]);
    events[1]!.end = null;
    const st = computeContinuousDriving(events, t0 + 220 * MINUTE);
    expect(st.currentBreakMs).toBe(20 * MINUTE);
    expect(breakRemainingMs(st)).toBe(25 * MINUTE);
  });
});
