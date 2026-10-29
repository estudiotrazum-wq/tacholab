import type { Activity, EpochMs, SelectableActivity } from '@/shared/types';

/** Botones físicos del dispositivo ficticio TL-1. */
export type Button = 'OK' | 'BACK' | 'UP' | 'DOWN' | 'ACTIVITY' | 'EJECT';

export type ManualActivity = SelectableActivity | 'UNKNOWN';
export const MANUAL_ACTIVITIES: readonly ManualActivity[] = ['REST', 'WORK', 'AVAILABILITY', 'UNKNOWN'];

export interface ManualDraftSegment {
  activity: ManualActivity;
  start: EpochMs;
  end: EpochMs;
}

export const MENU_ITEMS = [
  { id: 'TIMES', label: 'Tiempos conductor', needsCard: true },
  { id: 'DAY_ACTIVITIES', label: 'Actividades de hoy', needsCard: true },
  { id: 'TICKET', label: 'Resumen de jornada', needsCard: true },
  { id: 'WITHDRAW', label: 'Retirar tarjeta', needsCard: true },
  { id: 'DEVICE_INFO', label: 'Información equipo', needsCard: false },
] as const;
export type MenuItemId = (typeof MENU_ITEMS)[number]['id'];

export const COUNTRIES = [
  { code: 'E', name: 'España' },
  { code: 'P', name: 'Portugal' },
  { code: 'F', name: 'Francia' },
  { code: 'I', name: 'Italia' },
  { code: 'D', name: 'Alemania' },
  { code: 'B', name: 'Bélgica' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'PL', name: 'Polonia' },
] as const;

/** Máquina de estados de pantallas del dispositivo. */
export type Screen =
  | { kind: 'STANDARD'; page: 0 | 1 | 2 }
  | { kind: 'WELCOME' }
  | { kind: 'MANUAL_ASK'; yes: boolean }
  | {
      kind: 'MANUAL_EDIT';
      segments: ManualDraftSegment[];
      draft: ManualDraftSegment;
      field: 'activity' | 'end';
    }
  | { kind: 'MANUAL_CONFIRM'; segments: ManualDraftSegment[]; yes: boolean }
  | { kind: 'COUNTRY'; purpose: 'start' | 'end'; index: number }
  | { kind: 'MENU'; index: number }
  | { kind: 'TIMES' }
  | { kind: 'DAY_ACTIVITIES'; offset: number }
  | { kind: 'TICKET'; offset: number }
  | { kind: 'DEVICE_INFO' };

export type ScreenKind = Screen['kind'];

/** Pantallas del procedimiento de inserción de tarjeta. */
export const INSERTION_FLOW: readonly ScreenKind[] = ['WELCOME', 'MANUAL_ASK', 'MANUAL_EDIT', 'MANUAL_CONFIRM'];

export interface Notice {
  seq: number;
  text: string;
}

export type WarningCode = 'CONT_DRIVING_PREWARN' | 'CONT_DRIVING_EXCEEDED' | 'DRIVING_WITHOUT_CARD';

export interface DeviceWarning {
  code: WarningCode;
  title: string;
  text: string;
  ruleId: string | null;
  at: EpochMs;
}

export interface DeviceState {
  insertedCardId: string | null;
  insertedAt: EpochMs | null;
  /** Modo seleccionado por el conductor (puede diferir de la actividad registrada). */
  selected: SelectableActivity;
  screen: Screen;
  notice: Notice | null;
  warning: DeviceWarning | null;
  warnFlags: { prewarn: boolean; exceeded: boolean };
}

export function initialDevice(): DeviceState {
  return {
    insertedCardId: null,
    insertedAt: null,
    selected: 'REST',
    screen: { kind: 'STANDARD', page: 0 },
    notice: null,
    warning: null,
    warnFlags: { prewarn: false, exceeded: false },
  };
}

/** Actividad que se registra según el estado del dispositivo y del vehículo. */
export function effectiveActivity(device: DeviceState, moving: boolean): Activity {
  return moving ? 'DRIVING' : device.selected;
}
