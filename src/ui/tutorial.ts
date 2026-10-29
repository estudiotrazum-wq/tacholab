import { useAcademyStore } from '@/academy/store';
import { useSimStore } from '@/simulator/store';
import { useTutorialStore } from '@/tutorial/store';
import { confirmThen } from './confirm';
import { useUiStore } from './uiStore';

/** Empieza el tutorial de inicio en un turno nuevo (pide confirmación si hay actividad que se perdería). */
export function startTutorial(): void {
  const begin = () => {
    useAcademyStore.getState().close();
    useSimStore.getState().reset();
    useUiStore.getState().go('device');
    useTutorialStore.getState().begin(useSimStore.getState().sim);
  };
  const sim = useSimStore.getState().sim;
  if (sim.log.length === 0 && sim.timeline.events.length === 0) return begin();
  confirmThen('El tutorial empieza un turno nuevo desde cero. Lo que has hecho en el simulador se perderá si no lo has guardado como punto de restauración.', begin, { confirmLabel: 'Empezar el tutorial' });
}
