import { describe, expect, it } from 'vitest';
import { advanceClockTo, createClock, setSpeed, tickClock } from './clock';
import { HOUR, MINUTE } from './units';

const start = Date.UTC(2026, 10, 2, 5);
const end = start + 14 * 24 * HOUR;

describe('reloj virtual', () => {
  it('en pausa no avanza', () => {
    const c = createClock(start, end);
    expect(tickClock(c, 1000).now).toBe(start);
  });

  it('×60 avanza un minuto por segundo real', () => {
    const c = setSpeed(createClock(start, end), 60);
    expect(tickClock(c, 1000).now).toBe(start + MINUTE);
  });

  it('no pierde precisión con muchos ticks fraccionarios', () => {
    let c = setSpeed(createClock(start, end), 30);
    for (let i = 0; i < 6000; i++) c = tickClock(c, 16.6667);
    // 6000 * 16.6667 ms * 30 = 3 000 003 ms
    expect(c.now - start).toBe(Math.floor(6000 * 16.6667 * 30));
  });

  it('nunca retrocede ni supera el final del escenario', () => {
    const c = createClock(start, end);
    expect(advanceClockTo(c, start - HOUR).now).toBe(start);
    const done = advanceClockTo(setSpeed(c, 60), end + HOUR);
    expect(done.now).toBe(end);
    expect(done.speed).toBe(0);
  });
});
