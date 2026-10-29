import { SIM_STATE_VERSION, type SimState } from '@/simulator/state';

/**
 * Persistencia local (sin cuenta). Solo se guardan datos ficticios del simulador.
 * La sincronización cloud (Supabase) se añadirá en la Fase 6 detrás de esta misma interfaz.
 */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const KEYS = {
  active: 'tacholab.v1.active',
  checkpoint: 'tacholab.v1.checkpoint',
  settings: 'tacholab.v1.settings',
  slots: 'tacholab.v1.slots',
} as const;

export interface Checkpoint {
  savedAt: number; // instante real (solo informativo)
  sim: SimState;
}

function isSimState(v: unknown): v is SimState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<SimState>;
  return (
    s.version === SIM_STATE_VERSION &&
    typeof s.clock?.now === 'number' &&
    Array.isArray(s.timeline?.events) &&
    typeof s.device === 'object' &&
    typeof s.scenario?.id === 'string'
  );
}

function read<T>(storage: KeyValueStorage, key: string, guard: (v: unknown) => v is T): T | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return guard(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(storage: KeyValueStorage, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Al persistir, la simulación se guarda en pausa y sin mensajes transitorios. */
function forStorage(sim: SimState): SimState {
  return { ...sim, clock: { ...sim.clock, speed: 0, carryMs: 0 }, device: { ...sim.device, notice: null } };
}

export function saveActive(storage: KeyValueStorage, sim: SimState): boolean {
  return write(storage, KEYS.active, forStorage(sim));
}

export function loadActive(storage: KeyValueStorage): SimState | null {
  return read(storage, KEYS.active, isSimState);
}

export function saveCheckpoint(storage: KeyValueStorage, sim: SimState, savedAt = Date.now()): boolean {
  return write(storage, KEYS.checkpoint, { savedAt, sim: forStorage(sim) } satisfies Checkpoint);
}

export function loadCheckpoint(storage: KeyValueStorage): Checkpoint | null {
  return read(storage, KEYS.checkpoint, (v): v is Checkpoint => {
    const c = v as Partial<Checkpoint> | null;
    return !!c && typeof c.savedAt === 'number' && isSimState(c.sim);
  });
}

export function clearAll(storage: KeyValueStorage): void {
  for (const k of Object.values(KEYS)) {
    try {
      storage.removeItem(k);
    } catch {
      /* almacenamiento no disponible */
    }
  }
}

export function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

/** localStorage si está disponible; si no (modo privado, bloqueado), memoria. */
export function browserStorage(): KeyValueStorage {
  try {
    const probe = '__tacholab_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}
