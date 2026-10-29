import { DEFAULT_CARDS, normalizeHolderName, PERSONAL_CARD_ID } from '@/scenarios/cards';
import { useSimStore } from '@/simulator/store';
import { useUiStore } from './uiStore';

const EXAMPLE_NAME = DEFAULT_CARDS.find((c) => c.id === PERSONAL_CARD_ID)!.holderName;

/** Guarda el nombre del alumno y lo pone en su tarjeta. Devuelve un mensaje de error o null. */
export function setDriverName(raw: string): string | null {
  const name = normalizeHolderName(raw);
  if (!name) return 'Escribe un nombre de 1 a 18 letras (se admiten espacios, guion y apóstrofo).';
  useUiStore.getState().update({ driverName: name });
  useSimStore.getState().dispatch({ type: 'RENAME_CARD', cardId: PERSONAL_CARD_ID, name });
  return null;
}

/** Vuelve al nombre de ejemplo y borra el nombre guardado. */
export function clearDriverName(): void {
  useUiStore.getState().update({ driverName: '' });
  useSimStore.getState().dispatch({ type: 'RENAME_CARD', cardId: PERSONAL_CARD_ID, name: EXAMPLE_NAME });
}

/**
 * Mantiene el nombre del alumno en su tarjeta aunque se cargue un escenario,
 * un ejercicio o se reinicie la simulación. Devuelve la función para dejar de observar.
 */
export function syncDriverName(): () => void {
  const apply = () => {
    const name = useUiStore.getState().driverName;
    const card = useSimStore.getState().sim.cards[PERSONAL_CARD_ID];
    if (name && card && card.holderName !== name) useSimStore.getState().dispatch({ type: 'RENAME_CARD', cardId: PERSONAL_CARD_ID, name });
  };
  apply();
  const a = useSimStore.subscribe((s, prev) => s.sim.cards !== prev.sim.cards && apply());
  const b = useUiStore.subscribe((s, prev) => s.driverName !== prev.driverName && apply());
  return () => {
    a();
    b();
  };
}
