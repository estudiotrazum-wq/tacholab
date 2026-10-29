import type { SimState } from '@/simulator/state';
import { deriveSummary } from '@/simulator/derived';
import { CONTINUOUS_DRIVING_PREWARN } from '@/regulations/continuousDriving';

/** Elemento de la interfaz a resaltar en modo asistido. */
export type AssistTarget = 'CARD_SLOT' | 'OK' | 'UP_DOWN' | 'ACTIVITY' | 'VEHICLE' | 'CLOCK' | 'BACK' | 'EJECT' | null;

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
      return { text: 'El equipo te da la bienvenida con tu nombre y la hora local. Pulsa OK.', target: 'OK' };
    case 'LAST_WITHDRAWAL':
      return { text: 'Es la fecha y hora en que sacaste la tarjeta al terminar la última jornada. Pulsa OK.', target: 'OK' };
    case 'MANUAL_ASK':
      return { text: 'Hubo un periodo sin tarjeta. Elige SÍ con ▲▼ para declararlo y confirma con ✓.', target: 'UP_DOWN' };
    case 'MANUAL_EDIT':
      return d.screen.field === 'activity'
        ? { text: 'Elige con ▲▼ qué hiciste en ese tiempo sin tarjeta (normalmente descanso, la cama) y pulsa OK.', target: 'UP_DOWN' }
        : d.screen.field === 'hour'
          ? { text: 'Ajusta con ▲▼ la HORA en que terminó esa actividad y pulsa OK. Si duró hasta ahora, no cambies nada.', target: 'UP_DOWN' }
          : { text: 'Ajusta con ▲▼ los MINUTOS y pulsa OK.', target: 'UP_DOWN' };
    case 'MANUAL_CONFIRM':
      return { text: 'Revisa y confirma la entrada manual con ✓.', target: 'OK' };
    case 'COUNTRY':
      return d.screen.purpose === 'prev-end'
        ? { text: 'Indica en qué país terminó tu jornada anterior (▲▼) y pulsa OK.', target: 'UP_DOWN' }
        : d.screen.purpose === 'start'
          ? { text: 'Indica el país donde empiezas hoy (▲▼) y pulsa OK.', target: 'UP_DOWN' }
          : { text: 'Indica el país donde terminas la jornada (▲▼) y pulsa OK para sacar la tarjeta.', target: 'UP_DOWN' };
    case 'WITHDRAW_PRINT':
      return { text: 'Elige con ▲▼ si quieres el ticket de las últimas 24 h y pulsa OK: la tarjeta saldrá de la ranura.', target: 'OK' };
    case 'REGION':
      return { text: 'En España el tacógrafo pide también la comunidad autónoma: elígela con ▲▼ y pulsa OK (✕ vuelve al país).', target: 'UP_DOWN' };
    case 'MENU':
      return { text: 'Navega con ▲▼, abre con ✓ y vuelve con ✕.', target: 'UP_DOWN' };
    default:
      break;
  }
  if (!d.insertedCardId) {
    return sim.vehicle.moving
      ? { text: 'Estás circulando sin tarjeta. Suelta el acelerador e inserta tu tarjeta ficticia.', target: 'VEHICLE' }
      : { text: 'Arrastra tu tarjeta de conductor ficticia hasta la ranura 1 del tacógrafo.', target: 'CARD_SLOT' };
  }
  if (sim.clock.speed === 0) return { text: 'El reloj virtual está en pausa. Elige una velocidad (×1 … ×60) para que pase el tiempo.', target: 'CLOCK' };
  const sum = deriveSummary(sim);
  const cont = sum.continuous?.drivingSinceBreakMs ?? 0;
  if (sim.vehicle.moving) {
    return cont >= CONTINUOUS_DRIVING_PREWARN
      ? { text: 'Te acercas a 4 h 30 min de conducción continua. Suelta el acelerador y selecciona pausa (cama).', target: 'VEHICLE' }
      : { text: 'Con el vehículo en marcha el equipo registra CONDUCCIÓN automáticamente.', target: null };
  }
  if (cont >= CONTINUOUS_DRIVING_PREWARN && d.selected !== 'REST') {
    return { text: 'Necesitas una pausa: pulsa la tecla 1 hasta ver la cama (descanso).', target: 'ACTIVITY' };
  }
  if (d.selected === 'WORK') {
    return { text: 'Vehículo parado: se registra OTROS TRABAJOS. Cambia la actividad con la tecla 1 o acelera para conducir.', target: 'ACTIVITY' };
  }
  return sim.vehicle.ignition === 'running'
    ? { text: 'Sube el acelerador para conducir, o cambia la actividad con la tecla 1.', target: 'VEHICLE' }
    : { text: 'Gira la llave a II para arrancar el motor y después sube el acelerador.', target: 'VEHICLE' };
}
