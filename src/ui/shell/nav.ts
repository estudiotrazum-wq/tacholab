import type { View } from '../uiStore';

/** Navegación mínima: el simulador es la pantalla principal; las demás secciones son de consulta. */
export interface Section {
  id: string;
  label: string;
  icon: 'drive' | 'weeks' | 'learn';
  views: { id: View; label: string }[];
}

export const SECTIONS: readonly Section[] = [
  { id: 'drive', label: 'Simulador', icon: 'drive', views: [{ id: 'device', label: 'Panel' }, { id: 'cabin', label: 'Cabina' }] },
  { id: 'weeks', label: 'Mis semanas', icon: 'weeks', views: [{ id: 'calendar', label: 'Calendario' }, { id: 'report', label: 'Informe' }] },
  { id: 'learn', label: 'Academia', icon: 'learn', views: [{ id: 'academy', label: 'Ejercicios' }, { id: 'scenarios', label: 'Escenarios' }] },
];

export function sectionOf(view: View): Section | undefined {
  return SECTIONS.find((s) => s.views.some((v) => v.id === view));
}
