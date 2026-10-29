import { describe, expect, it } from 'vitest';
import type { Activity } from '@/shared/types';
import type { ActivityEvent } from '@/time-engine/timeline';
import { HOUR, MINUTE } from '@/time-engine/units';
import { createFreeScenario, REFERENCE_ANCHOR } from '@/scenarios/scenario';
import { analyzeCompliance, type ComplianceReport } from './compliance';

const sc = createFreeScenario(REFERENCE_ANCHOR); // lunes 02/11/2026 00:00 UTC; reloj a las 06:00 UTC
const ctx = { startsAt: sc.startsAt, weekOneStart: sc.weekOneStart, endsAt: sc.endsAt, timeZone: sc.timeZone };

type Step = [Activity, number]; // [actividad, minutos]
const D = (m: number): Step => ['DRIVING', m];
const W = (m: number): Step => ['WORK', m];
const R = (m: number): Step => ['REST', m];
const Rh = (hours: number): Step => ['REST', hours * 60];

/** Jornada típica de 9 h de conducción con pausa de 45 min. */
const day9 = (): Step[] => [W(15), D(270), R(45), D(270), W(15)];
/** Jornada de 10 h de conducción (ampliación). */
const day10 = (): Step[] => [W(15), D(270), R(45), D(270), R(45), D(60), W(15)];

function build(steps: Step[], start = sc.startsAt, openLast = false): { events: ActivityEvent[]; end: number } {
  let t = start;
  const events = steps.map(([activity, min], i) => {
    const e: ActivityEvent = { id: `e${i}`, activity, start: t, end: t + min * MINUTE, driverId: 'd', scenarioId: 's', source: 'device' };
    t += min * MINUTE;
    return e;
  });
  if (openLast && events.length) events[events.length - 1]!.end = null;
  return { events, end: t };
}

function analyze(steps: Step[], opts: { now?: number; openLast?: boolean } = {}): ComplianceReport {
  const { events, end } = build(steps, sc.startsAt, opts.openLast);
  return analyzeCompliance(events, opts.now ?? end, ctx);
}
const ids = (r: ComplianceReport) => r.findings.filter((f) => f.severity === 'infringement').map((f) => f.ruleId);
/** Hasta la hora de inicio de la jornada siguiente (06:00 + desfase) con descanso. */
const restUntilNextDay = (dayMinutes: number, startOffsetMin = 0): Step => R(24 * 60 - dayMinutes + startOffsetMin);
const minutes = (steps: Step[]) => steps.reduce((a, [, m]) => a + m, 0);

describe('conducción diaria (art. 6.1)', () => {
  it('9 h no es ampliación; el tiempo diario no se reinicia a medianoche', () => {
    // Jornada nocturna: empieza a las 18:00 y cruza la medianoche con 9 h de conducción.
    const r = analyze([R(12 * 60), ...day9(), Rh(11)]);
    const p = r.periods.find((x) => x.drivingMs > 0)!;
    expect(p.drivingMs).toBe(9 * HOUR);
    expect(p.extended).toBe(false);
    expect(ids(r)).toEqual([]);
  });

  it('dos ampliaciones a 10 h en la semana son válidas; la tercera es infracción', () => {
    const d = day10();
    const r2 = analyze([...d, restUntilNextDay(minutes(d)), ...d, restUntilNextDay(minutes(d))]);
    expect(r2.weeks[0]!.extensions).toBe(2);
    expect(ids(r2)).toEqual([]);
    const r3 = analyze([...d, restUntilNextDay(minutes(d)), ...d, restUntilNextDay(minutes(d)), ...d, Rh(11)]);
    expect(ids(r3)).toEqual(['R561-ART6-DAILY10']);
  });

  it('más de 10 h de conducción diaria es infracción, con el instante exacto', () => {
    const r = analyze([D(270), R(45), D(270), R(45), D(90), Rh(11)]);
    const f = r.findings.find((x) => x.title.includes('superior a 10 h'))!;
    expect(f.at).toBe(sc.startsAt + (270 + 45 + 270 + 45 + 60) * MINUTE);
  });
});

