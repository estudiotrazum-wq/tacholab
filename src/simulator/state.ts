import type { EpochMs, SelectableActivity } from '@/shared/types';
import { createClock, type ClockState } from '@/time-engine/clock';
import { emptyTimeline, type Timeline } from '@/time-engine/timeline';
import { initialDevice, type DeviceState } from '@/tachograph/types';
import { DEFAULT_CARDS, type FictionalCard } from '@/scenarios/cards';
import { createFreeScenario, REFERENCE_ANCHOR, type ScenarioMeta } from '@/scenarios/scenario';

/** v3: avisos de la Fase 2 (los guardados anteriores se descartan). */
export const SIM_STATE_VERSION = 3;

export type LogKind =
  | 'CARD_IN'
  | 'CARD_OUT'
  | 'COUNTRY_START'
  | 'COUNTRY_END'
  | 'MANUAL_ENTRY'
  | 'MANUAL_SKIPPED'
  | 'WARNING'
  | 'VEHICLE_START'
  | 'VEHICLE_STOP'
  | 'ACTIVITY_SELECTED';

export interface LogEntry {
  id: number;
  at: EpochMs;
  kind: LogKind;
  text: string;
  driverId: string | null;
}

export interface SimConfig {
  /**
   * Actividad que se selecciona automáticamente al detener el vehículo.
   * APROXIMACIÓN PEDAGÓGICA: el comportamiento real varía según generación y configuración del equipo.
   */
  afterStopActivity: SelectableActivity | 'KEEP';
}

/** Estado operativo completo de la simulación (persistible, sin estado visual). */
export interface SimState {
  version: typeof SIM_STATE_VERSION;
  scenario: ScenarioMeta;
  clock: ClockState;
  /** speedKmh: velocidad elegida al circular (por defecto 80); odometerKm: cuentakilómetros. */
  vehicle: { moving: boolean; speedKmh?: number; odometerKm?: number };
  device: DeviceState;
  cards: Record<string, FictionalCard>;
  timeline: Timeline;
  log: LogEntry[];
  logSeq: number;
  noticeSeq: number;
  config: SimConfig;
}

export function createInitialSim(anchor: EpochMs = REFERENCE_ANCHOR): SimState {
  const scenario = createFreeScenario(anchor);
  return {
    version: SIM_STATE_VERSION,
    scenario,
    clock: createClock(scenario.startsAt, scenario.endsAt),
    vehicle: { moving: false },
    device: initialDevice(),
    cards: Object.fromEntries(DEFAULT_CARDS.map((c) => [c.id, { ...c }])),
    timeline: emptyTimeline(),
    log: [],
    logSeq: 1,
    noticeSeq: 1,
    config: { afterStopActivity: 'WORK' },
  };
}
