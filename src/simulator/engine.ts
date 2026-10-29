import { SELECTABLE_ACTIVITIES, type EpochMs, ACTIVITY_LABEL } from '@/shared/types';
import { advanceClockTo, setSpeed, tickClock, type Speed } from '@/time-engine/clock';
import { insertManualSegments, switchActivity, type ActivityTarget } from '@/time-engine/timeline';
import { addZonedDays, formatDateTime, startOfZonedDay } from '@/time-engine/zoned';
import {
  COUNTRIES,
  INSERTION_FLOW,
  MENU_ITEMS,
  effectiveActivity,
  type Button,
  type DeviceWarning,
  type Screen,
} from '@/tachograph/types';
import { cycleManualActivity, HOUR_STEP, MIN_MANUAL_GAP, MINUTE_STEP, newDraft, stepManualEnd } from '@/tachograph/manualEntry';
import { printoutLines } from '@/tachograph/display';
import { normalizeHolderName } from '@/scenarios/cards';
import { nextStop, warningTriggers } from './warnings';
import type { LogKind, SimConfig, SimState } from './state';

export type SimAction =
  | { type: 'TICK'; realDeltaMs: number }
  | { type: 'SET_SPEED'; speed: Speed }
  | { type: 'ADVANCE_BY'; ms: number }
  | { type: 'ADVANCE_TO'; at: EpochMs }
  | { type: 'JUMP_NEXT_EVENT' }
  | { type: 'PRESS'; button: Button }
  | { type: 'INSERT_CARD'; cardId: string }
  | { type: 'SET_MOVING'; moving: boolean }
  /** Velocidad del camión en km/h (0 = parado; máximo 90, limitador de los camiones en la UE). */
  | { type: 'SET_VEHICLE_SPEED'; kmh: number }
  /** Llave de contacto: 0 (apagado), I (contacto) o arranque (motor en marcha). */
  | { type: 'SET_IGNITION'; position: 'off' | 'on' | 'start' }
  /** Nombre del titular de una tarjeta ficticia (el alumno puede poner el suyo). */
  | { type: 'RENAME_CARD'; cardId: string; name: string }
  /** Impresión diaria (24 h) de la tarjeta insertada. */
  | { type: 'PRINT_DAILY' }
  | { type: 'DISMISS_NOTICE' }
  | { type: 'SET_CONFIG'; patch: Partial<SimConfig> };

// ---------------------------------------------------------------- utilidades

function log(sim: SimState, kind: LogKind, text: string, at: EpochMs = sim.clock.now): SimState {
  const entry = { id: sim.logSeq, at, kind, text, driverId: sim.device.insertedCardId };
  return { ...sim, log: [...sim.log, entry], logSeq: sim.logSeq + 1 };
}

function notice(sim: SimState, text: string): SimState {
  return {
    ...sim,
    device: { ...sim.device, notice: { seq: sim.noticeSeq, text } },
    noticeSeq: sim.noticeSeq + 1,
  };
}

function setScreen(sim: SimState, screen: Screen): SimState {
  return { ...sim, device: { ...sim.device, screen } };
}

const STANDARD: Screen = { kind: 'STANDARD', page: 0 };

/** Recalcula qué se registra en la línea temporal a partir del estado actual. */
function syncTimeline(sim: SimState): SimState {
  const { device, vehicle } = sim;
  let target: ActivityTarget | null = null;
  if (device.insertedCardId) {
    target = { activity: effectiveActivity(device, vehicle.moving), driverId: device.insertedCardId };
  } else if (vehicle.moving) {
    target = { activity: 'DRIVING', driverId: null };
  }
  const timeline = switchActivity(sim.timeline, target, sim.clock.now, sim.scenario.id);
  return timeline === sim.timeline ? sim : { ...sim, timeline };
}

function raiseWarning(sim: SimState, w: DeviceWarning): SimState {
  const next = { ...sim, device: { ...sim.device, warning: w } };
  return log(next, 'WARNING', `${w.title}: ${w.text}`, w.at);
}

