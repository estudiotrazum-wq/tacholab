import type { SimState } from '@/simulator/state';
import { deriveSummary } from '@/simulator/derived';
import { CONTINUOUS_DRIVING_PREWARN } from '@/regulations/continuousDriving';

/** Elemento de la interfaz a resaltar en modo asistido. */
export type AssistTarget = 'CARD_SLOT' | 'OK' | 'UP_DOWN' | 'ACTIVITY' | 'VEHICLE' | 'CLOCK' | 'BACK' | null;

export interface AssistHint {
  text: string;
  target: AssistTarget;
}

/** Guía contextual del modo asistido, derivada del estado (sin efectos). */
export function assistHint(sim: SimState): AssistHint {
  const d = sim.device;
  if (d.warning) return { text: 'Lee el aviso y pulsa ✓ (OK) para confirmarlo.', target: 'OK' };
  switch (d.screen.kind) {
    case 'WELCOME':
      return { text: 'El equipo muestra el titular y la última retirada. Pulsa ✓ para continuar.', target: 'OK' };
    case 'MANUAL_ASK':
      return { text: 'Hubo un periodo sin tarjeta. Elige SÍ con ▲▼ para declararlo y confirma con ✓.', target: 'UP_DOWN' };
    case 'MANUAL_EDIT':
      return d.screen.field === 'activity'
        ? { text: 'Elige con ▲▼ qué hiciste durante ese periodo (normalmente descanso) y pulsa ✓.', target: 'UP_DOWN' }
        : { text: 'Ajusta con ▲▼ la hora de fin (pasos de 15 min) y pulsa ✓.', target: 'UP_DOWN' };
    case 'MANUAL_CONFIRM':
      return { text: 'Revisa y confirma la entrada manual con ✓.', target: 'OK' };
    case 'COUNTRY':
      return { text: 'Selecciona el país con ▲▼ y confirma con ✓.', target: 'UP_DOWN' };
    case 'MENU':
      return { text: 'Navega con ▲▼, abre con ✓ y vuelve con ✕.', target: 'UP_DOWN' };
    default:
      break;
  }
  if (!d.insertedCardId) {
    return sim.vehicle.moving
      ? { text: 'Estás circulando sin tarjeta. Detén el vehículo e inserta tu tarjeta ficticia.', target: 'VEHICLE' }
      : { text: 'Inserta la tarjeta de conductor ficticia en la ranura.', target: 'CARD_SLOT' };
  }
  if (sim.clock.speed === 0) return { text: 'El reloj virtual está en pausa. Elige una velocidad (×1 … ×60) para que pase el tiempo.', target: 'CLOCK' };
  const sum = deriveSummary(sim);
  const cont = sum.continuous?.drivingSinceBreakMs ?? 0;
  if (sim.vehicle.moving) {
    return cont >= CONTINUOUS_DRIVING_PREWARN
      ? { text: 'Te acercas a 4 h 30 min de conducción continua. Detén el vehículo y selecciona pausa.', target: 'VEHICLE' }
      : { text: 'Con el vehículo en marcha el equipo registra CONDUCCIÓN automáticamente.', target: null };
  }
  if (cont >= CONTINUOUS_DRIVING_PREWARN && d.selected !== 'REST') {
    return { text: 'Necesitas una pausa: pulsa el botón de actividad hasta ver la cama (descanso).', target: 'ACTIVITY' };
  }
  if (d.selected === 'WORK') {
    return { text: 'Vehículo parado: se registra OTROS TRABAJOS. Cambia la actividad o inicia la marcha.', target: 'ACTIVITY' };
  }
  return { text: 'Inicia la marcha para conducir, o cambia la actividad con el botón de actividad.', target: 'VEHICLE' };
}
