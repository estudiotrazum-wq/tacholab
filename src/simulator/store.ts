import { create } from 'zustand';
import { simReducer, type SimAction } from './engine';
import { createInitialSim, type SimState } from './state';
import {
  browserStorage,
  clearAll,
  loadActive,
  loadCheckpoint,
  saveActive,
  saveCheckpoint,
  type KeyValueStorage,
} from '@/persistence/storage';
import { deleteSlot, listSlots, saveSlot, type SaveResult, type SaveSlot } from '@/persistence/slots';
import type { ScenarioDef } from '@/scenarios/library';

/** Store del estado operativo de la simulación. La lógica vive en el reductor puro. */
interface SimStore {
  sim: SimState;
  dirty: boolean;
  dispatch: (action: SimAction) => void;
  persist: () => void;
  saveCheckpoint: () => boolean;
  restoreCheckpoint: () => boolean;
  checkpointSavedAt: () => number | null;
  reset: () => void;
  wipeAllData: () => void;
  loadScenario: (def: ScenarioDef) => void;
  loadSim: (sim: SimState) => void;
  slots: () => SaveSlot[];
  saveSlot: (name: string, limit: number) => SaveResult;
  loadSlot: (id: string) => boolean;
  deleteSlot: (id: string) => void;
}

let storage: KeyValueStorage | null = null;
const getStorage = () => (storage ??= browserStorage());

export const useSimStore = create<SimStore>((set, get) => ({
  sim: loadActive(getStorage()) ?? createInitialSim(),
  dirty: false,
  dispatch: (action) => {
    const prev = get().sim;
    const next = simReducer(prev, action);
    if (next === prev) return;
    set({ sim: next, dirty: true });
    // Los ticks se guardan periódicamente; el resto de acciones inmediatamente.
    if (action.type !== 'TICK') get().persist();
  },
  persist: () => {
    saveActive(getStorage(), get().sim);
    set({ dirty: false });
  },
  saveCheckpoint: () => saveCheckpoint(getStorage(), get().sim),
  restoreCheckpoint: () => {
    const c = loadCheckpoint(getStorage());
    if (!c) return false;
    set({ sim: c.sim });
    get().persist();
    return true;
  },
  checkpointSavedAt: () => loadCheckpoint(getStorage())?.savedAt ?? null,
  reset: () => {
    set({ sim: createInitialSim() });
    get().persist();
  },
  wipeAllData: () => {
    clearAll(getStorage());
    set({ sim: createInitialSim(), dirty: false });
  },
  loadScenario: (def) => get().loadSim(def.build()),
  loadSim: (sim) => {
    set({ sim });
    get().persist();
  },
  slots: () => listSlots(getStorage()),
  saveSlot: (name, limit) => saveSlot(getStorage(), get().sim, name, limit),
  loadSlot: (id) => {
    const slot = listSlots(getStorage()).find((s) => s.id === id);
    if (!slot) return false;
    set({ sim: slot.sim });
    get().persist();
    return true;
  },
  deleteSlot: (id) => deleteSlot(getStorage(), id),
}));