/** Emite, en orden y con su instante exacto, los avisos cuyo umbral ya se ha cruzado. */
function checkWarnings(sim: SimState): SimState {
  if (!sim.device.insertedCardId) return sim;
  const due = warningTriggers(sim)
    .filter((t) => t.at <= sim.clock.now && !sim.device.warnFlags[t.key])
    .sort((a, b) => a.at - b.at);
  let s = sim;
  for (const t of due) {
    s = { ...s, device: { ...s.device, warnFlags: { ...s.device.warnFlags, [t.key]: true } } };
    s = raiseWarning(s, { ...t.warning, at: t.at });
  }
  return s;
}

export const DEFAULT_SPEED_KMH = 80;
export const MAX_SPEED_KMH = 90;
export const ODOMETER_START_KM = 248_310;

/** Suma al cuentakilómetros la distancia recorrida entre dos estados del reloj. */
function addDistance(before: SimState, after: SimState): SimState {
  const dt = after.clock.now - before.clock.now;
  if (!before.vehicle.moving || dt <= 0) return after;
  const kmh = before.vehicle.speedKmh ?? DEFAULT_SPEED_KMH;
  const odometerKm = (before.vehicle.odometerKm ?? ODOMETER_START_KM) + (dt / 3_600_000) * kmh;
  return { ...after, vehicle: { ...after.vehicle, odometerKm } };
}

/** Avanza el reloj hasta `target` deteniéndose en cada umbral intermedio. */
function advanceTo(sim: SimState, target: EpochMs): SimState {
  return addDistance(sim, advanceClock(sim, target));
}

function advanceClock(sim: SimState, target: EpochMs): SimState {
  let s = checkWarnings(sim);
  for (let guard = 0; guard < 64; guard++) {
    const stop = nextStop(s);
    if (stop === null || stop.at >= target) break;
    s = checkWarnings({ ...s, clock: advanceClockTo(s.clock, stop.at) });
    if (s.clock.now >= s.clock.endsAt) break;
  }
  return checkWarnings({ ...s, clock: advanceClockTo(s.clock, target) });
}

/** Siguiente evento relevante: umbral normativo, hito de descanso, medianoche UTC o fin de escenario. */
export function nextRelevantEvent(sim: SimState): { at: EpochMs; label: string } {
  const now = sim.clock.now;
  const tz = sim.scenario.timeZone;
  const candidates: { at: EpochMs; label: string }[] = [
    { at: addZonedDays(startOfZonedDay(now, tz), 1, tz), label: 'Medianoche UTC (cambio de día)' },
    { at: sim.clock.endsAt, label: 'Fin del escenario' },
  ];
  const stop = nextStop(sim);
  if (stop) candidates.push(stop);
  return candidates.filter((c) => c.at > now).sort((a, b) => a.at - b.at)[0] ?? { at: now, label: 'Fin' };
}

// ---------------------------------------------------------------- tarjeta

function insertCard(sim: SimState, cardId: string): SimState {
  const card = sim.cards[cardId];
  if (!card) return notice(sim, 'Tarjeta no válida');
  if (sim.device.insertedCardId) return notice(sim, 'Ya hay una tarjeta insertada');
  if (sim.vehicle.moving) return notice(sim, 'Detenga el vehículo para insertar la tarjeta');
  let s: SimState = {
    ...sim,
    device: { ...sim.device, insertedCardId: cardId, insertedAt: sim.clock.now, screen: { kind: 'WELCOME' } },
  };
  s = log(s, 'CARD_IN', `Tarjeta ${card.displayId} insertada`);
  return syncTimeline(s);
}

function beginWithdrawal(sim: SimState): SimState {
  if (!sim.device.insertedCardId) return notice(sim, 'No hay tarjeta insertada');
  if (sim.vehicle.moving) return notice(sim, 'Detenga el vehículo para retirar la tarjeta');
  if (INSERTION_FLOW.includes(sim.device.screen.kind)) return notice(sim, 'Finalice el procedimiento de inserción');
  return setScreen(sim, { kind: 'COUNTRY', purpose: 'end', index: 0 });
}

