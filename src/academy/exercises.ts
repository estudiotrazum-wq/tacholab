import type { FeatureKey } from '@/billing/plans';

/** Catálogo de ejercicios. En la Fase 1 solo existe el catálogo; la evaluación llega en la Fase 5. */
export interface ExerciseDef {
  id: number;
  title: string;
  feature: FeatureKey;
  status: 'planned';
}

const free = (id: number, title: string): ExerciseDef => ({ id, title, feature: 'academy-basic', status: 'planned' });
const premium = (id: number, title: string): ExerciseDef => ({ id, title, feature: 'academy-advanced', status: 'planned' });

export const EXERCISES: readonly ExerciseDef[] = [
  free(1, 'Conocer los botones'),
  free(2, 'Insertar una tarjeta ficticia'),
  free(3, 'Seleccionar actividades'),
  free(4, 'Registrar una jornada sencilla'),
  free(5, 'Realizar una pausa de 45 minutos'),
  premium(6, 'Pausa fraccionada 15 + 30'),
  premium(7, 'Jornada ampliada a 10 horas'),
  premium(8, 'Dos ampliaciones en una semana'),
  premium(9, 'Descanso diario reducido'),
  premium(10, 'Descanso diario fraccionado'),
  premium(11, 'Descanso semanal reducido'),
  premium(12, 'Compensación de descanso'),
  premium(13, 'Semana de 56 horas'),
  premium(14, 'Dos semanas con 90 horas'),
  premium(15, 'Identificación de errores en un historial'),
  premium(16, 'Simulación completa de transporte durante catorce días'),
];
