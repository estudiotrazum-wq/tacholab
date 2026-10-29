import { describe, expect, it } from 'vitest';
import { createInitialSim } from '@/simulator/state';
import { simReducer, type SimAction } from '@/simulator/engine';
import type { Button } from '@/tachograph/types';
import { MINUTE } from '@/time-engine/units';
import { advanceTutorial, TUTORIAL_STEPS } from './steps';

const press = (...b: Button[]): SimAction[] => b.map((button) => ({ type: 'PRESS', button }));
const idOf = (i: number) => TUTORIAL_STEPS[i]!.id;

/** Reproduce lo que haría el alumno: acciones del motor y «Siguiente» en los pasos informativos. */
function walk(actionsByStep: Record<string, SimAction[]>) {
  let sim = createInitialSim();
  let state = { index: 0, start: sim };
  const visited: string[] = [];
  for (let guard = 0; guard < 50 && state.index < TUTORIAL_STEPS.length - 1; guard++) {
    const step = TUTORIAL_STEPS[state.index]!;
    visited.push(step.id);
    if (!step.done) {
      state = advanceTutorial(state.index + 1, sim, sim);
      continue;
    }
    for (const a of actionsByStep[step.id] ?? []) {
      sim = simReducer(sim, a);
      state = advanceTutorial(state.index, sim, state.start);
    }
    if (TUTORIAL_STEPS[state.index]!.id === step.id) throw new Error(`El paso «${step.id}» no se completa`);
  }
  return { sim, last: idOf(state.index), visited };
}

const SCRIPT: Record<string, SimAction[]> = {
  insert: [{ type: 'INSERT_CARD', cardId: 'card-a' }],
  welcome: press('OK'),
  'last-withdrawal': press('OK'),
  'country-start': press('OK', 'OK'),
  'ignition-on': [{ type: 'SET_IGNITION', position: 'on' }],
  'ignition-start': [{ type: 'SET_IGNITION', position: 'start' }],
  drive: [{ type: 'SET_VEHICLE_SPEED', kmh: 80 }],
  time: [{ type: 'ADVANCE_BY', ms: 15 * MINUTE }, { type: 'ADVANCE_BY', ms: 15 * MINUTE }],
  read: press('DOWN'),
  stop: [{ type: 'SET_VEHICLE_SPEED', kmh: 0 }],
  activity: press('ACTIVITY', 'ACTIVITY'),
  eject: press('EJECT'),
  'country-end': press('OK', 'OK', 'OK'),
};

describe('tutorial de inicio', () => {
  it('se puede completar de principio a fin con las acciones del simulador', () => {
    const { sim, last, visited } = walk(SCRIPT);
    expect(last).toBe('done');
    expect(visited).toEqual(TUTORIAL_STEPS.slice(0, -1).map((s) => s.id));
    expect(sim.device.insertedCardId).toBeNull();
    expect(sim.log.map((l) => l.kind)).toEqual(expect.arrayContaining(['CARD_IN', 'COUNTRY_START', 'VEHICLE_START', 'COUNTRY_END', 'CARD_OUT']));
  });

  it('el paso de tiempo exige avanzar 30 min desde que empieza el paso', () => {
    expect(() => walk({ ...SCRIPT, time: [{ type: 'ADVANCE_BY', ms: 20 * MINUTE }] })).toThrow('«time»');
  });

  it('un paso no se salta si la acción es otra', () => {
    expect(() => walk({ ...SCRIPT, drive: [{ type: 'SET_IGNITION', position: 'off' }] })).toThrow('«drive»');
  });

  it('cada paso tiene título, texto y, si exige acción, una pieza señalada', () => {
    for (const s of TUTORIAL_STEPS) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.text.length).toBeGreaterThan(20);
      if (s.done) expect(s.target).not.toBeNull();
    }
  });
});
