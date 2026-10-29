import { describe, expect, it } from 'vitest';
import { createInitialSim } from '@/simulator/state';
import { deleteSlot, listSlots, saveSlot, SLOTS_KEY } from './slots';
import { memoryStorage } from './storage';

describe('escenarios guardados', () => {
  it('respeta el límite del plan', () => {
    const st = memoryStorage();
    expect(saveSlot(st, createInitialSim(), 'Uno', 1, 1).ok).toBe(true);
    const second = saveSlot(st, createInitialSim(), 'Dos', 1, 2);
    expect(second.ok).toBe(false);
    expect(listSlots(st)).toHaveLength(1);
    expect(saveSlot(st, createInitialSim(), 'Dos', 5, 3).ok).toBe(true);
  });

  it('borra y descarta datos corruptos', () => {
    const st = memoryStorage();
    const r = saveSlot(st, createInitialSim(), 'Uno', 5, 1);
    if (!r.ok) throw new Error(r.reason);
    deleteSlot(st, r.slot.id);
    expect(listSlots(st)).toEqual([]);
    st.setItem(SLOTS_KEY, '{roto');
    expect(listSlots(st)).toEqual([]);
  });
});
