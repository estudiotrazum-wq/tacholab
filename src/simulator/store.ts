import { create } from 'zustand';
import { simReducer, type SimAction } from './engine';
import { createInitialSim, type SimState } from './state';
import {
  browserStorage,
  clearAll,
  clearShiftStart,
  loadShiftStart,
  saveShiftStart,
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
  /** Vuelve a justo antes de la última inserción de tarjeta. false si aún no se ha insertado ninguna. */
  restartShift: () => boolean;
  /** Instante (reloj virtual) al que volvería «Repetir la jornada», o null. */
  shiftStartAt: () => number | null;
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
    // Punto de «Repetir la jornada»: el estado justo antes de meter la tarjeta.
    if (action.type === 'INSERT_CARD' && !prev.device.insertedCardId && next.device.insertedCardId) saveShiftStart(getStorage(), prev);
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
    clearShiftStart(getStorage());
    set({ sim: createInitialSim() });
    get().persist();
  },
  restartShift: () => {
    const start = loadShiftStart(getStorage());
    if (!start || start.scenario.id !== get().sim.scenario.id) return false;
    set({ sim: start });
    get().persist();
    return true;
  },
  shiftStartAt: () => {
    const start = loadShiftStart(getStorage());
    return start && start.scenario.id === get().sim.scenario.id ? start.clock.now : null;
  },
  wipeAllData: () => {
    clearAll(getStorage());
    set({ sim: createInitialSim(), dirty: false });
  },
  loadScenario: (def) => get().loadSim(def.build()),
  loadSim: (sim) => {
    clearShiftStart(getStorage());
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
