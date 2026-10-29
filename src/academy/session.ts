import { complianceFor, currentDriverEvents } from '@/simulator/derived';
import { computeContinuousDriving } from '@/regulations/continuousDriving';
import type { SimState } from '@/simulator/state';
import { openEvent } from '@/time-engine/timeline';
import type { ComplianceReport } from '@/regulations/compliance';
import { DRIVER } from './setup';
import type { ExerciseContext, ExerciseDef, ExerciseResult, ExerciseSession } from './types';

/** Hechos instantáneos observables en el estado (se acumulan durante el ejercicio). */
export function observeFacts(sim: SimState): string[] {
  const d = sim.device;
  const f = [`screen:${d.screen.kind}`, `selected:${d.selected}`];
  if (d.screen.kind === 'STANDARD') f.push(`page:${d.screen.page}`);
  if (d.screen.kind === 'MENU') f.push(`menu:${d.screen.index}`);
  if (d.insertedCardId) f.push('card-in');
  if (sim.vehicle.moving) f.push('moving');
  if (sim.clock.speed > 0) f.push('clock-running');
  if (d.warning) f.push(`warning:${d.warning.code}`);
  if (d.notice) f.push(`notice:${d.notice.text}`);
  const rec = openEvent(sim.timeline);
  if (rec) f.push(`recorded:${rec.activity}`);
  if (d.insertedCardId && computeContinuousDriving(currentDriverEvents(sim), sim.clock.now).splitFirstTaken) f.push('split-first');
  return f;
}

export function startSession(def: ExerciseDef, sim: SimState): ExerciseSession {
  return advanceSession(
    { exerciseId: def.id, scenarioKey: sim.scenario.libraryId, stepIndex: 0, facts: [], stepFacts: [], startLogSeq: sim.logSeq, showInstructions: true, answers: [], result: null },
    sim,
    def,
  );
}

export function contextFor(session: ExerciseSession, sim: SimState, def: ExerciseDef): ExerciseContext {
  let report: ComplianceReport | null | undefined;
  return {
    sim,
    get report() {
      // Siempre la tarjeta del ejercicio, aunque ya se haya retirado (p. ej. al final de la jornada).
      if (report === undefined) report = complianceFor(sim, sim.device.insertedCardId ?? DRIVER);
      return report;
    },
    facts: new Set(session.facts),
    stepFacts: new Set(session.stepFacts),
    newLog: sim.log.filter((l) => l.id >= session.startLogSeq),
    allStepsDone: session.stepIndex >= def.steps.length,
    answers: session.answers,
  };
}

/** Registra lo observado y avanza los pasos completados, en orden. */
export function advanceSession(session: ExerciseSession, sim: SimState, def: ExerciseDef): ExerciseSession {
  if (session.result) return session;
  const now = observeFacts(sim);
  let s: ExerciseSession = {
    ...session,
    facts: [...new Set([...session.facts, ...now])],
    stepFacts: [...new Set([...session.stepFacts, ...now])],
  };
  while (s.stepIndex < def.steps.length && def.steps[s.stepIndex]!.done(contextFor(s, sim, def))) {
    // Los hechos del paso siguiente se cuentan desde ahora (salvo los que se basan en el estado actual).
    s = { ...s, stepIndex: s.stepIndex + 1, stepFacts: [] };
  }
  return s;
}

/** Puntuación: 100 menos penalizaciones por errores y 20 por cada condición de éxito no cumplida. */
export function gradeSession(session: ExerciseSession, sim: SimState, def: ExerciseDef): ExerciseResult {
  const c = contextFor(session, sim, def);
  const criteria = def.success.map((k) => ({ text: k.text, ok: k.check(c) }));
  const errors = def.errors.filter((e) => e.check(c)).map(({ text, penalty, ruleId }) => ({ text, penalty, ruleId }));
  const passed = criteria.every((k) => k.ok);
  const score = Math.max(0, 100 - errors.reduce((a, e) => a + e.penalty, 0) - 20 * criteria.filter((k) => !k.ok).length);
  const stars: ExerciseResult['stars'] = !passed ? 0 : score >= 90 ? 3 : score >= 70 ? 2 : 1;
  return { exerciseId: def.id, score, stars, passed, criteria, errors, stepsDone: session.stepIndex, stepsTotal: def.steps.length };
}