function completeWithdrawal(sim: SimState): SimState {
  const id = sim.device.insertedCardId;
  if (!id) return sim;
  const card = sim.cards[id]!;
  let s = log(sim, 'CARD_OUT', `Tarjeta ${card.displayId} retirada`);
  s = {
    ...s,
    cards: { ...s.cards, [id]: { ...card, lastWithdrawalAt: s.clock.now } },
    device: {
      ...s.device,
      insertedCardId: null,
      insertedAt: null,
      screen: STANDARD,
    },
  };
  return notice(syncTimeline(s), 'Tarjeta retirada');
}

function printDaily(sim: SimState): SimState {
  const lines = printoutLines(sim);
  if (!lines) return notice(sim, 'Inserte una tarjeta para imprimir');
  const s: SimState = { ...sim, device: { ...sim.device, printout: { seq: (sim.device.printout?.seq ?? 0) + 1, lines } } };
  return log(s, 'PRINTOUT', 'Impresión diaria (24 h)');
}

function afterWelcome(sim: SimState): SimState {
  const card = sim.cards[sim.device.insertedCardId ?? ''];
  const insertedAt = sim.device.insertedAt ?? sim.clock.now;
  if (card?.lastWithdrawalAt != null && insertedAt - card.lastWithdrawalAt >= MIN_MANUAL_GAP) {
    return setScreen(sim, { kind: 'MANUAL_ASK', yes: true });
  }
  return setScreen(sim, { kind: 'COUNTRY', purpose: 'start', index: 0 });
}

function manualWindow(sim: SimState): { from: EpochMs; to: EpochMs } {
  const card = sim.cards[sim.device.insertedCardId ?? '']!;
  return { from: card.lastWithdrawalAt ?? sim.clock.now, to: sim.device.insertedAt ?? sim.clock.now };
}

function commitManualEntry(sim: SimState, screen: Extract<Screen, { kind: 'MANUAL_CONFIRM' }>): SimState {
  const driverId = sim.device.insertedCardId!;
  const segments = screen.segments.flatMap((s) =>
    s.activity === 'UNKNOWN' ? [] : [{ activity: s.activity, start: s.start, end: s.end }],
  );
  try {
    const timeline = insertManualSegments(sim.timeline, segments, driverId, sim.scenario.id, sim.clock.now);
    let s: SimState = { ...sim, timeline };
    const tz = sim.scenario.timeZone;
    for (const seg of screen.segments) {
      s = log(
        s,
        'MANUAL_ENTRY',
        `Entrada manual: ${seg.activity === 'UNKNOWN' ? 'Desconocida' : ACTIVITY_LABEL[seg.activity]} ${formatDateTime(seg.start, tz)} → ${formatDateTime(seg.end, tz)}`,
      );
    }
    s = log(s, 'COUNTRY_END', `País de fin de la jornada anterior: ${screen.prevCountry}`);
    return setScreen(s, { kind: 'COUNTRY', purpose: 'start', index: 0 });
  } catch (e) {
    return notice(setScreen(sim, STANDARD), e instanceof Error ? e.message : 'Entrada manual no válida');
  }
}

// ---------------------------------------------------------------- botones

function cycleSelected(sim: SimState): SimState {
  if (!sim.device.insertedCardId) return notice(sim, 'Inserte una tarjeta');
  if (sim.vehicle.moving) return notice(sim, 'Con el vehículo en marcha se registra conducción');
  if (INSERTION_FLOW.includes(sim.device.screen.kind)) return sim;
  const i = SELECTABLE_ACTIVITIES.indexOf(sim.device.selected);
  const selected = SELECTABLE_ACTIVITIES[(i + 1) % SELECTABLE_ACTIVITIES.length]!;
  let s: SimState = { ...sim, device: { ...sim.device, selected, screen: STANDARD } };
  s = log(s, 'ACTIVITY_SELECTED', `Seleccionado: ${ACTIVITY_LABEL[selected]}`);
  return syncTimeline(s);
}

