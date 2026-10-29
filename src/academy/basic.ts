import { driverEvents } from '@/time-engine/timeline';
import type { ExerciseContext, ExerciseDef } from './types';
import { DRIVER, exerciseSim, HOUR, MINUTE, total, withCardInserted } from './setup';

const has = (c: ExerciseContext, f: string) => c.stepFacts.has(f);
const logged = (c: ExerciseContext, kind: string) => c.newLog.some((l) => l.kind === kind);
const infringements = (c: ExerciseContext, ruleId?: string) =>
  (c.report?.findings ?? []).filter((f) => f.severity === 'infringement' && (!ruleId || f.ruleId === ruleId));
const contPeriods = (c: ExerciseContext) => c.report?.current.continuous.periodIndex ?? 0;

/** Ejercicios gratuitos 1–5. */
export const BASIC_EXERCISES: ExerciseDef[] = [
  {
    id: 'buttons',
    number: 1,
    title: 'Conocer los botones',
    feature: 'academy-basic',
    status: 'available',
    objective: 'Recorrer las pantallas y el menú del tacógrafo con sus botones.',
    situation: 'Estás en la cabina con el vehículo parado. Aún no has insertado la tarjeta.',
    deviceState: 'Pantalla principal, sin tarjeta.',
    build: () => exerciseSim('buttons', 'Ejercicio 1: conocer los botones'),
    steps: [
      { text: 'Pulsa ▼ para ver la segunda página de la pantalla principal.', target: 'UP_DOWN', done: (c) => has(c, 'page:1') },
      { text: 'Pulsa ▼ otra vez: la tercera página muestra la hora UTC y la hora local.', target: 'UP_DOWN', done: (c) => has(c, 'page:2') },
      { text: 'Pulsa ✓ para abrir el menú.', target: 'OK', done: (c) => has(c, 'screen:MENU') },
      { text: 'Con ▲ ▼ busca «Información equipo» y ábrelo con ✓.', target: 'UP_DOWN', done: (c) => has(c, 'screen:DEVICE_INFO') },
      { text: 'Pulsa ✕ hasta volver a la pantalla principal.', target: 'BACK', done: (c) => has(c, 'screen:STANDARD') },
      { text: 'Pulsa el botón de actividad: sin tarjeta, el equipo te pedirá que la insertes.', target: 'ACTIVITY', done: (c) => has(c, 'notice:Inserte una tarjeta') },
    ],
    success: [{ text: 'Has usado ▲ ▼, ✓, ✕ y el botón de actividad', check: (c) => c.allStepsDone }],
    errors: [],
    explanation:
      '▲ ▼ recorren páginas y opciones; ✓ abre el menú y confirma; ✕ retrocede. El botón de actividad solo funciona con tarjeta y con el vehículo parado: en marcha, el equipo registra conducción automáticamente. Recuerda: este dispositivo es ficticio y los equipos reales varían según el fabricante y la generación.',
  },
  {
    id: 'insert-card',
    number: 2,
    title: 'Insertar una tarjeta ficticia',
    feature: 'academy-basic',
    status: 'available',
    objective: 'Seguir el procedimiento de inserción: bienvenida, última retirada, entrada manual, país de fin de la jornada anterior y país de inicio.',
    situation: 'Ayer retiraste la tarjeta a las 20:00 UTC y descansaste en casa. Son las 06:00 UTC del lunes.',
    deviceState: 'Sin tarjeta. La tarjeta guarda la hora de la última retirada.',
    build: () => {
      const sim = exerciseSim('insert-card', 'Ejercicio 2: insertar una tarjeta ficticia');
      return { ...sim, cards: { ...sim.cards, [DRIVER]: { ...sim.cards[DRIVER]!, lastWithdrawalAt: sim.scenario.startsAt - 10 * HOUR } } };
    },
    steps: [
      { text: 'Arrastra la tarjeta ficticia hasta la ranura 1 (o pulsa la ranura).', target: 'CARD_SLOT', done: (c) => c.sim.device.insertedCardId !== null },
      { text: 'Lee la bienvenida y pulsa OK.', target: 'OK', done: (c) => has(c, 'screen:LAST_WITHDRAWAL') },
      { text: 'Comprueba la última retirada (fin de la jornada anterior) y pulsa OK.', target: 'OK', done: (c) => has(c, 'screen:MANUAL_ASK') },
      { text: 'Elige SÍ para hacer la entrada manual del tiempo sin tarjeta y pulsa OK.', target: 'OK', done: (c) => has(c, 'screen:MANUAL_EDIT') },
      { text: 'Deja la cama (descanso) como actividad y pulsa OK; la hora y los minutos de fin ya llegan hasta ahora: OK y OK.', target: 'OK', done: (c) => has(c, 'screen:COUNTRY') },
      { text: 'Indica el país donde terminó la jornada anterior (España) y pulsa OK.', target: 'OK', done: (c) => has(c, 'screen:MANUAL_CONFIRM') },
      { text: 'Confirma la entrada manual con SÍ.', target: 'OK', done: (c) => logged(c, 'MANUAL_ENTRY') },
      { text: 'Selecciona el país de inicio (España) y confírmalo: el equipo muestra «Listo para conducir».', target: 'OK', done: (c) => logged(c, 'COUNTRY_START') },
    ],
    success: [
      {
        text: 'El periodo sin tarjeta (20:00–06:00) está declarado como descanso',
        check: (c) => {
          const from = c.sim.scenario.startsAt - 10 * HOUR;
          const manual = driverEvents(c.sim.timeline, DRIVER).filter((e) => e.source === 'manual' && e.activity === 'REST');
          return manual.some((e) => e.start === from && e.end === c.sim.device.insertedAt);
        },
      },
      { text: 'País de inicio registrado', check: (c) => logged(c, 'COUNTRY_START') },
    ],
    errors: [
      { text: 'No declaraste el periodo sin tarjeta: queda como «desconocido» y no cuenta como descanso.', penalty: 40, check: (c) => logged(c, 'MANUAL_SKIPPED') },
      { text: 'Declaraste trabajo o disponibilidad durante la noche en casa.', penalty: 20, check: (c) => driverEvents(c.sim.timeline, DRIVER).some((e) => e.source === 'manual' && e.activity !== 'REST') },
      { text: 'Iniciaste la marcha antes de terminar el procedimiento de inserción.', penalty: 20, check: (c) => { const i = c.newLog.findIndex((l) => l.kind === 'COUNTRY_START'); const v = c.newLog.findIndex((l) => l.kind === 'VEHICLE_START'); return v >= 0 && (i < 0 || v < i); } },
    ],
    explanation:
      'Al insertar la tarjeta, el equipo ofrece introducir manualmente lo que hiciste desde la última retirada (art. 6.5 del Reglamento 561/2006 y art. 34 del Reglamento 165/2014). Un periodo no declarado queda como desconocido: en TachoLab no cuenta como descanso, lo que puede generar infracciones de descanso diario.',
  },
  {
    id: 'activities',
    number: 3,
    title: 'Seleccionar actividades',
    feature: 'academy-basic',
    status: 'available',
    objective: 'Registrar otros trabajos, disponibilidad, conducción y descanso, y ver cómo cambia el registro.',
    situation: 'Lunes, 06:00 UTC. Tarjeta insertada; vas a preparar el vehículo antes de salir.',
    deviceState: 'Tarjeta insertada, actividad seleccionada: descanso.',
    build: () => withCardInserted(exerciseSim('activities', 'Ejercicio 3: seleccionar actividades')),
    steps: [
      { text: 'Pulsa el botón de actividad hasta seleccionar «Otros trabajos» (martillos).', target: 'ACTIVITY', done: (c) => c.sim.device.selected === 'WORK' },
      { text: 'Pon en marcha el reloj (o usa +15 min) y registra al menos 30 min de otros trabajos.', target: 'CLOCK', done: (c) => total(c.sim, 'WORK') >= 30 * MINUTE },
      { text: 'Cambia a «Disponibilidad» y registra al menos 15 min de espera.', target: 'ACTIVITY', done: (c) => total(c.sim, 'AVAILABILITY') >= 15 * MINUTE },
      { text: 'Inicia la marcha y conduce al menos 30 min.', target: 'VEHICLE', done: (c) => total(c.sim, 'DRIVING') >= 30 * MINUTE },
      { text: 'Detén el vehículo: observa que el equipo pasa a «Otros trabajos».', target: 'VEHICLE', done: (c) => !c.sim.vehicle.moving },
      { text: 'Selecciona «Descanso» (cama).', target: 'ACTIVITY', done: (c) => c.sim.device.selected === 'REST' && !c.sim.vehicle.moving },
    ],
    success: [
      { text: 'Al menos 30 min de otros trabajos', check: (c) => total(c.sim, 'WORK') >= 30 * MINUTE },
      { text: 'Al menos 15 min de disponibilidad', check: (c) => total(c.sim, 'AVAILABILITY') >= 15 * MINUTE },
      { text: 'Al menos 30 min de conducción', check: (c) => total(c.sim, 'DRIVING') >= 30 * MINUTE },
      { text: 'Termina en descanso', check: (c) => c.sim.device.selected === 'REST' && !c.sim.vehicle.moving },
    ],
    errors: [],
    explanation:
      'Otros trabajos (carga, comprobaciones) es tiempo de trabajo; la disponibilidad es espera conocida de antemano y no es descanso; la conducción la registra el equipo al moverse el vehículo. La actividad seleccionada y la registrada pueden diferir: en marcha siempre se registra conducción.',
  },
  {
    id: 'simple-day',
    number: 4,
    title: 'Registrar una jornada sencilla',
    feature: 'academy-basic',
    status: 'available',
    objective: 'Completar una jornada de 6 a 9 h de conducción con su pausa y retirar la tarjeta al final.',
    situation: 'Lunes, 06:00 UTC. Tienes un reparto regional por delante.',
    deviceState: 'Tarjeta insertada, actividad seleccionada: descanso.',
    build: () => withCardInserted(exerciseSim('simple-day', 'Ejercicio 4: jornada sencilla')),
    steps: [
      { text: 'Empieza con al menos 15 min de otros trabajos (comprobaciones del vehículo).', target: 'ACTIVITY', done: (c) => total(c.sim, 'WORK') >= 15 * MINUTE },
      { text: 'Conduce y, antes de llegar a 4 h 30 min, haz una pausa de 45 min (detente y selecciona descanso).', target: 'VEHICLE', done: (c) => contPeriods(c) >= 1 && total(c.sim, 'DRIVING') >= HOUR },
      { text: 'Sigue conduciendo hasta sumar entre 6 h y 9 h de conducción.', target: 'VEHICLE', done: (c) => total(c.sim, 'DRIVING') >= 6 * HOUR },
      { text: 'Detén el vehículo y selecciona descanso.', target: 'ACTIVITY', done: (c) => !c.sim.vehicle.moving && c.sim.device.selected === 'REST' },
      { text: 'Retira la tarjeta (⏏), confirma el país de fin y elige si imprimir.', target: 'EJECT', done: (c) => logged(c, 'CARD_OUT') },
    ],
    success: [
      { text: 'Entre 6 h y 9 h de conducción', check: (c) => total(c.sim, 'DRIVING') >= 6 * HOUR && total(c.sim, 'DRIVING') <= 9 * HOUR },
      { text: 'Tarjeta retirada al final de la jornada', check: (c) => logged(c, 'CARD_OUT') },
      { text: 'Sin infracciones simuladas', check: (c) => infringements(c).length === 0 },
    ],
    errors: [
      { text: 'Más de 4 h 30 min de conducción sin pausa válida.', penalty: 40, ruleId: 'R561-ART7-CONT', check: (c) => infringements(c, 'R561-ART7-CONT').length > 0 },
      { text: 'Otra infracción simulada en la jornada.', penalty: 20, check: (c) => infringements(c).some((f) => f.ruleId !== 'R561-ART7-CONT') },
    ],
    explanation:
      'Una jornada típica: comprobaciones, conducción en bloques de hasta 4 h 30 min separados por pausas de 45 min (o 15 + 30) y fin de la jornada con el descanso diario. El tiempo diario de conducción se cuenta entre descansos diarios, no por días naturales (art. 4 k).',
  },
  {
    id: 'break-45',
    number: 5,
    title: 'Realizar una pausa de 45 minutos',
    feature: 'academy-basic',
    status: 'available',
    objective: 'Detenerte a tiempo y completar una pausa válida de 45 min antes de superar 4 h 30 min.',
    situation: 'Lunes, 10:15 UTC. Llevas 4 h conduciendo sin pausa.',
    deviceState: 'Tarjeta insertada, vehículo en marcha, 4 h de conducción continua.',
    build: () => withCardInserted(exerciseSim('break-45', 'Ejercicio 5: pausa de 45 minutos'), [['WORK', 15], ['DRIVING', 240]], { moving: true }),
    steps: [
      { text: 'Deja correr el reloj hasta que el equipo avise de la pausa (4 h 15 min).', target: 'CLOCK', done: (c) => c.newLog.some((l) => l.text.startsWith('Pausa próxima')) },
      { text: 'Confirma el aviso con ✓, detén el vehículo y selecciona descanso.', target: 'VEHICLE', done: (c) => !c.sim.vehicle.moving && c.sim.device.selected === 'REST' && !c.sim.device.warning },
      { text: 'Descansa al menos 45 min seguidos (puedes usar «Siguiente»).', target: 'CLOCK', done: (c) => contPeriods(c) >= 1 },
      { text: 'Reanuda la marcha: la conducción continua empieza de cero.', target: 'VEHICLE', done: (c) => c.sim.vehicle.moving && contPeriods(c) >= 1 },
    ],
    success: [
      { text: 'Pausa válida completada', check: (c) => contPeriods(c) >= 1 },
      { text: 'Sin superar 4 h 30 min de conducción continua', check: (c) => infringements(c, 'R561-ART7-CONT').length === 0 },
    ],
    errors: [{ text: 'Superaste 4 h 30 min de conducción sin pausa válida.', penalty: 60, ruleId: 'R561-ART7-CONT', check: (c) => infringements(c, 'R561-ART7-CONT').length > 0 }],
    explanation:
      'Tras 4 h 30 min de conducción hay que hacer una pausa ininterrumpida de al menos 45 min (art. 7). Otros trabajos o disponibilidad no cuentan como pausa. El aviso de 4 h 15 min te da margen para encontrar dónde parar.',
  },
];
