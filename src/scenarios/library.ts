import type { EpochMs } from '@/shared/types';
import type { FeatureKey } from '@/billing/plans';
import type { ComplianceReport } from '@/regulations/compliance';
import { createInitialSim, type SimState } from '@/simulator/state';
import { DAY, HOUR } from '@/time-engine/units';
import { advanceClockTo } from '@/time-engine/clock';
import { buildEvents, D, day10, day7, day9, R, SchedulePlan, W } from './builder';
import { REFERENCE_ANCHOR, type ScenarioMeta } from './scenario';

/** Resultado de un objetivo de escenario. */
export interface ObjectiveResult {
  text: string;
  status: 'done' | 'pending' | 'failed';
}

export interface ScenarioDef {
  id: string;
  title: string;
  summary: string;
  feature: FeatureKey;
  objectives: string[];
  build: () => SimState;
  evaluate?: (report: ComplianceReport, sim: SimState) => ObjectiveResult[];
}

const DRIVER = 'card-a';

/** Crea un estado de simulación con un calendario ya registrado para la tarjeta A. */
function simWith(def: Pick<ScenarioDef, 'id' | 'title'>, plan: SchedulePlan | null, clockAt: (s: ScenarioMeta, planEnd: EpochMs) => EpochMs, openLast: boolean): SimState {
  const base = createInitialSim(REFERENCE_ANCHOR);
  const scenario: ScenarioMeta = { ...base.scenario, id: def.id, title: def.title, libraryId: def.id };
  if (!plan) return { ...base, scenario };
  const { events, end } = buildEvents(plan.steps, plan.start, { driverId: DRIVER, scenarioId: def.id, openLast, idPrefix: def.id });
  const now = clockAt(scenario, end);
  const last = events[events.length - 1]!;
  return {
    ...base,
    scenario,
    clock: advanceClockTo(base.clock, now),
    timeline: { events, nextSeq: 1 },
    device: { ...base.device, insertedCardId: DRIVER, insertedAt: scenario.startsAt, selected: last.activity === 'DRIVING' ? 'WORK' : last.activity },
    log: [
      { id: 1, at: scenario.startsAt, kind: 'CARD_IN', text: 'Tarjeta SIM-ES-0000-A1 insertada', driverId: DRIVER },
      { id: 2, at: now, kind: 'COUNTRY_START', text: `Escenario cargado: ${def.title}`, driverId: DRIVER },
    ],
    logSeq: 3,
  };
}

/** Semana 1 de 56 h: 4 jornadas de 9 h + 2 de 10 h, de lunes a sábado, inicio a las 06:00 UTC. */
function week56(p: SchedulePlan, s: ScenarioMeta): SchedulePlan {
  [day10(), day9(), day10(), day9(), day9(), day9()].forEach((d, i) => p.restUntil(s.startsAt + i * DAY).add(...d));
  return p;
}

/** Lunes de la semana 2 a las 13:30 UTC: tras un descanso semanal de 45 h 15 min desde el sábado 16:15. */
const week2Start = (s: ScenarioMeta) => s.weekOneStart + 7 * DAY + 13.5 * HOUR;

/**
 * Escenario formativo obligatorio 56 h + 34 h = 90 h, construido como calendario
 * coherente (jornadas, pausas y descansos), nunca como un bloque aislado.
 */
export function reference5634Plan(s: ScenarioMeta): SchedulePlan {
  const p = week56(new SchedulePlan(s.startsAt), s);
  [day9(), day9(), day9(), day7()].forEach((d, i) => p.restUntil(week2Start(s) + i * DAY).add(...d));
  return p.restUntil(s.endsAt);
}

const noInfringements = (r: ComplianceReport): ObjectiveResult['status'] =>
  r.findings.some((f) => f.severity === 'infringement') ? 'failed' : 'done';

