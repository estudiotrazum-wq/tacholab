import { scenarioDef } from '@/scenarios/library';
import type { SimState } from '@/simulator/state';
import { HOUR } from '@/time-engine/units';
import { BASIC_EXERCISES } from './basic';
import { exerciseSim, withCardInserted } from './setup';
import type { ExerciseContext, ExerciseDef } from './types';

const infr = (c: ExerciseContext, ruleId?: string) =>
  (c.report?.findings ?? []).filter((f) => f.severity === 'infringement' && (!ruleId || f.ruleId === ruleId));
const cont = (c: ExerciseContext) => c.report?.current.continuous;

/** Ejercicio construido sobre un escenario de la biblioteca (mismo calendario coherente). */
function fromScenario(scenarioId: string, number: number, title: string): () => SimState {
  return () => {
    const sim = scenarioDef(scenarioId)!.build();
    return { ...sim, scenario: { ...sim.scenario, title: `Ejercicio ${number}: ${title}`, libraryId: `exercise:${scenarioId}` } };
  };
}

const planned = (number: number, title: string, objective: string): ExerciseDef => ({
  id: `planned-${number}`,
  number,
  title,
  feature: 'academy-advanced',
  status: 'planned',
  objective,
  situation: 'En preparación.',
  deviceState: '—',
  steps: [],
  success: [],
  errors: [],
  explanation: '',
});