function pressButton(sim: SimState, button: Button): SimState {
  let s: SimState = sim.device.notice ? { ...sim, device: { ...sim.device, notice: null } } : sim;

  if (s.device.warning) {
    if (button === 'OK' || button === 'BACK') return { ...s, device: { ...s.device, warning: null } };
    return s;
  }
  if (button === 'ACTIVITY') return cycleSelected(s);
  if (button === 'EJECT') return beginWithdrawal(s);

  const screen = s.device.screen;
  const up = button === 'UP';
  const down = button === 'DOWN';
  const ok = button === 'OK';
  const back = button === 'BACK';
  const wrap = (i: number, n: number) => (i + n) % n;

  switch (screen.kind) {
    case 'STANDARD': {
      if (up || down) return setScreen(s, { kind: 'STANDARD', page: wrap(screen.page + (down ? 1 : -1), 3) as 0 | 1 | 2 });
      if (ok) return setScreen(s, { kind: 'MENU', index: 0 });
      if (back) return setScreen(s, STANDARD);
      return s;
    }
    case 'MENU': {
      if (up || down) return setScreen(s, { kind: 'MENU', index: wrap(screen.index + (down ? 1 : -1), MENU_ITEMS.length) });
      if (back) return setScreen(s, STANDARD);
      if (ok) {
        const item = MENU_ITEMS[screen.index]!;
        if (item.needsCard && !s.device.insertedCardId) return notice(s, 'Sin tarjeta de conductor');
        switch (item.id) {
          case 'TIMES':
            return setScreen(s, { kind: 'TIMES' });
          case 'DAY_ACTIVITIES':
            return setScreen(s, { kind: 'DAY_ACTIVITIES', offset: 0 });
          case 'TICKET':
            return setScreen(s, { kind: 'TICKET', offset: 0 });
          case 'WITHDRAW':
            return beginWithdrawal(s);
          case 'DEVICE_INFO':
            return setScreen(s, { kind: 'DEVICE_INFO' });
        }
      }
      return s;
    }
    case 'TIMES':
    case 'DEVICE_INFO': {
      if (ok || back) {
        const index = MENU_ITEMS.findIndex((m) => m.id === screen.kind);
        return setScreen(s, { kind: 'MENU', index });
      }
      return s;
    }
    case 'DAY_ACTIVITIES':
    case 'TICKET': {
      if (up || down) return setScreen(s, { ...screen, offset: Math.max(0, screen.offset + (down ? 1 : -1)) });
      if (ok || back) return setScreen(s, { kind: 'MENU', index: MENU_ITEMS.findIndex((m) => m.id === screen.kind) });
      return s;
    }
    case 'WELCOME':
      return ok || back ? setScreen(s, { kind: 'LAST_WITHDRAWAL' }) : s;
    case 'LAST_WITHDRAWAL':
      return ok || back ? afterWelcome(s) : s;
    case 'MANUAL_ASK': {
      if (up || down) return setScreen(s, { kind: 'MANUAL_ASK', yes: !screen.yes });
      if (ok && screen.yes) {
        const w = manualWindow(s);
        return setScreen(s, { kind: 'MANUAL_EDIT', segments: [], draft: newDraft(w.from, w.to), field: 'activity' });
      }
      if (ok || back) {
        s = log(s, 'MANUAL_SKIPPED', 'Sin entrada manual: el periodo sin tarjeta queda como desconocido');
        return setScreen(s, { kind: 'COUNTRY', purpose: 'start', index: 0 });
      }
      return s;
    }
    case 'WITHDRAW_PRINT':
      if (up || down) return setScreen(s, { kind: 'WITHDRAW_PRINT', yes: !screen.yes });
      if (ok) return completeWithdrawal(screen.yes ? printDaily(s) : s);
      if (back) return setScreen(s, { kind: 'COUNTRY', purpose: 'end', index: 0 });
      return s;
    case 'MANUAL_EDIT': {
      const { to } = manualWindow(s);
      const { draft, segments } = screen;
      if (screen.field === 'activity') {
        if (up || down) return setScreen(s, { ...screen, draft: { ...draft, activity: cycleManualActivity(draft.activity, up ? -1 : 1) } });
        if (ok) return setScreen(s, { ...screen, field: 'hour' });
        if (back) {
          const prev = segments[segments.length - 1];
          if (!prev) return setScreen(s, { kind: 'MANUAL_ASK', yes: true });
          return setScreen(s, { ...screen, segments: segments.slice(0, -1), draft: prev, field: 'activity' });
        }
        return s;
      }
      // Hora y minutos de fin del tramo, por separado, como en los equipos reales.
      const step = screen.field === 'hour' ? HOUR_STEP : MINUTE_STEP;
      if (up || down) return setScreen(s, { ...screen, draft: { ...draft, end: stepManualEnd(draft, up ? 1 : -1, to, step) } });
      if (back) return setScreen(s, { ...screen, field: screen.field === 'minute' ? 'hour' : 'activity' });
      if (ok && screen.field === 'hour') return setScreen(s, { ...screen, field: 'minute' });
      if (ok) {
        const all = [...segments, draft];
        if (draft.end >= to) return setScreen(s, { kind: 'COUNTRY', purpose: 'prev-end', index: 0, segments: all });
        return setScreen(s, { kind: 'MANUAL_EDIT', segments: all, draft: newDraft(draft.end, to), field: 'activity' });
      }
      return s;
    }
    case 'MANUAL_CONFIRM': {
      if (up || down) return setScreen(s, { ...screen, yes: !screen.yes });
      if (ok && screen.yes) return commitManualEntry(s, screen);
      if (ok || back) {
        const last = screen.segments[screen.segments.length - 1]!;
        return setScreen(s, { kind: 'MANUAL_EDIT', segments: screen.segments.slice(0, -1), draft: last, field: 'minute' });
      }
      return s;
    }
    case 'COUNTRY': {
      if (up || down) return setScreen(s, { ...screen, index: wrap(screen.index + (down ? 1 : -1), COUNTRIES.length) });
      if (ok) {
        const c = COUNTRIES[screen.index]!;
        if (screen.purpose === 'prev-end') {
          return setScreen(s, { kind: 'MANUAL_CONFIRM', segments: screen.segments, yes: true, prevCountry: c.name });
        }
        if (screen.purpose === 'start') {
          s = log(s, 'COUNTRY_START', `País de inicio: ${c.name}`);
          return notice(setScreen(s, STANDARD), 'Listo para conducir');
        }
        s = log(s, 'COUNTRY_END', `País de fin: ${c.name}`);
        return setScreen(s, { kind: 'WITHDRAW_PRINT', yes: false });
      }
      if (back && screen.purpose === 'end') return setScreen(s, STANDARD);
      if (back && screen.purpose === 'prev-end') {
        const last = screen.segments[screen.segments.length - 1]!;
        return setScreen(s, { kind: 'MANUAL_EDIT', segments: screen.segments.slice(0, -1), draft: last, field: 'minute' });
      }
      return s;
    }
  }
}

