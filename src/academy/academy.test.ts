import { describe, expect, it } from 'vitest';
import { simReducer, type SimAction } from '@/simulator/engine';
import type { SimState } from '@/simulator/state';
import type { Button } from '@/tachograph/types';
import { HOUR, MINUTE } from '@/time-engine/units';
import { earnedBadges, recordResult } from '@/achievements/badges';
import { EXERCISES, exerciseDef } from './catalog';
import { advanceSession, gradeSession, startSession } from './session';
import type { ExerciseSession } from './types';

type Act = SimAction | ((s: SimState) => SimAction[]);
const P = (...b: Button[]): SimAction[] => b.map((button) => ({ type: 'PRESS', button }));
const adv = (min: number): SimAction => ({ type: 'ADVANCE_BY', ms: min * MINUTE });
const move = (moving: boolean): SimAction => ({ type: 'SET_MOVING', moving });
/** Pulsa el botón de actividad hasta seleccionar la actividad indicada. */
const select = (target: string) => (s: SimState): SimAction[] => {
  const order = ['WORK', 'AVAILABILITY', 'REST'];
  const n = (order.indexOf(target) - order.indexOf(s.device.selected) + 3) % 3;
  return P(...(Array(n).fill('ACTIVITY') as Button[]));
};

/** Ejecuta acciones contra el simulador real, observando tras cada una como hace la interfaz. */
function play(id: string, acts: Act[], answers: string[] = []) {
  const def = exerciseDef(id)!;
  let sim = def.build!();
  let session: ExerciseSession = { ...startSession(def, sim), answers };
  for (const a of acts) {
    const list = typeof a === 'function' ? a(sim) : [a];
    for (const x of list) {
      sim = simReducer(sim, x);
      session = advanceSession(session, sim, def);
    }
  }
  return { sim, session, result: gradeSession(session, sim, def), def };
}

describe('catálogo de la academia', () => {
  it('16 ejercicios numerados; los cinco primeros gratuitos', () => {
    expect(EXERCISES.map((e) => e.number)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    expect(EXERCISES.filter((e) => e.feature === 'academy-basic').map((e) => e.number)).toEqual([1, 2, 3, 4, 5]);
  });
  it('cada ejercicio disponible tiene todos los apartados formativos', () => {
    for (const e of EXERCISES.filter((x) => x.status === 'available')) {
      expect(e.objective && e.situation && e.deviceState && e.explanation).toBeTruthy();
      expect(e.success.length).toBeGreaterThan(0);
      expect(e.build).toBeTypeOf('function');
    }
  });
});

describe('ejercicios gratuitos resueltos con el simulador', () => {
  it('1 · botones: todos los pasos y 100 puntos', () => {
    const { session, result } = play('buttons', [P('DOWN'), P('DOWN'), P('OK'), P('DOWN', 'DOWN', 'DOWN', 'DOWN', 'OK'), P('BACK', 'BACK'), P('ACTIVITY')].flat());
    expect(session.stepIndex).toBe(6);
    expect(result).toMatchObject({ passed: true, score: 100, stars: 3 });
  });

  it('1 · botones: los pasos se completan en orden (volver a la pantalla principal no cuenta antes de tiempo)', () => {
    const { session } = play('buttons', P('OK'));
    expect(session.stepIndex).toBe(0);
  });

  it('2 · tarjeta con entrada manual: 100 puntos', () => {
    // Bienvenida, última retirada, SÍ, actividad, hora, minutos, país fin anterior, confirmar, país de inicio
    const { result, sim, session } = play('insert-card', [{ type: 'INSERT_CARD', cardId: 'card-a' }, ...P('OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK', 'OK')]);
    expect(session.stepIndex).toBe(8);
    expect(sim.device.screen.kind).toBe('STANDARD');
    expect(result).toMatchObject({ passed: true, score: 100 });
  });

  it('2 · tarjeta sin entrada manual: suspende y penaliza', () => {
    const { result } = play('insert-card', [{ type: 'INSERT_CARD', cardId: 'card-a' }, ...P('OK', 'OK', 'DOWN', 'OK', 'OK')]);
    expect(result.passed).toBe(false);
    expect(result.errors.map((e) => e.penalty)).toEqual([40]);
  });

  it('3 · actividades', () => {
    const { result } = play('activities', [select('WORK'), adv(30), select('AVAILABILITY'), adv(15), move(true), adv(30), move(false), select('REST')]);
    expect(result).toMatchObject({ passed: true, score: 100 });
  });

  it('4 · jornada sencilla correcta', () => {
    const { result } = play('simple-day', [
      select('WORK'), adv(15),
      move(true), adv(240), move(false), select('REST'), adv(45),
      move(true), adv(180), move(false), select('REST'),
      ...P('EJECT', 'OK', 'OK'),
    ]);
    expect(result).toMatchObject({ passed: true, score: 100, stars: 3 });
  });

  it('4 · jornada con 5 h seguidas: penalización con referencia al art. 7', () => {
    const { result } = play('simple-day', [
      select('WORK'), adv(15),
      move(true), adv(300), move(false), ...P('OK'), select('REST'), adv(45),
      move(true), adv(60), move(false), ...P('OK'), select('REST'),
      ...P('EJECT', 'OK', 'OK'),
    ]);
    expect(result.errors[0]).toMatchObject({ ruleId: 'R561-ART7-CONT', penalty: 40 });
    expect(result.passed).toBe(false);
    expect(result.score).toBe(40); // 100 − 40 (error) − 20 (condición «sin infracciones» no cumplida)
    expect(result.stars).toBe(0);
  });

  it('5 · pausa a tiempo: 3 estrellas; tarde: suspende', () => {
    const ok = play('break-45', [{ type: 'JUMP_NEXT_EVENT' }, ...P('OK'), move(false), select('REST'), adv(45), move(true)]);
    expect(ok.result).toMatchObject({ passed: true, score: 100, stars: 3 });
    const late = play('break-45', [adv(40), ...P('OK', 'OK'), move(false), select('REST'), adv(45), move(true)]);
    expect(late.result.passed).toBe(false);
    expect(late.result.errors[0]!.ruleId).toBe('R561-ART7-CONT');
  });
});

describe('ejercicios premium', () => {
  it('6 · pausa fraccionada 15 + 30', () => {
    const { result } = play('split-break', [move(false), select('REST'), adv(15), move(true), adv(60), move(false), select('REST'), adv(30)]);
    expect(result).toMatchObject({ passed: true, score: 100 });
  });
  it('15 · cuestionario de errores', () => {
    expect(play('find-errors', [], ['cont', 'daily10', 'rest']).result).toMatchObject({ passed: true, stars: 3 });
    expect(play('find-errors', [], ['cont', 'weekly56']).result.passed).toBe(false);
  });
  it('14 · arranca con 34 h disponibles en dos semanas', () => {
    const { sim } = play('ninety', []);
    expect(sim.clock.now - sim.scenario.weekOneStart).toBe(7 * 24 * HOUR + 13.5 * HOUR);
  });
});

describe('insignias', () => {
  it('se basan en ejercicios superados y conservan el mejor resultado', () => {
    let p = recordResult({}, 'buttons', { score: 100, stars: 3, passed: true });
    p = recordResult(p, 'buttons', { score: 40, stars: 0, passed: false });
    expect(p['buttons']).toMatchObject({ bestScore: 100, stars: 3, passed: true, attempts: 2 });
    expect(earnedBadges(p).map((b) => b.id)).toEqual(['first-steps']);
  });
});