export const SCENARIOS: readonly ScenarioDef[] = [
  {
    id: 'free-1',
    title: 'Práctica libre — dos semanas',
    summary: 'Escenario vacío de 14 días. Inserta la tarjeta y registra tus propias jornadas.',
    feature: 'active-scenario',
    objectives: ['Practica libremente: el informe te mostrará los errores.'],
    build: () => simWith({ id: 'free-1', title: 'Práctica libre — dos semanas' }, null, (s) => s.startsAt, false),
  },
  {
    id: 'ref-5634',
    title: 'Referencia: 56 h + 34 h = 90 h',
    summary: 'Demostración completa de dos semanas legales: 56 h la primera (con las dos ampliaciones) y 34 h la segunda.',
    feature: 'active-scenario',
    objectives: [
      'Observa en el calendario cómo se reparten las 56 h: seis jornadas, dos de ellas de 10 h.',
      'Comprueba que el descanso semanal del fin de semana dura más de 45 h.',
      'Verifica en el informe que 56 + 34 = 90 h no supera ningún límite.',
    ],
    build: () => {
      const def = { id: 'ref-5634', title: 'Referencia: 56 h + 34 h = 90 h' };
      const meta = createInitialSim(REFERENCE_ANCHOR).scenario;
      return simWith(def, reference5634Plan(meta), (s) => s.endsAt, false);
    },
    evaluate: (r) => [
      { text: 'Semana 1 con 56 h de conducción', status: r.weeks[0]!.drivingMs === 56 * HOUR ? 'done' : 'failed' },
      { text: 'Semana 2 con 34 h de conducción', status: r.weeks[1]!.drivingMs === 34 * HOUR ? 'done' : 'failed' },
      { text: 'Sin infracciones', status: noInfringements(r) },
    ],
  },
  {
    id: 'week2-34',
    title: 'Semana 2: completa las 34 h',
    summary: 'La semana 1 ya tiene 56 h. Planifica la semana 2 para llegar a 90 h sin superar ningún límite.',
    feature: 'complex-scenarios',
    objectives: [
      'Conduce 34 h en la semana 2 (total 90 h).',
      'Respeta pausas, jornadas y descansos diarios.',
      'Termina el escenario con un descanso semanal normal.',
    ],
    build: () => {
      const def = { id: 'week2-34', title: 'Semana 2: completa las 34 h' };
      const meta = createInitialSim(REFERENCE_ANCHOR).scenario;
      const p = week56(new SchedulePlan(meta.startsAt), meta);
      p.restUntil(week2Start(meta));
      return simWith(def, p, (_s, end) => end, true);
    },
    evaluate: (r, sim) => {
      const w2 = r.weeks[1]!.drivingMs;
      const finished = sim.clock.now >= sim.clock.endsAt;
      return [
        { text: `Conducción semana 2: ${Math.round((w2 / HOUR) * 10) / 10} h de 34 h`, status: w2 >= 34 * HOUR ? 'done' : finished ? 'failed' : 'pending' },
        { text: 'Sin infracciones', status: noInfringements(r) },
        {
          text: 'Descansos semanales de las dos semanas correctos',
          status: r.obligations.find((o) => o.id === 'weekly-pair')?.status === 'fulfilled' ? 'done' : finished ? 'failed' : 'pending',
        },
      ];
    },
  },
  {
    id: 'reduced-weekly',
    title: 'Descanso semanal reducido y compensación',
    summary: 'Tras seis jornadas, solo descansas 30 h el fin de semana. Debes compensar 15 h antes de la fecha límite.',
    feature: 'complex-scenarios',
    objectives: [
      'Identifica en el informe la compensación pendiente y su fecha límite.',
      'En la semana 2, toma un descanso semanal normal (obligatorio tras un reducido).',
      'Para compensar dentro del escenario, ese descanso debe durar al menos 45 h + 15 h = 60 h.',
    ],
    build: () => {
      const def = { id: 'reduced-weekly', title: 'Descanso semanal reducido y compensación' };
      const meta = createInitialSim(REFERENCE_ANCHOR).scenario;
      const p = new SchedulePlan(meta.startsAt);
      for (let i = 0; i < 6; i++) p.restUntil(meta.startsAt + i * DAY).add(...day9());
      p.add(R(30 * 60));
      return simWith(def, p, (_s, end) => end, false);
    },
    evaluate: (r) => {
      const comp = r.obligations.find((o) => o.ruleId === 'R561-ART8-COMP');
      return [
        { text: 'Compensación de 15 h realizada', status: comp?.status === 'fulfilled' ? 'done' : comp?.status === 'overdue' ? 'failed' : 'pending' },
        { text: 'Sin infracciones', status: noInfringements(r) },
      ];
    },
  },
  {
    id: 'find-errors',
    title: 'Encuentra los errores',
    summary: 'Una semana registrada con varios errores típicos. Analiza el calendario y el informe para encontrarlos.',
    feature: 'detailed-evaluation',
    objectives: [
      'Localiza la conducción continua de más de 4 h 30 min.',
      'Localiza la jornada con más de 10 h de conducción.',
      'Localiza el descanso diario insuficiente.',
      'Explica cómo se habría evitado cada error.',
    ],
    build: () => {
      const def = { id: 'find-errors', title: 'Encuentra los errores' };
      const meta = createInitialSim(REFERENCE_ANCHOR).scenario;
      const p = new SchedulePlan(meta.startsAt);
      p.add(...day9()).restUntil(meta.startsAt + DAY);
      // Martes: 5 h seguidas sin pausa.
      p.add(W(15), D(300), R(45), D(240), W(15)).restUntil(meta.startsAt + 2 * DAY);
      // Miércoles: 10 h 45 min de conducción.
      p.add(W(15), D(270), R(45), D(270), R(45), D(105), W(15));
      // Solo 8 h de descanso antes del jueves.
      p.add(R(8 * 60), ...day9()).restUntil(meta.startsAt + 4 * DAY);
      p.add(...day9()).add(R(48 * 60));
      return simWith(def, p, (_s, end) => end, false);
    },
    evaluate: (r) => {
      const has = (id: string) => (r.findings.some((f) => f.ruleId === id) ? 'done' : 'failed') as ObjectiveResult['status'];
      return [
        { text: 'El informe detecta la conducción continua excesiva', status: has('R561-ART7-CONT') },
        { text: 'El informe detecta la jornada de más de 10 h', status: has('R561-ART6-DAILY10') },
        { text: 'El informe detecta el descanso diario insuficiente', status: has('R561-ART8-24H') },
      ];
    },
  },
];

export function scenarioDef(id: string | undefined): ScenarioDef | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
