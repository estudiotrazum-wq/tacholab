import { N_, type I18nText } from '@/i18n';
import type { EpochMs } from '@/shared/types';
import { addZonedDays, startOfZonedWeek } from '@/time-engine/zoned';
import { HOUR } from '@/time-engine/units';

/** Horizonte fijo: dos semanas consecutivas (lunes 00:00 UTC → domingo 24:00 UTC de la semana 2). */
export const SCENARIO_DAYS = 14;

export interface ScenarioMeta {
  id: string;
  title: string;
  /** Título traducible (cuando lleva datos, p. ej. «Ejercicio 3: …»). */
  titleI18n?: I18nText;
  /** Lunes 00:00 UTC de la semana 1. */
  weekOneStart: EpochMs;
  /** Instante en que arranca el reloj. */
  startsAt: EpochMs;
  /** Domingo 24:00 UTC de la semana 2. */
  endsAt: EpochMs;
  /** Zona de cálculo normativo y de la pantalla del tacógrafo (UTC). */
  timeZone: string;
  /** Zona solo para mostrar la hora local de referencia (no interviene en cálculos). */
  localTimeZone: string;
  /** Escenario de la biblioteca del que procede (objetivos y evaluación). */
  libraryId?: string;
}

/**
 * Decisión de producto (v0.2): días y semanas normativos se calculan en UTC,
 * igual que registran los tacógrafos digitales. La hora local es solo informativa.
 */
export const CALC_TIME_ZONE = 'UTC';
export const LOCAL_TIME_ZONE = 'Europe/Madrid';

/**
 * Escenario libre: dos semanas que comienzan el lunes 00:00 UTC que contiene `anchor`,
 * con el reloj situado a las 06:00 UTC del lunes.
 */
export function createFreeScenario(
  anchor: EpochMs,
  timeZone = CALC_TIME_ZONE,
  localTimeZone = LOCAL_TIME_ZONE,
  id = 'free-1',
): ScenarioMeta {
  const weekOneStart = startOfZonedWeek(anchor, timeZone);
  return {
    id,
    title: N_('Práctica libre — dos semanas'),
    weekOneStart,
    startsAt: weekOneStart + 6 * HOUR,
    endsAt: addZonedDays(weekOneStart, SCENARIO_DAYS, timeZone),
    timeZone,
    localTimeZone,
  };
}

/** Lunes 2 de noviembre de 2026 (fecha de referencia reproducible). */
export const REFERENCE_ANCHOR = Date.UTC(2026, 10, 2, 12, 0);
