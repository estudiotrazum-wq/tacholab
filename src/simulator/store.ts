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
}));
