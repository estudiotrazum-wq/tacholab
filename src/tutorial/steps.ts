import type { AssistTarget } from '@/academy/assist';
import type { SimState } from '@/simulator/state';
import { MINUTE } from '@/time-engine/units';

/**
 * Tutorial de inicio: recorrido guiado por el panel del simulador.
 * Cada paso señala una pieza (atributo `data-tour`) y avanza solo cuando el
 * alumno hace la acción (`done`) o, si es informativo, al pulsar «Siguiente».
 * Es lógica pura: se prueba con el motor sin interfaz.
 */
export interface TutorialStep {
  id: string;
  title: string;
  text: string;
  /** Pieza resaltada (valor de `data-tour`); null = sin foco, tarjeta centrada. */
  target: string | null;
  /** Elemento del tacógrafo que además parpadea (mismo sistema que la ayuda contextual). */
  assist?: AssistTarget;
  /** Condición de paso completado. `start` es el estado al comenzar el paso. Sin ella, el paso es informativo. */
  done?: (sim: SimState, start: SimState) => boolean;
  /** Pista breve de qué hacer exactamente. */
  hint?: string;
}

const screen = (sim: SimState) => sim.device.screen.kind;
const logged = (sim: SimState, start: SimState, kind: string) => sim.log.slice(start.log.length).some((l) => l.kind === kind);

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'intro',
    title: 'Tu primer turno con el tacógrafo',
    text: 'En unos 5 minutos harás un turno completo: meter la tarjeta, arrancar, conducir, descansar y sacar la tarjeta. Cada paso se completa haciendo la acción en el propio simulador.',
    target: null,
  },
  {
    id: 'device',
    title: 'El tacógrafo',
    text: 'Pantalla de dos líneas, teclas ✕ ▲ ▼ OK para los menús, impresora y dos ranuras de tarjeta. Las teclas 1 y 2 sirven para elegir la actividad y, manteniéndolas pulsadas, para sacar la tarjeta.',
    target: 'tachograph',
  },
  {
    id: 'insert',
    title: 'Mete la tarjeta de conductor',
    text: 'Arrastra tu tarjeta ficticia (la primera de la bandeja) hasta la ranura 1, o pulsa directamente la ranura.',
    hint: 'Ranura 1: el hueco oscuro de abajo a la izquierda del tacógrafo.',
    target: 'card-slot',
    assist: 'CARD_SLOT',
    done: (s) => s.device.insertedCardId !== null,
  },
  {
    id: 'welcome',
    title: 'Bienvenida',
    text: 'El tacógrafo muestra tu nombre, la hora local (⊙) y la hora UTC, que es la que usa para registrar. Pulsa OK para seguir.',
    target: 'console',
    assist: 'OK',
    done: (s) => screen(s) !== 'WELCOME',
  },
  {
    id: 'last-withdrawal',
    title: 'Última retirada',
    text: 'Muestra cuándo sacaste la tarjeta por última vez (en hora local). Como es tu primer uso, pone «primer uso». Pulsa OK.',
    hint: 'Si hubiera un hueco desde la última retirada, ahora te pediría las entradas manuales. Lo practicarás en el ejercicio 2 de la Academia.',
    target: 'console',
    assist: 'OK',
    done: (s) => screen(s) !== 'LAST_WITHDRAWAL' && screen(s) !== 'WELCOME',
  },
  {
    id: 'country-start',
    title: 'País de inicio',
    text: 'Elige con ▲ ▼ el país donde empiezas la jornada (España está seleccionada) y pulsa OK. En España te pide también la comunidad autónoma: elígela y pulsa OK.',
    target: 'console',
    assist: 'UP_DOWN',
    done: (s, st) => logged(s, st, 'COUNTRY_START'),
  },
  {
    id: 'ignition-on',
    title: 'Da el contacto',
    text: 'Gira la llave a la posición I. Se enciende la iluminación de la pantalla del tacógrafo.',
    target: 'ignition',
    assist: 'VEHICLE',
    done: (s) => (s.vehicle.ignition ?? 'off') !== 'off',
  },
  {
    id: 'ignition-start',
    title: 'Arranca el motor',
    text: 'Gira la llave a II. Es una posición de arranque: la llave vuelve sola a I y el motor queda en marcha.',
    target: 'ignition',
    assist: 'VEHICLE',
    done: (s) => s.vehicle.ignition === 'running',
  },
  {
    id: 'drive',
    title: 'A conducir',
    text: 'Sube el acelerador. En cuanto el camión se mueve, el tacógrafo registra «conducción» él solo: no hay que pulsar nada.',
    target: 'accelerator',
    assist: 'VEHICLE',
    done: (s) => s.vehicle.moving,
  },
  {
    id: 'time',
    title: 'Haz pasar el tiempo',
    text: 'Pulsa ▶ o arrastra el cursor de la línea de tiempo hacia la derecha. Con el deslizador «Velocidad del reloj» puedes ir hasta ×3600 (una hora por segundo). Avanza al menos 30 minutos.',
    hint: 'El tiempo solo va hacia delante, como en la realidad. A partir de ×300 el reloj se pausa solo cuando salta un aviso.',
    target: 'time',
    assist: 'CLOCK',
    done: (s, st) => s.clock.now - st.clock.now >= 30 * MINUTE,
  },
  {
    id: 'read',
    title: '¿Cuánto te queda de conducción?',
    text: 'La pantalla estándar muestra hora, velocidad, tu actividad y el cuentakilómetros. Pulsa ▼ para ver tus tiempos (conducción continua y descanso acumulado) y ▼ otra vez para ver cuánto te queda: hasta la pausa obligatoria (4 h 30 seguidas) y hasta el final de la jornada.',
    hint: 'Con ▲ ▼ recorres: estándar, tiempos, restante, jornada (13 h con descanso de 11 h / 15 h con reducido de 9 h), acumulados y hora UTC/local. Lo que te queda también aparece siempre en la barra de abajo («Te queda»). El panel «Te limita» de la derecha es una ayuda del simulador, no parte del tacógrafo.',
    target: 'console',
    assist: 'UP_DOWN',
    done: (s) => s.device.screen.kind === 'STANDARD' && s.device.screen.page === 2,
  },
  {
    id: 'stop',
    title: 'Detén el camión',
    text: 'Baja el acelerador hasta 0. Al pararse, el tacógrafo pasa a «otros trabajos».',
    target: 'accelerator',
    assist: 'VEHICLE',
    done: (s) => !s.vehicle.moving,
  },
  {
    id: 'activity',
    title: 'Elige la actividad: descanso',
    text: 'Pulsa la tecla 1 (pulsación corta) hasta que aparezca el símbolo de la cama: descanso o pausa.',
    hint: 'Cada pulsación cambia: otros trabajos → disponibilidad → descanso.',
    target: 'activity',
    assist: 'ACTIVITY',
    done: (s) => s.device.selected === 'REST',
  },
  {
    id: 'eject',
    title: 'Saca la tarjeta',
    text: 'Pulsa el botón ⏏ junto a la ranura 1 (o mantén pulsada la tecla 1). El camión tiene que estar parado.',
    target: 'eject',
    assist: 'EJECT',
    done: (s) => s.device.insertedCardId === null || (screen(s) === 'COUNTRY' || screen(s) === 'WITHDRAW_PRINT'),
  },
  {
    id: 'country-end',
    title: 'País de fin e impresión',
    text: 'Confirma el país de fin y, en España, la comunidad autónoma (OK y OK). Después elige si quieres el ticket de 24 h (▲ ▼) y pulsa OK: la tarjeta sale de la ranura.',
    target: 'console',
    assist: 'OK',
    done: (s) => s.device.insertedCardId === null,
  },
  {
    id: 'done',
    title: '¡Turno completado!',
    text: 'Ya conoces el ciclo básico. Sigue con los ejercicios de la Academia (entradas manuales, pausas, descansos) y revisa tus tiempos en «Mis semanas». Puedes repetir este tutorial cuando quieras desde «Guía».',
    target: null,
  },
];

/** Avanza mientras los pasos con condición estén cumplidos (las acciones rápidas pueden completar varios). */
export function advanceTutorial(index: number, sim: SimState, start: SimState): { index: number; start: SimState } {
  let i = index;
  let st = start;
  for (;;) {
    const step = TUTORIAL_STEPS[i];
    if (!step?.done || !step.done(sim, st)) return { index: i, start: st };
    i += 1;
    st = sim;
  }
}
