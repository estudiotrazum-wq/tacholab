import { N_ } from '@/i18n';
import type { View } from '../uiStore';

/** Navegación mínima: el simulador es la pantalla principal; las demás secciones son de consulta. */
export interface Section {
  id: string;
  label: string;
  icon: 'drive' | 'weeks' | 'learn';
  views: { id: View; label: string }[];
}

export const SECTIONS: readonly Section[] = [
  { id: 'drive', label: N_('Simulador'), icon: 'drive', views: [{ id: 'device', label: N_('Panel') }, { id: 'cabin', label: N_('Cabina') }] },
  { id: 'weeks', label: N_('Mis semanas'), icon: 'weeks', views: [{ id: 'calendar', label: N_('Calendario') }, { id: 'report', label: N_('Informe') }] },
  { id: 'learn', label: N_('Academia'), icon: 'learn', views: [{ id: 'academy', label: N_('Ejercicios') }, { id: 'scenarios', label: N_('Escenarios') }] },
];

export function sectionOf(view: View): Section | undefined {
  return SECTIONS.find((s) => s.views.some((v) => v.id === view));
}