// ---------------------------------------------------------------- vehículo

/** Llave de contacto. Apagar el motor detiene el vehículo. */
function setIgnition(sim: SimState, position: 'off' | 'on' | 'start'): SimState {
  const current = sim.vehicle.ignition ?? 'off';
  const target = position === 'start' ? 'running' : position;
  if (current === target) return sim;
  let s = target !== 'running' && sim.vehicle.moving ? setMoving(sim, false) : sim;
  s = { ...s, vehicle: { ...s.vehicle, ignition: target } };
  const text = { off: 'Contacto quitado (llave en 0)', on: 'Contacto puesto (llave en I)', running: 'Motor arrancado' }[target];
  return log(s, 'IGNITION', text);
}

function setMoving(sim: SimState, moving: boolean): SimState {
  if (sim.vehicle.moving === moving) return sim;
  let s: SimState = { ...sim, vehicle: { ...sim.vehicle, moving, ...(moving ? { ignition: 'running' as const } : {}) } };
  if (moving) {
    s = log(s, 'VEHICLE_START', 'Vehículo en marcha');
    const kind = s.device.screen.kind;
    if (INSERTION_FLOW.includes(kind) || (kind === 'COUNTRY' && s.device.screen.kind === 'COUNTRY' && s.device.screen.purpose === 'start')) {
      s = notice(setScreen(s, STANDARD), 'Procedimiento interrumpido por movimiento');
    } else if (kind !== 'STANDARD') {
      s = setScreen(s, STANDARD);
    }
    s = syncTimeline(s);
    if (!s.device.insertedCardId) {
      s = raiseWarning(s, {
        code: 'DRIVING_WITHOUT_CARD',
        severity: 'warning',
        title: 'Conducción sin tarjeta',
        text: 'El vehículo circula sin tarjeta de conductor. La actividad no se asigna a ningún conductor.',
        ruleId: null,
        at: s.clock.now,
      });
    }
    return s;
  }
  s = log(s, 'VEHICLE_STOP', 'Vehículo detenido');
  const after = s.config.afterStopActivity;
  if (after !== 'KEEP') s = { ...s, device: { ...s.device, selected: after } };
  return syncTimeline(s);
}

