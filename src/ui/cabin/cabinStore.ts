import { create } from 'zustand';
import { browserStorage, KEYS } from '@/persistence/storage';
import type { CameraId } from './camera';

/**
 * Estado visual de la cabina (no afecta a la simulación ni a los cálculos).
 * Se recuerdan las preferencias; las luces de emergencia y la cámara no.
 */
export type Quality = 'high' | 'low';

interface CabinPrefs {
  quality: Quality;
  ledOn: boolean;
  /** 0.2 … 1 */
  ledBrightness: number;
  headlights: boolean;
  interiorLight: boolean;
  visorDown: boolean;
}

const DEFAULTS: CabinPrefs = { quality: 'high', ledOn: true, ledBrightness: 0.85, headlights: true, interiorLight: false, visorDown: true };

function load(): CabinPrefs {
  try {
    const raw = browserStorage().getItem(KEYS.cabin);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<CabinPrefs>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

interface CabinStore extends CabinPrefs {
  hazards: boolean;
  camera: CameraId;
  setCamera: (c: CameraId) => void;
  toggle: (k: 'ledOn' | 'headlights' | 'interiorLight' | 'visorDown' | 'hazards') => void;
  set: (patch: Partial<CabinPrefs>) => void;
}

export const useCabinStore = create<CabinStore>((set, get) => {
  const save = () => {
    const { quality, ledOn, ledBrightness, headlights, interiorLight, visorDown } = get();
    try {
      browserStorage().setItem(KEYS.cabin, JSON.stringify({ quality, ledOn, ledBrightness, headlights, interiorLight, visorDown }));
    } catch {
      /* sin almacenamiento */
    }
  };
  return {
    ...load(),
    hazards: false,
    camera: 'driver',
    setCamera: (camera) => set({ camera }),
    toggle: (k) => {
      set({ [k]: !get()[k] } as Partial<CabinStore>);
      save();
    },
    set: (patch) => {
      set(patch);
      save();
    },
  };
});