describe('descanso diario (arts. 4 g y 8.2)', () => {
  it('11 h = normal; 9 h 30 = reducido; 3 + 9 = fraccionado normal', () => {
    const normal = analyze([...day9(), Rh(11)]);
    expect(normal.periods[0]!.closing?.kind).toBe('NORMAL');
    const reduced = analyze([...day9(), R(570)]);
    expect(reduced.periods[0]!.closing?.kind).toBe('REDUCED');
    const split = analyze([W(15), D(270), Rh(3), D(270), Rh(9)]);
    expect(split.periods[0]!.closing?.kind).toBe('SPLIT');
    expect(ids(split)).toEqual([]);
  });

  it('orden invertido 9 + 3: el bloque de 9 h es un descanso diario reducido', () => {
    const r = analyze([W(15), D(270), Rh(9), D(270), Rh(3)]);
    expect(r.periods[0]!.closing?.kind).toBe('REDUCED');
  });

  it('ventana de 24 h: solo cuenta la parte del descanso dentro de la ventana', () => {
    // Jornada de 15 h → quedan 9 h dentro de la ventana: reducido aunque descanse 11 h.
    const long = analyze([W(60), D(270), R(45), D(270), W(4 * 60 + 15), Rh(11)]);
    expect(long.periods[0]!.closing?.kind).toBe('REDUCED');
    // Jornada de 16 h → solo 8 h dentro: infracción.
    const tooLong = analyze([W(120), D(270), R(45), D(270), W(4 * 60 + 15), Rh(11)]);
    expect(ids(tooLong)).toContain('R561-ART8-24H');
  });

  it('un hueco sin registro no es descanso', () => {
    const { events } = build([...day9()]);
    const back = events[events.length - 1]!.end! + 12 * HOUR; // 12 h sin tarjeta ni entrada manual
    const after = build([W(30)], back).events;
    const r = analyzeCompliance([...events, ...after], back + 30 * MINUTE, ctx);
    expect(ids(r)).toContain('R561-ART8-24H');
  });

  it('más de tres descansos diarios reducidos entre descansos semanales', () => {
    // Jornada de 15 h + descanso de 10 h: solo 9 h caen dentro de la ventana de 24 h → reducido.
    const red: Step[] = [W(15), D(270), R(45), D(270), W(4 * 60 + 15), R(10 * 60)];
    const r3 = analyze([...red, ...red, ...red]);
    expect(ids(r3)).toEqual([]);
    expect(r3.current.reducedDailySinceWeekly).toBe(3);
    const r4 = analyze([...red, ...red, ...red, ...red]);
    expect(ids(r4)).toEqual(['R561-ART8-DR9']);
  });

  it('jornada en curso: obligación pendiente con hora límite de inicio del descanso', () => {
    const r = analyze([W(60), D(120)], { openLast: true });
    const o = r.obligations.find((x) => x.ruleId === 'R561-ART8-24H')!;
    expect(o.status).toBe('pending');
    expect(o.dueAt).toBe(sc.startsAt + 15 * HOUR);
    expect(r.current.dailyRestStartBy).toEqual({ normal: sc.startsAt + 13 * HOUR, reduced: sc.startsAt + 15 * HOUR });
  });
});

describe('conducción semanal y bisemanal (art. 6.2 y 6.3)', () => {
  it('más de 56 h en una semana', () => {
    const d = day10();
    const steps: Step[] = [];
    for (let i = 0; i < 6; i++) steps.push(...d, restUntilNextDay(minutes(d)));
    const r = analyze(steps); // 6 × 10 h = 60 h, además 4 ampliaciones
    expect(r.weeks[0]!.drivingMs).toBe(60 * HOUR);
    expect(ids(r)).toContain('R561-ART6-WEEKLY56');
  });
});

