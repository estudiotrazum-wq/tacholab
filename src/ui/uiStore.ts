import { create } from 'zustand';
import { browserStorage, KEYS } from '@/persistence/storage';
import { DEFAULT_ENTITLEMENTS, type Entitlements } from '@/billing/plans';
import { sectionOf } from './shell/nav';

/** Estado visual y preferencias. Separado del estado operativo del simulador. */
export type View = 'cabin' | 'device' | 'calendar' | 'report' | 'scenarios' | 'academy' | 'premium' | 'settings';
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
  /** Solo en desarrollo: vista previa local de contenido premium (no es un permiso real). */
  devPremiumPreview: boolean;
}

const DEFAULTS: Settings = { learningMode: 'assisted', disclaimerAccepted: false, warningsEnabled: true, ledColor: 'cyan', devPremiumPreview: false };

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
  /** Última vista visitada de cada sección (para volver a la misma pestaña). */
  lastViews: Partial<Record<string, View>>;
  go: (v: View) => void;
  update: (patch: Partial<Settings>) => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  ...loadSettings(),
  view: 'device',
  lastViews: {},
  go: (view) => {
    const section = sectionOf(view);
    set((st) => ({ view, lastViews: section ? { ...st.lastViews, [section.id]: view } : st.lastViews }));
    if (typeof window !== 'undefined') window.scrollTo?.({ top: 0 });
  },
  update: (patch) => {
    set(patch);
    const { learningMode, disclaimerAccepted, warningsEnabled, ledColor, devPremiumPreview } = get();
    try {
      browserStorage().setItem(KEYS.settings, JSON.stringify({ learningMode, disclaimerAccepted, warningsEnabled, ledColor, devPremiumPreview }));
    } catch {
      /* sin almacenamiento */
    }
  },
}));

/**
 * Permisos comerciales efectivos en el cliente. En producción siempre «free»
 * hasta que exista validación en servidor (Fase 6); la vista previa premium
 * solo funciona en el servidor de desarrollo.
 */
export function useEntitlements(): Entitlements {
  const preview = useUiStore((s) => s.devPremiumPreview);
  return import.meta.env.DEV && preview ? { plan: 'premium', source: 'local-default' } : DEFAULT_ENTITLEMENTS;
}
