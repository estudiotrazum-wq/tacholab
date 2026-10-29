import type { View } from '../uiStore';

/** Navegación simplificada: cuatro secciones; algunas agrupan dos vistas en pestañas. */
export interface Section {
  id: string;
  label: string;
  icon: 'home' | 'drive' | 'weeks' | 'learn';
  views: { id: View; label: string }[];
}

export const SECTIONS: readonly Section[] = [
  { id: 'home', label: 'Inicio', icon: 'home', views: [{ id: 'home', label: 'Inicio' }] },
  { id: 'drive', label: 'Conducir', icon: 'drive', views: [{ id: 'cabin', label: 'Cabina' }, { id: 'device', label: 'Tacógrafo' }] },
  { id: 'weeks', label: 'Mis semanas', icon: 'weeks', views: [{ id: 'calendar', label: 'Calendario' }, { id: 'report', label: 'Informe' }] },
  { id: 'learn', label: 'Academia', icon: 'learn', views: [{ id: 'academy', label: 'Ejercicios' }, { id: 'scenarios', label: 'Escenarios' }] },
];

export function sectionOf(view: View): Section | undefined {
  return SECTIONS.find((s) => s.views.some((v) => v.id === view));
}
