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
  /** País en el que se entra tras cruzar una frontera (art. 34.7 R. 165/2014). */
  { id: 'BORDER', label: 'País: cruce frontera', needsCard: true },
  /** Condiciones específicas (anexo IC, req. 62). */
  { id: 'FERRY', label: 'Ferry/tren', needsCard: true },
  { id: 'OUT', label: 'Fuera de ámbito', needsCard: false },
] as const;

/** Condición específica abierta en el tacógrafo (anexo IC del R. 2016/799, requisito 62). */
export type SpecificCondition = 'FERRY' | 'OUT';
export type MenuItemId = (typeof MENU_ITEMS)[number]['id'];

/**
 * Regiones de España (comunidades autónomas) que el tacógrafo pide tras elegir España como país de
 * inicio o de fin. Códigos según la tabla de regiones del anexo IC del Reglamento de Ejecución (UE)
 * 2016/799 (ver docs/REGULATIONS.md). Nombres abreviados para la pantalla de 20 caracteres.
 */
export const SPAIN_REGIONS = [
  { code: 'AN', name: 'Andalucía' },
  { code: 'AR', name: 'Aragón' },
  { code: 'AST', name: 'Asturias' },
  { code: 'C', name: 'Cantabria' },
  { code: 'CAT', name: 'Cataluña' },
  { code: 'CL', name: 'Castilla y León' },
  { code: 'CM', name: 'Cast.-La Mancha' },
  { code: 'CV', name: 'C. Valenciana' },
  { code: 'EXT', name: 'Extremadura' },
  { code: 'G', name: 'Galicia' },
  { code: 'IB', name: 'Islas Baleares' },
  { code: 'IC', name: 'Canarias' },
  { code: 'LR', name: 'La Rioja' },
  { code: 'M', name: 'Madrid' },
  { code: 'MU', name: 'Murcia' },
  { code: 'NA', name: 'Navarra' },
  { code: 'PV', name: 'País Vasco' },
] as const;

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
  /** 0: principal · 1: tiempo restante de conducción · 2: acumulados · 3: hora UTC y local. */
  | { kind: 'STANDARD'; page: 0 | 1 | 2 | 3 }
  | { kind: 'WELCOME' }
  /** Fecha y hora de la última retirada (fin de la jornada anterior). */
  | { kind: 'LAST_WITHDRAWAL' }
  | { kind: 'MANUAL_ASK'; yes: boolean }
  | {
      kind: 'MANUAL_EDIT';
      segments: ManualDraftSegment[];
      draft: ManualDraftSegment;
      /** Campo en edición: actividad, hora de fin o minutos de fin. */
      field: 'activity' | 'hour' | 'minute';
    }
  | { kind: 'MANUAL_CONFIRM'; segments: ManualDraftSegment[]; yes: boolean; prevCountry: string }
  /** start: país de inicio · end: país de fin al retirar · prev-end: país de fin de la jornada anterior (entrada manual). */
  | { kind: 'COUNTRY'; purpose: 'start' | 'end' | 'border'; index: number }
  | { kind: 'COUNTRY'; purpose: 'prev-end'; index: number; segments: ManualDraftSegment[] }
  /** Comunidad autónoma, solo cuando el país elegido es España. */
  | { kind: 'REGION'; purpose: 'start' | 'end' | 'border'; index: number }
  | { kind: 'REGION'; purpose: 'prev-end'; index: number; segments: ManualDraftSegment[] }
  /** Al retirar la tarjeta: ¿imprimir el resumen de 24 h antes de expulsarla? */
  | { kind: 'WITHDRAW_PRINT'; yes: boolean }
  | { kind: 'MENU'; index: number }
  | { kind: 'TIMES' }
  | { kind: 'DAY_ACTIVITIES'; offset: number }
  | { kind: 'TICKET'; offset: number }
  | { kind: 'DEVICE_INFO' };

export type ScreenKind = Screen['kind'];

/** Pantallas del procedimiento de inserción de tarjeta. */
export const INSERTION_FLOW: readonly ScreenKind[] = ['WELCOME', 'LAST_WITHDRAWAL', 'MANUAL_ASK', 'MANUAL_EDIT', 'MANUAL_CONFIRM'];

export interface Notice {
  seq: number;
  text: string;
}

export type WarningCode =
  | 'CONT_DRIVING_PREWARN'
  | 'CONT_DRIVING_EXCEEDED'
  | 'DRIVING_WITHOUT_CARD'
  | 'DAILY_DRIVING_PREWARN'
  | 'DAILY_EXTENSION'
  | 'DAILY_DRIVING_EXCEEDED'
  | 'WEEKLY_DRIVING_PREWARN'
  | 'WEEKLY_DRIVING_EXCEEDED'
  | 'BIWEEKLY_DRIVING_PREWARN'
  | 'BIWEEKLY_DRIVING_EXCEEDED'
  | 'DAILY_REST_DUE'
  | 'DAILY_REST_LAST_CALL'
  | 'WEEKLY_REST_DUE';

export interface DeviceWarning {
  code: WarningCode;
  /** info = aviso preventivo o informativo; infringement = infracción simulada. */
  severity: 'info' | 'warning' | 'infringement';
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
  /** Avisos ya emitidos (clave = aviso + periodo al que se refiere). */
  warnFlags: Record<string, true>;
  /** Último ticket impreso (la interfaz lo muestra saliendo de la impresora). */
  printout?: Printout | null;
  /** Condición específica abierta: trayecto en transbordador/tren o fuera de ámbito. */
  condition?: SpecificCondition | null;
}

export interface Printout {
  seq: number;
  lines: string[];
}

export function initialDevice(): DeviceState {
  return {
    insertedCardId: null,
    insertedAt: null,
    selected: 'REST',
    screen: { kind: 'STANDARD', page: 0 },
    notice: null,
    warning: null,
    warnFlags: {},
  };
}

/** Actividad que se registra según el estado del dispositivo y del vehículo. */
export function effectiveActivity(device: DeviceState, moving: boolean): Activity {
  return moving ? 'DRIVING' : device.selected;
}
