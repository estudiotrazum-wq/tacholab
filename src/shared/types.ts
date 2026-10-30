import { N_ } from '@/i18n';
/** Instante absoluto en milisegundos desde epoch (UTC). Única representación interna del tiempo. */
export type EpochMs = number;

/** Categorías de actividad registrables. */
export type Activity = 'DRIVING' | 'WORK' | 'AVAILABILITY' | 'REST';

/** Actividades que el conductor puede seleccionar manualmente (la conducción la determina el movimiento). */
export type SelectableActivity = Exclude<Activity, 'DRIVING'>;

export const ACTIVITIES: readonly Activity[] = ['DRIVING', 'WORK', 'AVAILABILITY', 'REST'];
export const SELECTABLE_ACTIVITIES: readonly SelectableActivity[] = ['WORK', 'AVAILABILITY', 'REST'];

export const ACTIVITY_LABEL: Record<Activity, string> = {
  DRIVING: N_('Conducción'),
  WORK: N_('Otros trabajos'),
  AVAILABILITY: N_('Disponibilidad'),
  REST: N_('Pausa / descanso'),
};

export const ACTIVITY_SHORT: Record<Activity, string> = {
  DRIVING: 'COND',
  WORK: 'TRAB',
  AVAILABILITY: 'DISP',
  REST: 'DESC',
};
