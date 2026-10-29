import type { Activity, SelectableActivity } from '@/shared/types';
import { computeContinuousDriving, type ContinuousDrivingStatus } from '@/regulations/continuousDriving';
import { driverEvents, openEvent, sumActivities, type ActivityEvent, type ActivityTotals } from '@/time-engine/timeline';
import { addZonedDays, startOfZonedDay, startOfZonedWeek } from '@/time-engine/zoned';
import { analyzeCompliance, type ComplianceReport } from '@/regulations/compliance';
import type { SimState } from './state';

/**
 * Resumen derivado exclusivamente de la línea temporal.
 * Los totales por día/semana son ACUMULADOS NATURALES (calendario), no el
 * "tiempo de conducción diario" normativo, que se calculará en la Fase 2.
 */
export interface SimSummary {
  driverId: string | null;
  selected: SelectableActivity;
  recorded: Activity | null;
  currentEvent: ActivityEvent | null;
  continuous: ContinuousDrivingStatus | null;
  today: ActivityTotals;
  week: ActivityTotals;
  twoWeeks: ActivityTotals;
  weekIndex: 1 | 2;
}

export function currentDriverEvents(sim: SimState): ActivityEvent[] {
  const id = sim.device.insertedCardId;
  return id ? driverEvents(sim.timeline, id) : [];
}

export function deriveSummary(sim: SimState, driverOverride?: string): SimSummary {
  const now = sim.clock.now;
  const tz = sim.scenario.timeZone;
  const driverId = driverOverride ?? sim.device.insertedCardId;
  const events = driverId ? driverEvents(sim.timeline, driverId) : [];
  const open = openEvent(sim.timeline);
  const dayStart = startOfZonedDay(now, tz);
  const weekStart = startOfZonedWeek(now, tz);
  return {
    driverId,
    selected: sim.device.selected,
    recorded: open?.activity ?? null,
    currentEvent: open,
    continuous: driverId ? computeContinuousDriving(events, now) : null,
    today: sumActivities(events, dayStart, addZonedDays(dayStart, 1, tz), now),
    week: sumActivities(events, weekStart, addZonedDays(weekStart, 7, tz), now),
    twoWeeks: sumActivities(events, sim.scenario.weekOneStart, sim.scenario.endsAt, now),
    weekIndex: weekStart >= addZonedDays(sim.scenario.weekOneStart, 7, tz) ? 2 : 1,
  };
}

/** Informe normativo completo (Fase 2) para un conductor. */
export function complianceFor(sim: SimState, driverId: string | null = sim.device.insertedCardId): ComplianceReport | null {
  if (!driverId) return null;
  const { startsAt, weekOneStart, endsAt, timeZone } = sim.scenario;
  return analyzeCompliance(driverEvents(sim.timeline, driverId), sim.clock.now, { startsAt, weekOneStart, endsAt, timeZone });
}
