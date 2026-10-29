/**
 * Insignias de aprendizaje. Principios (sin mecánicas adictivas):
 *  - Solo premian hitos formativos superados, nunca la velocidad, las rachas
 *    diarias ni el tiempo de uso.
 *  - Ninguna insignia se obtiene cometiendo o tolerando infracciones.
 *  - No caducan ni se pierden.
 */
export interface ExerciseProgress {
  bestScore: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
  attempts: number;
}

export type ProgressMap = Record<string, ExerciseProgress>;

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: (p: ProgressMap) => boolean;
}

const passed = (p: ProgressMap, id: string) => !!p[id]?.passed;

export const BADGES: readonly Badge[] = [
  { id: 'first-steps', title: 'Primeros pasos', description: 'Conoces los botones del tacógrafo.', earned: (p) => passed(p, 'buttons') },
  { id: 'card-ready', title: 'Tarjeta en regla', description: 'Insertas la tarjeta y declaras el periodo sin tarjeta.', earned: (p) => passed(p, 'insert-card') },
  { id: 'activities', title: 'Cuatro actividades', description: 'Distingues conducción, otros trabajos, disponibilidad y descanso.', earned: (p) => passed(p, 'activities') },
  { id: 'first-day', title: 'Primera jornada', description: 'Completas una jornada sin infracciones.', earned: (p) => passed(p, 'simple-day') && (p['simple-day']?.bestScore ?? 0) === 100 },
  { id: 'on-time', title: 'Pausa a tiempo', description: 'Paras antes de 4 h 30 min y descansas 45 min.', earned: (p) => passed(p, 'break-45') },
  { id: 'basic-academy', title: 'Academia básica', description: 'Superas los cinco ejercicios iniciales.', earned: (p) => ['buttons', 'insert-card', 'activities', 'simple-day', 'break-45'].every((id) => passed(p, id)) },
  { id: 'split', title: '15 + 30', description: 'Dominas la pausa fraccionada.', earned: (p) => passed(p, 'split-break') },
  { id: 'compensation', title: 'Cuentas claras', description: 'Compensas un descanso semanal reducido.', earned: (p) => passed(p, 'compensation') },
  { id: 'ninety', title: '90 horas legales', description: 'Planificas dos semanas al límite sin infracciones.', earned: (p) => passed(p, 'ninety') },
  { id: 'inspector', title: 'Ojo de inspector', description: 'Identificas todos los errores de un historial.', earned: (p) => (p['find-errors']?.stars ?? 0) === 3 },
];

export function earnedBadges(p: ProgressMap): Badge[] {
  return BADGES.filter((b) => b.earned(p));
}

/** Actualiza el progreso conservando el mejor resultado. */
export function recordResult(p: ProgressMap, id: string, r: { score: number; stars: 0 | 1 | 2 | 3; passed: boolean }): ProgressMap {
  const prev = p[id];
  const better = !prev || r.score > prev.bestScore || (r.passed && !prev.passed);
  return {
    ...p,
    [id]: {
      bestScore: better ? r.score : prev.bestScore,
      stars: Math.max(prev?.stars ?? 0, r.stars) as 0 | 1 | 2 | 3,
      passed: (prev?.passed ?? false) || r.passed,
      attempts: (prev?.attempts ?? 0) + 1,
    },
  };
}