const ADVANCED: ExerciseDef[] = [
  {
    id: 'split-break',
    number: 6,
    title: 'Pausa fraccionada 15 + 30',
    feature: 'academy-advanced',
    status: 'available',
    objective: 'Sustituir la pausa de 45 min por una de 15 min seguida de otra de 30 min, en ese orden.',
    situation: 'Lunes, 08:15 UTC. Llevas 2 h conduciendo.',
    deviceState: 'Tarjeta insertada, vehículo en marcha, 2 h de conducción continua.',
    build: () => withCardInserted(exerciseSim('split-break', 'Ejercicio 6: pausa fraccionada 15 + 30'), [['WORK', 15], ['DRIVING', 120]], { moving: true }),
    steps: [
      { text: 'Detente y descansa al menos 15 min (primera fracción).', target: 'VEHICLE', done: (c) => !!cont(c)?.splitFirstTaken || (cont(c)?.currentBreakMs ?? 0) >= 15 * 60e3 },
      { text: 'Reanuda la marcha y conduce un rato más (sin llegar a 4 h 30 min en total).', target: 'VEHICLE', done: (c) => c.sim.vehicle.moving && !!cont(c)?.splitFirstTaken },
      { text: 'Detente de nuevo y descansa al menos 30 min (segunda fracción).', target: 'ACTIVITY', done: (c) => (cont(c)?.periodIndex ?? 0) >= 1 },
    ],
    success: [
      { text: 'Pausa fraccionada válida completada', check: (c) => (cont(c)?.periodIndex ?? 0) >= 1 && c.facts.has('split-first') },
      { text: 'Sin superar 4 h 30 min de conducción continua', check: (c) => infr(c, 'R561-ART7-CONT').length === 0 },
    ],
    errors: [{ text: 'Superaste 4 h 30 min de conducción sin pausa válida.', penalty: 60, ruleId: 'R561-ART7-CONT', check: (c) => infr(c, 'R561-ART7-CONT').length > 0 }],
    explanation:
      'El art. 7 permite sustituir la pausa de 45 min por una de al menos 15 min seguida de otra de al menos 30 min. El orden importa: 30 + 15 no es válido, porque la segunda fracción debe durar al menos 30 min.',
  },
  planned(7, 'Jornada ampliada a 10 horas', 'Usar correctamente una ampliación de la conducción diaria a 10 h.'),
  planned(8, 'Dos ampliaciones en una semana', 'Planificar una semana con las dos ampliaciones permitidas.'),
  planned(9, 'Descanso diario reducido', 'Tomar un descanso diario de 9 h dentro de la ventana de 24 h.'),
  planned(10, 'Descanso diario fraccionado', 'Repartir el descanso diario en 3 h + 9 h.'),
  planned(11, 'Descanso semanal reducido', 'Tomar un descanso semanal reducido de al menos 24 h.'),
  {
    id: 'compensation',
    number: 12,
    title: 'Compensación de descanso',
    feature: 'academy-advanced',
    status: 'available',
    objective: 'Compensar 15 h de un descanso semanal reducido antes de que termine el escenario.',
    situation: 'Domingo de la semana 1, 22:15 UTC: tras seis jornadas solo has descansado 30 h el fin de semana.',
    deviceState: 'Tarjeta insertada, descansando. Compensación pendiente de 15 h.',
    build: fromScenario('reduced-weekly', 12, 'compensación de descanso'),
    steps: [
      { text: 'Trabaja la semana 2 respetando jornadas, pausas y descansos diarios.', target: 'VEHICLE', done: (c) => (c.report?.weeks[1]?.drivingMs ?? 0) >= 9 * HOUR },
      { text: 'Termina con un descanso semanal de al menos 60 h (45 h + 15 h de compensación).', target: 'CLOCK', done: (c) => c.report?.obligations.find((o) => o.ruleId === 'R561-ART8-COMP')?.status === 'fulfilled' },
    ],
    success: [
      { text: 'Compensación de 15 h realizada', check: (c) => c.report?.obligations.find((o) => o.ruleId === 'R561-ART8-COMP')?.status === 'fulfilled' },
      { text: 'Sin infracciones', check: (c) => infr(c).length === 0 },
    ],
    errors: [{ text: 'Infracciones simuladas durante la semana 2.', penalty: 30, check: (c) => infr(c).length > 0 }],
    explanation:
      'Un descanso semanal reducido debe compensarse con un descanso equivalente, en una sola vez, antes del final de la tercera semana siguiente, y unido a otro descanso de al menos 9 h (art. 8.6 ter y 8.7). Tras un reducido, el siguiente descanso semanal de las dos semanas consecutivas debe ser normal (art. 8.6).',
  },
  planned(13, 'Semana de 56 horas', 'Construir una semana legal de 56 h de conducción.'),
  {
    id: 'ninety',
    number: 14,
    title: 'Dos semanas con 90 horas',
    feature: 'academy-advanced',
    status: 'available',
    objective: 'Tras una semana de 56 h, conducir 34 h en la semana 2 sin superar ningún límite.',
    situation: 'Lunes de la semana 2, 13:30 UTC. La semana 1 acumula 56 h de conducción.',
    deviceState: 'Tarjeta insertada, descanso semanal recién terminado.',
    build: fromScenario('week2-34', 14, 'dos semanas con 90 horas'),
    steps: [
      { text: 'Consulta en «Límites normativos» cuánto puedes conducir: el límite de 90 h deja 34 h.', target: 'CLOCK', done: (c) => c.facts.has('clock-running') || (c.report?.weeks[1]?.drivingMs ?? 0) > 0 },
      { text: 'Reparte las 34 h en varias jornadas con sus pausas y descansos diarios.', target: 'VEHICLE', done: (c) => (c.report?.weeks[1]?.drivingMs ?? 0) >= 34 * HOUR },
      { text: 'Avanza hasta el final del escenario descansando (descanso semanal normal).', target: 'CLOCK', done: (c) => c.sim.clock.now >= c.sim.clock.endsAt },
    ],
    success: [
      { text: 'Semana 2 con al menos 34 h de conducción', check: (c) => (c.report?.weeks[1]?.drivingMs ?? 0) >= 34 * HOUR },
      { text: 'Sin infracciones (90 h como máximo)', check: (c) => infr(c).length === 0 },
      { text: 'Descansos semanales de las dos semanas correctos', check: (c) => c.report?.obligations.find((o) => o.id === 'weekly-pair')?.status === 'fulfilled' },
    ],
    errors: [
      { text: 'Superaste las 90 h en dos semanas consecutivas.', penalty: 50, ruleId: 'R561-ART6-BIWEEKLY90', check: (c) => infr(c, 'R561-ART6-BIWEEKLY90').length > 0 },
      { text: 'Otras infracciones simuladas.', penalty: 20, check: (c) => infr(c).some((f) => f.ruleId !== 'R561-ART6-BIWEEKLY90') },
    ],
    explanation:
      'El límite semanal es 56 h, pero en dos semanas consecutivas no se pueden superar 90 h (art. 6.3). Por eso una semana de 56 h obliga a que la siguiente tenga como máximo 34 h.',
  },
  {
    id: 'find-errors',
    number: 15,
    title: 'Identificación de errores en un historial',
    feature: 'academy-advanced',
    status: 'available',
    objective: 'Analizar una semana registrada y señalar qué errores contiene.',
    situation: 'Revisas la semana de un compañero en el calendario y en el informe.',
    deviceState: 'Semana 1 ya registrada.',
    build: fromScenario('find-errors', 15, 'identificación de errores'),
    steps: [],
    quiz: {
      question: 'Revisa el calendario y marca todos los errores que contiene la semana:',
      options: [
        { id: 'cont', text: 'Conducción continua de más de 4 h 30 min', correct: true },
        { id: 'daily10', text: 'Una jornada con más de 10 h de conducción', correct: true },
        { id: 'rest', text: 'Un descanso diario insuficiente', correct: true },
        { id: 'weekly56', text: 'Más de 56 h de conducción en la semana', correct: false },
        { id: 'split', text: 'Una pausa fraccionada en orden incorrecto (30 + 15)', correct: false },
      ],
    },
    success: [
      { text: 'Has marcado todos los errores reales', check: (c) => ['cont', 'daily10', 'rest'].every((a) => c.answers.includes(a)) },
      { text: 'No has marcado errores inexistentes', check: (c) => !c.answers.some((a) => ['weekly56', 'split'].includes(a)) },
    ],
    errors: [],
    explanation:
      'Martes: 5 h seguidas al volante (art. 7). Miércoles: 10 h 45 min de conducción (art. 6.1). Después, solo 8 h de descanso: no cierra la jornada y no hay descanso diario válido dentro de las 24 h (art. 8.2). La semana suma 46 h 45 min, por debajo de 56 h, y no hay pausas fraccionadas.',
  },
  planned(16, 'Simulación completa de transporte durante catorce días', 'Planificar y ejecutar dos semanas completas sin infracciones.'),
];

export const EXERCISES: readonly ExerciseDef[] = [...BASIC_EXERCISES, ...ADVANCED];

export function exerciseDef(id: string | undefined): ExerciseDef | undefined {
  return EXERCISES.find((e) => e.id === id);
}