describe('descanso semanal y compensación (art. 8.6, 8.6 ter, 8.7)', () => {
  it('debe empezar antes de seis periodos de 24 h', () => {
    const d = day9();
    const steps: Step[] = [];
    for (let i = 0; i < 7; i++) steps.push(...d, restUntilNextDay(minutes(d)));
    const r = analyze(steps);
    expect(ids(r)).toContain('R561-ART8-6DAYS');
  });

  it('descanso semanal reducido genera compensación con fecha límite fuera del horizonte', () => {
    const d = day9();
    const steps: Step[] = [];
    for (let i = 0; i < 5; i++) steps.push(...d, restUntilNextDay(minutes(d)));
    steps.push(...d, Rh(30));
    const r = analyze(steps);
    const weekly = r.weeklyRests[0]!;
    expect(weekly.normal).toBe(false);
    const comp = r.obligations.find((o) => o.ruleId === 'R561-ART8-COMP')!;
    expect(comp.owedMs).toBe(15 * HOUR);
    expect(comp.status).toBe('pending');
    // Semana del reducido + 3 semanas → lunes 30/11/2026 00:00 UTC, después del fin del escenario.
    expect(comp.dueAt).toBe(Date.UTC(2026, 10, 30));
    expect(comp.dueAt).toBeGreaterThan(sc.endsAt);
    expect(comp.detail).toMatch(/pendiente aunque termine la simulación/);
  });

  it('la compensación se cumple unida a un descanso semanal normal más largo', () => {
    const d = day9();
    const steps: Step[] = [];
    for (let i = 0; i < 5; i++) steps.push(...d, restUntilNextDay(minutes(d)));
    steps.push(...d, Rh(30), ...d, Rh(11), ...d, Rh(60));
    const comp = analyze(steps).obligations.find((o) => o.ruleId === 'R561-ART8-COMP')!;
    expect(comp.status).toBe('fulfilled');
  });
});

describe('escenario formativo de referencia: 56 h + 34 h = 90 h', () => {
  /**
   * Semana 1 (lun–sáb): 4 jornadas de 9 h + 2 de 10 h = 56 h, inicio 06:00 UTC, descansos diarios ≥ 11 h.
   * Descanso semanal normal del sábado 16:15 al lunes 13:30 (45 h 15 min).
   * Semana 2: 9 + 9 + 9 + 7 = 34 h y descanso semanal normal hasta el final.
   */
  function reference(): Step[] {
    const steps: Step[] = [];
    const days = [day10(), day9(), day10(), day9(), day9(), day9()];
    days.forEach((d, i) => {
      steps.push(...d);
      if (i < days.length - 1) steps.push(restUntilNextDay(minutes(d)));
    });
    // Sábado termina a las 16:15; descanso hasta el lunes 13:30 UTC.
    const satStart = sc.startsAt + 5 * 24 * HOUR;
    const satEnd = satStart + minutes(days[5]!) * MINUTE;
    const monday13 = sc.weekOneStart + 7 * 24 * HOUR + 13.5 * HOUR;
    steps.push(R((monday13 - satEnd) / MINUTE));
    const day7: Step[] = [W(15), D(270), R(45), D(150), W(15)];
    const w2 = [day9(), day9(), day9(), day7];
    w2.forEach((d, i) => {
      steps.push(...d);
      steps.push(i < w2.length - 1 ? restUntilNextDay(minutes(d)) : R(0));
    });
    return steps.filter(([, m]) => m > 0);
  }

  it('es coherente: 56 h + 34 h, sin infracciones y sin obligaciones vencidas', () => {
    const steps = reference();
    const { events, end } = build(steps);
    // Descanso hasta el final del escenario
    const finalRest: ActivityEvent = { id: 'fin', activity: 'REST', start: end, end: sc.endsAt, driverId: 'd', scenarioId: 's', source: 'device' };
    const r = analyzeCompliance([...events, finalRest], sc.endsAt, ctx);
    expect(r.weeks.map((w) => w.drivingMs / HOUR)).toEqual([56, 34]);
    expect(r.weeks[0]!.extensions).toBe(2);
    expect(r.findings.filter((f) => f.severity !== 'info')).toEqual([]);
    expect(r.weeklyRests.filter((w) => w.normal)).toHaveLength(2);
    expect(r.obligations.filter((o) => o.status === 'overdue')).toEqual([]);
  });

  it('una hora más de conducción en la semana 2 supera las 90 h', () => {
    const steps = reference();
    const i = steps.map(([a]) => a).lastIndexOf('DRIVING');
    steps[i] = D(steps[i]![1] + 60);
    const { events, end } = build(steps);
    const r = analyzeCompliance(events, end, ctx);
    expect(ids(r)).toContain('R561-ART6-BIWEEKLY90');
  });
});
