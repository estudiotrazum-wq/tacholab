import { create } from 'zustand';
import { browserStorage, KEYS } from '@/persistence/storage';
import { recordResult, type ProgressMap } from '@/achievements/badges';
import { useSimStore } from '@/simulator/store';
import type { SimState } from '@/simulator/state';
import { exerciseDef } from './catalog';
import { advanceSession, gradeSession, startSession } from './session';
import type { ExerciseDef, ExerciseResult, ExerciseSession } from './types';

/** Progreso de la academia y ejercicio en curso (persistidos en este navegador). */
interface AcademyStore {
  progress: ProgressMap;
  session: ExerciseSession | null;
  start: (def: ExerciseDef) => void;
  observe: (sim: SimState) => void;
  setShowInstructions: (show: boolean) => void;
  toggleAnswer: (id: string) => void;
  finish: () => ExerciseResult | null;
  close: () => void;
}

interface Persisted {
  progress: ProgressMap;
  session: ExerciseSession | null;
}

function load(): Persisted {
  try {
    const raw = browserStorage().getItem(KEYS.academy);
    const p = raw ? (JSON.parse(raw) as Partial<Persisted>) : {};
    return { progress: p.progress ?? {}, session: p.session && exerciseDef(p.session.exerciseId) ? p.session : null };
  } catch {
    return { progress: {}, session: null };
  }
}

export const useAcademyStore = create<AcademyStore>((set, get) => {
  const save = () => {
    const { progress, session } = get();
    try {
      browserStorage().setItem(KEYS.academy, JSON.stringify({ progress, session }));
    } catch {
      /* sin almacenamiento */
    }
  };
  const update = (patch: Partial<Persisted>) => {
    set(patch);
    save();
  };
  return {
    ...load(),
    start: (def) => {
      if (!def.build) return;
      const sim = def.build();
      useSimStore.getState().loadSim(sim);
      update({ session: startSession(def, sim) });
    },
    observe: (sim) => {
      const { session } = get();
      if (!session || session.result) return;
      const def = exerciseDef(session.exerciseId);
      // Si se ha cargado otro escenario, el ejercicio deja de estar en curso.
      if (!def || sim.scenario.libraryId !== session.scenarioKey) {
        update({ session: null });
        return;
      }
      const next = advanceSession(session, sim, def);
      if (next.stepIndex !== session.stepIndex || next.facts.length !== session.facts.length || next.stepFacts.length !== session.stepFacts.length) {
        update({ session: next });
      }
    },
    setShowInstructions: (show) => {
      const { session } = get();
      if (session) update({ session: { ...session, showInstructions: show } });
    },
    toggleAnswer: (id) => {
      const { session } = get();
      if (!session) return;
      const answers = session.answers.includes(id) ? session.answers.filter((a) => a !== id) : [...session.answers, id];
      update({ session: { ...session, answers } });
    },
    finish: () => {
      const { session, progress } = get();
      const def = session && exerciseDef(session.exerciseId);
      if (!session || !def) return null;
      const result = gradeSession(session, useSimStore.getState().sim, def);
      update({ session: { ...session, result }, progress: recordResult(progress, def.id, result) });
      return result;
    },
    close: () => update({ session: null }),
  };
});
