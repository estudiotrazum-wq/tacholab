import type { FeatureKey } from '@/billing/plans';
import type { ComplianceReport } from '@/regulations/compliance';
import type { LogEntry, SimState } from '@/simulator/state';
import type { AssistTarget } from './assist';

/** Contexto de evaluación: todo se deriva del estado de la simulación y de lo observado. */
export interface ExerciseContext {
  sim: SimState;
  /** Informe normativo del conductor (se calcula solo si se pide). */
  readonly report: ComplianceReport | null;
  /** Hechos observados desde el inicio del ejercicio. */
  facts: ReadonlySet<string>;
  /** Hechos observados desde que empezó el paso actual. */
  stepFacts: ReadonlySet<string>;
  /** Entradas del registro del equipo posteriores al inicio del ejercicio. */
  newLog: readonly LogEntry[];
  allStepsDone: boolean;
  answers: readonly string[];
}

export interface ExerciseStep {
  text: string;
  target?: AssistTarget;
  done: (c: ExerciseContext) => boolean;
}

export interface Criterion {
  text: string;
  check: (c: ExerciseContext) => boolean;
}

export interface ErrorCheck {
  text: string;
  penalty: number;
  ruleId?: string;
  check: (c: ExerciseContext) => boolean;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface ExerciseDef {
  id: string;
  number: number;
  title: string;
  feature: FeatureKey;
  status: 'available' | 'planned';
  objective: string;
  situation: string;
  deviceState: string;
  build?: () => SimState;
  steps: ExerciseStep[];
  success: Criterion[];
  errors: ErrorCheck[];
  explanation: string;
  quiz?: { question: string; options: QuizOption[] };
}

export interface ExerciseResult {
  exerciseId: string;
  score: number;
  stars: 0 | 1 | 2 | 3;
  passed: boolean;
  criteria: { text: string; ok: boolean }[];
  errors: { text: string; penalty: number; ruleId?: string }[];
  stepsDone: number;
  stepsTotal: number;
}

export interface ExerciseSession {
  exerciseId: string;
  /** Escenario cargado para el ejercicio: si el usuario carga otro, la sesión se abandona. */
  scenarioKey: string | undefined;
  stepIndex: number;
  facts: string[];
  stepFacts: string[];
  startLogSeq: number;
  showInstructions: boolean;
  answers: string[];
  result: ExerciseResult | null;
}
