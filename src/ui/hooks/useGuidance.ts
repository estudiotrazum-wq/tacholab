import { assistHint, type AssistTarget } from '@/academy/assist';
import { exerciseDef } from '@/academy/catalog';
import { useAcademyStore } from '@/academy/store';
import { useSimStore } from '@/simulator/store';
import { TUTORIAL_STEPS } from '@/tutorial/steps';
import { useTutorialStore } from '@/tutorial/store';
import { useUiStore } from '../uiStore';

/**
 * Guía activa: el paso del ejercicio en curso (si se muestran las instrucciones)
 * o, fuera de los ejercicios, la ayuda del modo asistido.
 */
export function useGuidance(): { text: string; target: AssistTarget; source: 'exercise' | 'assist' | 'tutorial' } | null {
  const sim = useSimStore((s) => s.sim);
  const session = useAcademyStore((s) => s.session);
  const mode = useUiStore((s) => s.learningMode);
  const tutorial = useTutorialStore((s) => (s.active ? TUTORIAL_STEPS[s.index] : undefined));
  if (tutorial) return { text: tutorial.text, target: tutorial.assist ?? null, source: 'tutorial' };
  if (session && !session.result) {
    const def = exerciseDef(session.exerciseId);
    const step = def?.steps[session.stepIndex];
    if (!session.showInstructions || !step) return null;
    return { text: step.text, target: step.target ?? null, source: 'exercise' };
  }
  if (mode !== 'assisted') return null;
  return { ...assistHint(sim), source: 'assist' };
}
