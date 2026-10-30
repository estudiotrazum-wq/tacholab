import { create } from 'zustand';
import { browserStorage, KEYS } from '@/persistence/storage';
import { DEFAULT_ENTITLEMENTS, type Entitlements } from '@/billing/plans';
import { sectionOf } from './shell/nav';
import { detectLang, N_, setLang, type Lang } from '@/i18n';

/** Estado visual y preferencias. Separado del estado operativo del simulador. */
export type View = 'cabin' | 'device' | 'calendar' | 'report' | 'scenarios' | 'academy' | 'premium' | 'settings' | 'guide';
export type LearningMode = 'assisted' | 'free';

/** Colores de la iluminación ambiental LED de la cabina. */
export const LED_COLORS = {
  cyan: { label: N_('Cian'), hex: '#22d3ee' },
  blue: { label: N_('Azul'), hex: '#3b82f6' },
  magenta: { label: N_('Magenta'), hex: '#e879f9' },
  amber: { label: N_('Ámbar'), hex: '#fbbf24' },
  lime: { label: N_('Verde'), hex: '#a3e635' },
} as const;
export type LedColor = keyof typeof LED_COLORS;

interface Settings {
  learningMode: LearningMode;
  disclaimerAccepted: boolean;
  warningsEnabled: boolean;
  ledColor: LedColor;
  /** Solo en desarrollo: vista previa local de contenido premium (no es un permiso real). */
  devPremiumPreview: boolean;
  /** El tutorial de inicio se ha completado o descartado (ya no se ofrece en el panel). */
  tutorialDone: boolean;
  /** Nombre que el alumno pone en su tarjeta ficticia ('' = nombre de ejemplo). Solo se guarda en este navegador. */
  driverName: string;
  /** Sonido: efectos (teclas, tarjeta, motor…), música de ambiente y volúmenes (0-1). */
  sfxOn: boolean;
  musicOn: boolean;
  volume: number;
  musicVolume: number;
  engineVolume: number;
  /** Fondo de la aplicación: atlas de carreteras o degradado liso. */
  background: 'atlas' | 'plain';
  /** Pantalla del tacógrafo: LCD clásico verde, nocturno (texto claro sobre oscuro) o ámbar. */
  lcdTheme: 'classic' | 'night' | 'amber';
  /** Idioma de la interfaz. */
  lang: Lang;
}

const DEFAULTS: Settings = { learningMode: 'assisted', disclaimerAccepted: false, warningsEnabled: true, ledColor: 'cyan', devPremiumPreview: false, tutorialDone: false, driverName: '', sfxOn: true, musicOn: false, volume: 0.7, musicVolume: 0.45, engineVolume: 0.5, background: 'atlas', lcdTheme: 'classic', lang: typeof window !== 'undefined' ? detectLang(window.navigator.language) : 'es' };

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
    if (patch.lang) applyLang(patch.lang);
    set(patch);
    const { learningMode, disclaimerAccepted, warningsEnabled, ledColor, devPremiumPreview, tutorialDone, driverName, sfxOn, musicOn, volume, musicVolume, engineVolume, background, lcdTheme, lang } = get();
    try {
      browserStorage().setItem(KEYS.settings, JSON.stringify({ learningMode, disclaimerAccepted, warningsEnabled, ledColor, devPremiumPreview, tutorialDone, driverName, sfxOn, musicOn, volume, musicVolume, engineVolume, background, lcdTheme, lang }));
    } catch {
      /* sin almacenamiento */
    }
  },
}));

/** Idioma activo: traducciones y atributo lang del documento. */
function applyLang(lang: Lang): void {
  setLang(lang);
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
}
applyLang(useUiStore.getState().lang);

/**
 * Permisos comerciales efectivos en el cliente. En producción siempre «free»
 * hasta que exista validación en servidor (Fase 6); la vista previa premium
 * solo funciona en el servidor de desarrollo.
 */
export function useEntitlements(): Entitlements {
  const preview = useUiStore((s) => s.devPremiumPreview);
  return import.meta.env.DEV && preview ? { plan: 'premium', source: 'local-default' } : DEFAULT_ENTITLEMENTS;
}