// ---------------------------------------------------------------- reductor

export function simReducer(sim: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'TICK': {
      if (sim.clock.speed === 0) return sim;
      const ticked = tickClock(sim.clock, action.realDeltaMs);
      if (ticked.now === sim.clock.now) return { ...sim, clock: ticked };
      return advanceTo({ ...sim, clock: { ...ticked, now: sim.clock.now } }, ticked.now);
    }
    case 'SET_SPEED':
      return { ...sim, clock: setSpeed(sim.clock, action.speed) };
    case 'ADVANCE_BY':
      return advanceTo(sim, sim.clock.now + Math.max(0, action.ms));
    case 'ADVANCE_TO':
      return advanceTo(sim, action.at);
    case 'JUMP_NEXT_EVENT':
      return advanceTo(sim, nextRelevantEvent(sim).at);
    case 'PRESS':
      return checkWarnings(pressButton(sim, action.button));
    case 'INSERT_CARD':
      return checkWarnings(insertCard(sim, action.cardId));
    case 'SET_MOVING':
      return checkWarnings(setMoving(sim, action.moving));
    case 'PRINT_DAILY':
      return printDaily(sim);
    case 'RENAME_CARD': {
      const card = sim.cards[action.cardId];
      const name = normalizeHolderName(action.name);
      if (!card || !name || name === card.holderName) return sim;
      return { ...sim, cards: { ...sim.cards, [card.id]: { ...card, holderName: name } } };
    }
    case 'SET_IGNITION':
      return checkWarnings(setIgnition(sim, action.position));
    case 'SET_VEHICLE_SPEED': {
      const kmh = Math.round(Math.min(MAX_SPEED_KMH, Math.max(0, action.kmh)));
      if (kmh === 0) return checkWarnings(setMoving(sim, false));
      if (sim.vehicle.ignition !== 'running') return notice(sim, 'Arranque el motor con la llave');
      const withSpeed = { ...sim, vehicle: { ...sim.vehicle, speedKmh: kmh } };
      return checkWarnings(setMoving(withSpeed, true));
    }
    case 'DISMISS_NOTICE':
      return sim.device.notice ? { ...sim, device: { ...sim.device, notice: null } } : sim;
    case 'SET_CONFIG':
      return { ...sim, config: { ...sim.config, ...action.patch } };
  }
}
