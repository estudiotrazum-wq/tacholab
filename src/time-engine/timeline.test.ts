import { describe, expect, it } from 'vitest';
import { emptyTimeline, insertManualSegments, openEvent, sumActivities, switchActivity } from './timeline';
import { HOUR, MINUTE } from './units';
import { addZonedDays, startOfZonedDay } from './zoned';

const t0 = Date.UTC(2026, 10, 2, 7);
const D = 'card-a';

describe('línea temporal', () => {
  it('cambiar de actividad cierra el periodo anterior', () => {
    let tl = switchActivity(emptyTimeline(), { activity: 'WORK', driverId: D }, t0, 's');
    tl = switchActivity(tl, { activity: 'DRIVING', driverId: D }, t0 + 30 * MINUTE, 's');
    expect(tl.events).toHaveLength(2);
    expect(tl.events[0]).toMatchObject({ activity: 'WORK', start: t0, end: t0 + 30 * MINUTE });
    expect(openEvent(tl)).toMatchObject({ activity: 'DRIVING', end: null });
  });

  it('elimina periodos de duración cero y fusiona contiguos iguales', () => {
    let tl = switchActivity(emptyTimeline(), { activity: 'WORK', driverId: D }, t0, 's');
    tl = switchActivity(tl, { activity: 'REST', driverId: D }, t0 + HOUR, 's');
    tl = switchActivity(tl, { activity: 'WORK', driverId: D }, t0 + HOUR, 's');
    expect(tl.events).toHaveLength(1);
    expect(tl.events[0]).toMatchObject({ activity: 'WORK', end: null });
  });

  it('la misma actividad no crea un evento nuevo', () => {
    const tl = switchActivity(emptyTimeline(), { activity: 'WORK', driverId: D }, t0, 's');
    expect(switchActivity(tl, { activity: 'WORK', driverId: D }, t0 + HOUR, 's')).toBe(tl);
  });

  it('target null detiene el registro', () => {
    let tl = switchActivity(emptyTimeline(), { activity: 'REST', driverId: D }, t0, 's');
    tl = switchActivity(tl, null, t0 + HOUR, 's');
    expect(openEvent(tl)).toBeNull();
  });

  it('suma recortada que cruza medianoche', () => {
    const tz = 'Europe/Madrid';
    const lateNight = Date.UTC(2026, 10, 2, 22); // 23:00 local
    let tl = switchActivity(emptyTimeline(), { activity: 'DRIVING', driverId: D }, lateNight, 's');
    tl = switchActivity(tl, { activity: 'REST', driverId: D }, lateNight + 2 * HOUR, 's');
    const day1 = startOfZonedDay(lateNight, tz);
    const day2 = addZonedDays(day1, 1, tz);
    const now = lateNight + 3 * HOUR;
    expect(sumActivities(tl.events, day1, day2, now).DRIVING).toBe(HOUR);
    expect(sumActivities(tl.events, day2, addZonedDays(day2, 1, tz), now).DRIVING).toBe(HOUR);
  });

  it('las entradas manuales no pueden solaparse con lo registrado', () => {
    const tl = switchActivity(emptyTimeline(), { activity: 'WORK', driverId: D }, t0, 's');
    expect(() =>
      insertManualSegments(tl, [{ activity: 'REST', start: t0 - HOUR, end: t0 + MINUTE }], D, 's', t0 + HOUR),
    ).toThrow();
    const ok = insertManualSegments(tl, [{ activity: 'REST', start: t0 - HOUR, end: t0 }], D, 's', t0 + HOUR);
    expect(ok.events[0]).toMatchObject({ activity: 'REST', source: 'manual' });
  });
});
