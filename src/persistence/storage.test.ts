import { describe, expect, it } from 'vitest';
import { clearAll, clearShiftStart, loadActive, loadCheckpoint, loadShiftStart, memoryStorage, saveActive, saveCheckpoint, saveShiftStart, KEYS } from './storage';
import { simReducer } from '@/simulator/engine';
import { createInitialSim } from '@/simulator/state';
import { HOUR } from '@/time-engine/units';

describe('persistencia local', () => {
  it('guarda y recupera el escenario activo (en pausa)', () => {
    const st = memoryStorage();
    let sim = createInitialSim();
    sim = simReducer(sim, { type: 'INSERT_CARD', cardId: 'card-a' });
    sim = simReducer(sim, { type: 'SET_SPEED', speed: 60 });
    sim = simReducer(sim, { type: 'ADVANCE_BY', ms: HOUR });
    expect(saveActive(st, sim)).toBe(true);
    const loaded = loadActive(st)!;
    expect(loaded.timeline).toEqual(sim.timeline);
    expect(loaded.clock.now).toBe(sim.clock.now);
    expect(loaded.clock.speed).toBe(0);
  });

  it('punto guardado independiente del activo', () => {
    const st = memoryStorage();
    const sim = createInitialSim();
    saveCheckpoint(st, sim, 123);
    expect(loadCheckpoint(st)?.savedAt).toBe(123);
  });

  it('ignora datos corruptos o de otra versión', () => {
    const st = memoryStorage();
    st.setItem(KEYS.active, '{not json');
    expect(loadActive(st)).toBeNull();
    st.setItem(KEYS.active, JSON.stringify({ version: 99 }));
    expect(loadActive(st)).toBeNull();
  });

  it('borrar todos los datos', () => {
    const st = memoryStorage();
    saveActive(st, createInitialSim());
    clearAll(st);
    expect(loadActive(st)).toBeNull();
  });
});

describe('repetir la jornada', () => {
  it('guarda el estado previo a la inserción, se recupera y se borra con el resto de datos', () => {
    const st = memoryStorage();
    const before = simReducer(createInitialSim(), { type: 'ADVANCE_BY', ms: HOUR });
    expect(saveShiftStart(st, before)).toBe(true);
    expect(loadShiftStart(st)?.clock.now).toBe(before.clock.now);
    expect(loadShiftStart(st)?.device.insertedCardId).toBeNull();
    clearShiftStart(st);
    expect(loadShiftStart(st)).toBeNull();
    saveShiftStart(st, before);
    clearAll(st);
    expect(loadShiftStart(st)).toBeNull();
  });
});
