import { create } from 'zustand';
import type { SimState } from '@/simulator/state';
import { advanceTutorial, TUTORIAL_STEPS } from './steps';

/** Tutorial en curso (no se guarda: al recargar la página se puede volver a empezar desde «Guía»). */
interface TutorialStore {
  active: boolean;
  index: number;
  /** Estado de la simulación al empezar el paso actual. */
  stepStart: SimState | null;
  begin: (sim: SimState) => void;
  observe: (sim: SimState) => void;
  next: (sim: SimState) => void;
  back: (sim: SimState) => void;
  exit: () => void;
}

export const useTutorialStore = create<TutorialStore>((set, get) => ({
  active: false,
  index: 0,
  stepStart: null,
  begin: (sim) => set({ active: true, index: 0, stepStart: sim }),
  observe: (sim) => {
    const { active, index, stepStart } = get();
    if (!active || !stepStart) return;
    const r = advanceTutorial(index, sim, stepStart);
    if (r.index !== index) set({ index: r.index, stepStart: r.start });
  },
  next: (sim) => {
    const { index } = get();
    if (index >= TUTORIAL_STEPS.length - 1) return;
    const r = advanceTutorial(index + 1, sim, sim);
    set({ index: r.index, stepStart: r.start });
  },
  back: (sim) => {
    const { index } = get();
    if (index > 0) set({ index: index - 1, stepStart: sim });
  },
  exit: () => set({ active: false, index: 0, stepStart: null }),
}));
