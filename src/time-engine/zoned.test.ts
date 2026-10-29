import { describe, expect, it } from 'vitest';
import { addZonedDays, formatDateTime, fromDateTimeLocalValue, startOfZonedDay, startOfZonedWeek, tzOffsetMs, zonedParts, zonedToUtc } from './zoned';
import { HOUR } from './units';

const TZ = 'Europe/Madrid';

describe('zonas horarias', () => {
  it('desfase de Madrid en invierno y verano', () => {
    expect(tzOffsetMs(Date.UTC(2026, 0, 15, 12), TZ)).toBe(1 * HOUR);
    expect(tzOffsetMs(Date.UTC(2026, 6, 15, 12), TZ)).toBe(2 * HOUR);
  });

  it('medianoche local a UTC', () => {
    expect(zonedToUtc({ year: 2026, month: 11, day: 2 }, TZ)).toBe(Date.UTC(2026, 10, 1, 23));
  });

  it('día de primavera dura 23 h y de otoño 25 h (cambio de horario)', () => {
    const spring = startOfZonedDay(Date.UTC(2026, 2, 29, 12), TZ);
    expect(addZonedDays(spring, 1, TZ) - spring).toBe(23 * HOUR);
    const autumn = startOfZonedDay(Date.UTC(2026, 9, 25, 12), TZ);
    expect(addZonedDays(autumn, 1, TZ) - autumn).toBe(25 * HOUR);
  });

  it('hora inexistente en primavera se desplaza hacia delante', () => {
    const t = zonedToUtc({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, TZ);
    expect(zonedParts(t, TZ).hour).toBe(3);
  });

  it('hora ambigua en otoño toma la primera ocurrencia', () => {
    const t = zonedToUtc({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, TZ);
    expect(t).toBe(Date.UTC(2026, 9, 25, 0, 30));
  });

  it('la semana empieza el lunes 00:00 local', () => {
    const thursday = Date.UTC(2026, 10, 5, 10);
    const w = startOfZonedWeek(thursday, TZ);
    expect(zonedParts(w, TZ)).toMatchObject({ isoWeekday: 1, hour: 0, minute: 0, day: 2 });
    // Domingo 23:30 local sigue en la misma semana
    const sunday = zonedToUtc({ year: 2026, month: 11, day: 8, hour: 23, minute: 30 }, TZ);
    expect(startOfZonedWeek(sunday, TZ)).toBe(w);
  });

  it('ida y vuelta con datetime-local', () => {
    const t = fromDateTimeLocalValue('2026-11-03T14:45', TZ)!;
    expect(formatDateTime(t, TZ)).toBe('03/11/2026 14:45');
  });
});
