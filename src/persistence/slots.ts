import { t } from '@/i18n';
import type { SimState } from '@/simulator/state';
import { SIM_STATE_VERSION } from '@/simulator/state';
import { KEYS, type KeyValueStorage } from './storage';

/** Escenarios guardados por el usuario (número limitado según el plan). */
export interface SaveSlot {
  id: string;
  name: string;
  savedAt: number;
  scenarioTitle: string;
  simNow: number;
  sim: SimState;
}

export const SLOTS_KEY = KEYS.slots;

export function listSlots(storage: KeyValueStorage): SaveSlot[] {
  try {
    const raw = storage.getItem(SLOTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SaveSlot => !!s && typeof s.id === 'string' && typeof s.name === 'string' && s.sim?.version === SIM_STATE_VERSION,
    );
  } catch {
    return [];
  }
}

export type SaveResult = { ok: true; slot: SaveSlot } | { ok: false; reason: string };

export function saveSlot(storage: KeyValueStorage, sim: SimState, name: string, limit: number, savedAt = Date.now()): SaveResult {
  const slots = listSlots(storage);
  if (slots.length >= limit) {
    return { ok: false, reason: t('Tu plan permite {n} escenario(s) guardado(s). Borra uno para guardar otro.', { n: limit }) };
  }
  const slot: SaveSlot = {
    id: `slot-${savedAt}-${slots.length}`,
    name: name.trim().slice(0, 60) || t('Sin nombre'),
    savedAt,
    scenarioTitle: sim.scenario.title,
    simNow: sim.clock.now,
    sim: { ...sim, clock: { ...sim.clock, speed: 0, carryMs: 0 }, device: { ...sim.device, notice: null } },
  };
  try {
    storage.setItem(SLOTS_KEY, JSON.stringify([...slots, slot]));
    return { ok: true, slot };
  } catch {
    return { ok: false, reason: t('No hay espacio de almacenamiento disponible en este navegador.') };
  }
}

export function deleteSlot(storage: KeyValueStorage, id: string): void {
  try {
    storage.setItem(SLOTS_KEY, JSON.stringify(listSlots(storage).filter((s) => s.id !== id)));
  } catch {
    /* sin almacenamiento */
  }
}
