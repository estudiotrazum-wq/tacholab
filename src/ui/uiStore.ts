import { create } from 'zustand';
import { browserStorage, KEYS } from '@/persistence/storage';

/** Estado visual y preferencias. Separado del estado operativo del simulador. */
export type View = 'home' | 'cabin' | 'device' | 'history' | 'academy' | 'premium' | 'settings';
export type LearningMode = 'assisted' | 'free';

/** Colores de la iluminación ambiental LED de la cabina. */
export const LED_COLORS = {
  cyan: { label: 'Cian', hex: '#22d3ee' },
  blue: { label: 'Azul', hex: '#3b82f6' },
  magenta: { label: 'Magenta', hex: '#e879f9' },
  amber: { label: 'Ámbar', hex: '#fbbf24' },
  lime: { label: 'Verde', hex: '#a3e635' },
} as const;
export type LedColor = keyof typeof LED_COLORS;

interface Settings {
  learningMode: LearningMode;
  disclaimerAccepted: boolean;
  warningsEnabled: boolean;
  ledColor: LedColor;
}

const DEFAULTS: Settings = { learningMode: 'assisted', disclaimerAccepted: false, warningsEnabled: true, ledColor: 'cyan' };

function loadSettings(): Settings {
  try {
    const raw = browserStorage().getItem(KEYS.settings);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

interface UiStore extends Settings {
  view: View;
  go: (v: View) => void;
  update: (patch: Partial<Settings>) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  ...loadSettings(),
  view: 'home',
  go: (view) => set({ view }),
  update: (patch) => {
    set(patch);
    const { learningMode, disclaimerAccepted, warningsEnabled, ledColor } = get();
    try {
      browserStorage().setItem(KEYS.settings, JSON.stringify({ learningMode, disclaimerAccepted, warningsEnabled, ledColor }));
    } catch {
      /* sin almacenamiento */
    }
  },
}));
