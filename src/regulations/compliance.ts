import type { EpochMs } from '@/shared/types';
import { eventEnd, type ActivityEvent } from '@/time-engine/timeline';
import { HOUR, MINUTE } from '@/time-engine/units';
import { addZonedDays, formatDateTime, startOfZonedWeek } from '@/time-engine/zoned';
import { computeContinuousDriving, CONTINUOUS_DRIVING_LIMIT, type ContinuousDrivingStatus } from './continuousDriving';

/**
 * Motor normativo de la Fase 2: arts. 6 y 8 del Reglamento (CE) 561/2006
 * (texto consolidado 31.12.2024). Funciones puras sobre la línea temporal.
 *
 * Supuestos e interpretaciones (documentados en docs/REGULATIONS.md):
 *  - Días y semanas en UTC.
 *  - El conductor inicia el escenario tras un descanso semanal normal que termina en `startsAt`;
 *    la semana anterior al escenario tiene 0 h de conducción.
 *  - Un descanso ininterrumpido ≥ 24 h se trata como descanso semanal; ≥ 9 h como diario;
 *    un bloque de 3 h a 9 h puede ser la primera parte de un descanso diario fraccionado.
 *  - Una jornada pertenece a la semana en la que empieza (cómputo de ampliaciones a 10 h).
 *  - Los huecos sin registro no son descanso.
 */

export const LIMITS = {
  DAILY_DRIVING: 9 * HOUR,
  DAILY_DRIVING_EXTENDED: 10 * HOUR,
  EXTENSIONS_PER_WEEK: 2,
  WEEKLY_DRIVING: 56 * HOUR,
  BIWEEKLY_DRIVING: 90 * HOUR,
  DAILY_REST_NORMAL: 11 * HOUR,
  DAILY_REST_REDUCED: 9 * HOUR,
  SPLIT_FIRST: 3 * HOUR,
  MAX_REDUCED_DAILY: 3,
  DAILY_WINDOW: 24 * HOUR,
  WEEKLY_REST_NORMAL: 45 * HOUR,
  WEEKLY_REST_REDUCED: 24 * HOUR,
  WEEKLY_REST_DEADLINE: 6 * 24 * HOUR,
  DAILY_PREWARN: 15 * MINUTE,
  WEEKLY_PREWARN: 55 * HOUR,
  BIWEEKLY_PREWARN: 89 * HOUR,
} as const;

export interface ComplianceContext {
  startsAt: EpochMs;
  weekOneStart: EpochMs;
  endsAt: EpochMs;
  timeZone: string;
  /** Trayectos en transbordador/tren registrados por el conductor (condición específica del tacógrafo). */
  ferry?: readonly FerryPeriod[];
}

export interface FerryPeriod {
  start: EpochMs;
  end: EpochMs | null;
}

export type Severity = 'infringement' | 'warning' | 'needs-context' | 'info';

export interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  at: EpochMs;
  title: string;
  detail: string;
}

export interface Obligation {
  id: string;
  ruleId: string;
  title: string;
  dueAt: EpochMs;
  status: 'pending' | 'fulfilled' | 'overdue';
  fulfilledAt?: EpochMs;
  owedMs?: number;
  detail: string;
}

export interface RestBlock {
  start: EpochMs;
  end: EpochMs;
  ongoing: boolean;
  /** Interrupciones toleradas por el art. 9 (transbordador/tren): número y duración total. */
  ferryGaps?: { count: number; ms: number };
}

export type DailyRestKind = 'NORMAL' | 'SPLIT' | 'REDUCED' | 'INSUFFICIENT';

export interface DailyPeriod {
  index: number;
  /** Fin del descanso anterior. */
  start: EpochMs;
  /** Inicio del descanso que cierra la jornada (null = jornada en curso). */
  end: EpochMs | null;
  /** Límite de la ventana de 24 h del art. 8.2. */
  windowEnd: EpochMs;
  weekStart: EpochMs;
  drivingMs: number;
  extended: boolean;
  closing: {
    block: RestBlock;
    weekly: boolean;
    kind: DailyRestKind;
    insideWindowMs: number;
    splitFirst: RestBlock | null;
    provisional: boolean;
  } | null;
}

export interface WeeklyRest {
  block: RestBlock;
  durationMs: number;
  normal: boolean;
  /** En curso y todavía < 45 h: puede acabar siendo normal. */
  provisional: boolean;
}

export interface WeekSummary {
  start: EpochMs;
  drivingMs: number;
  extensions: number;
}

export interface CurrentStatus {
  period: DailyPeriod | null;
  dailyDrivingMs: number;
  dailyCapMs: number;
  extensionsUsedThisWeek: number;
  reducedDailySinceWeekly: number;
  weekDrivingMs: number;
  biweekDrivingMs: number;
  continuous: ContinuousDrivingStatus;
  dailyRestStartBy: { normal: EpochMs; reduced: EpochMs | null } | null;
  weeklyRestStartBy: EpochMs | null;
  availableDrivingMs: number;
  limitingFactor: string;
}

export interface ComplianceReport {
  periods: DailyPeriod[];
  weeklyRests: WeeklyRest[];
  findings: Finding[];
  obligations: Obligation[];
  weeks: WeekSummary[];
  current: CurrentStatus;
}

// ------------------------------------------------------------------ utilidades

/**
 * Art. 9.1 R. 561/2006: el descanso diario normal (o el semanal reducido) de un conductor que acompaña al
 * vehículo en transbordador o tren puede interrumpirse como máximo dos veces, sin superar una hora en total.
 * Une los bloques de descanso que cumplan esas condiciones si alguno coincide con un trayecto en
 * transbordador/tren registrado y el descanso suma al menos 11 h (aproximación: no se comprueba la litera).
 */
export function bridgeFerryRests(blocks: readonly RestBlock[], ferry: readonly FerryPeriod[], now: EpochMs): RestBlock[] {
  if (ferry.length === 0) return [...blocks];
  const onFerry = (b: RestBlock) => ferry.some((f) => b.start < (f.end ?? now) && f.start < b.end);
  const out: RestBlock[] = [];
  let i = 0;
  while (i < blocks.length) {
    let best: RestBlock = blocks[i]!;
    // Prueba a unir este bloque con los dos siguientes (dos interrupciones) o con el siguiente (una).
    for (const n of [2, 1]) {
      const chain = blocks.slice(i, i + n + 1);
      if (chain.length !== n + 1 || !chain.some(onFerry)) continue;
      const gaps = chain.slice(1).map((b, k) => b.start - chain[k]!.end);
      const gapMs = gaps.reduce((a, g) => a + g, 0);
      const restMs = chain.reduce((a, b) => a + (b.end - b.start), 0);
      if (gapMs <= HOUR && restMs >= LIMITS.DAILY_REST_NORMAL) {
        const last = chain[chain.length - 1]!;
        best = { start: chain[0]!.start, end: last.end, ongoing: last.ongoing, ferryGaps: { count: n, ms: gapMs } };
        break;
      }
    }
    out.push(best);
    i += best.ferryGaps ? best.ferryGaps.count + 1 : 1;
  }
  return out;
}

/** Bloques de descanso ininterrumpidos: REST contiguos fusionados; un hueco rompe la continuidad. */
export function restBlocks(events: readonly ActivityEvent[], now: EpochMs, ferry: readonly FerryPeriod[] = []): RestBlock[] {
  return bridgeFerryRests(plainRestBlocks(events, now), ferry, now);
}

function plainRestBlocks(events: readonly ActivityEvent[], now: EpochMs): RestBlock[] {
  const blocks: RestBlock[] = [];
  for (const e of events) {
    if (e.activity !== 'REST') continue;
    const end = eventEnd(e, now);
    if (end <= e.start) continue;
    const last = blocks[blocks.length - 1];
    if (last && last.end === e.start) {
      last.end = end;
      last.ongoing = e.end === null;
    } else {
      blocks.push({ start: e.start, end, ongoing: e.end === null });
    }
  }
  return blocks;
}

export function drivingBetween(events: readonly ActivityEvent[], from: EpochMs, to: EpochMs, now: EpochMs): number {
  let acc = 0;
  for (const e of events) {
    if (e.activity !== 'DRIVING') continue;
    acc += Math.max(0, Math.min(eventEnd(e, now), to, now) - Math.max(e.start, from));
  }
  return acc;
}

/** Instante en que la conducción acumulada desde `from` alcanza `threshold` (null si no ocurre antes de `to`). */
export function drivingCrossing(
  events: readonly ActivityEvent[],
  from: EpochMs,
  to: EpochMs,
  threshold: number,
  now: EpochMs,
): EpochMs | null {
  let acc = 0;
  for (const e of events) {
    if (e.activity !== 'DRIVING') continue;
    const s = Math.max(e.start, from);
    const en = Math.min(eventEnd(e, now), to, now);
    if (en <= s) continue;
    if (acc + (en - s) > threshold) return s + (threshold - acc);
    acc += en - s;
  }
  return null;
}

const h = (ms: number) => {
  const m = Math.round(ms / MINUTE);
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
};

// ------------------------------------------------------------------ análisis

export function analyzeCompliance(
  input: readonly ActivityEvent[],
  now: EpochMs,
  ctx: ComplianceContext,
): ComplianceReport {
  const tz = ctx.timeZone;
  const fmt = (t: EpochMs) => `${formatDateTime(t, tz)} UTC`;
  const weekOf = (t: EpochMs) => startOfZonedWeek(t, tz);
  const events = [...input].sort((a, b) => a.start - b.start);
  const findings: Finding[] = [];
  const obligations: Obligation[] = [];
  const add = (f: Omit<Finding, 'id'>) => findings.push({ ...f, id: `${f.ruleId}@${f.at}` });

  // ---- 1. Segmentación en jornadas y descansos
  const periods: DailyPeriod[] = [];
  const weeklyRests: WeeklyRest[] = [];
  let periodStart: EpochMs | null = ctx.startsAt;
  let lastWeeklyEnd: EpochMs = ctx.startsAt;
  let weeklyOngoing = false;
  let reducedSinceWeekly = 0;
  let splitFirst: RestBlock | null = null;

  const newPeriod = (start: EpochMs): DailyPeriod => ({
    index: periods.length,
    start,
    end: null,
    windowEnd: start + LIMITS.DAILY_WINDOW,
    weekStart: weekOf(start),
    drivingMs: 0,
    extended: false,
    closing: null,
  });

  const closePeriod = (b: RestBlock, weekly: boolean) => {
    const p = newPeriod(periodStart!);
    // Las interrupciones del art. 9 no cuentan como descanso.
    const inside = Math.max(0, Math.min(b.end, p.windowEnd) - b.start - (b.ferryGaps?.ms ?? 0));
    const provisional = b.ongoing && b.end < p.windowEnd;
    const split = splitFirst && splitFirst.end <= p.windowEnd && inside >= LIMITS.DAILY_REST_REDUCED ? splitFirst : null;
    const kind: DailyRestKind = split
      ? 'SPLIT'
      : inside >= LIMITS.DAILY_REST_NORMAL
        ? 'NORMAL'
        : inside >= LIMITS.DAILY_REST_REDUCED
          ? 'REDUCED'
          : 'INSUFFICIENT';
    p.end = b.start;
    p.closing = { block: b, weekly, kind, insideWindowMs: inside, splitFirst: split, provisional };
    periods.push(p);

    if (kind === 'INSUFFICIENT' && !provisional) {
      add({
        ruleId: 'R561-ART8-24H',
        severity: 'infringement',
        at: p.windowEnd - LIMITS.DAILY_REST_REDUCED,
        title: 'Descanso diario insuficiente en la ventana de 24 h',
        detail: `La jornada empezó el ${fmt(p.start)}. Dentro de las 24 h siguientes solo hubo ${h(inside)} de descanso; se necesitan al menos 9 h (reducido) u 11 h (normal). Art. 8.2.`,
      });
    }
    if (kind === 'REDUCED' && !weekly && !provisional) {
      reducedSinceWeekly++;
      if (reducedSinceWeekly > LIMITS.MAX_REDUCED_DAILY) {
        add({
          ruleId: 'R561-ART8-DR9',
          severity: 'infringement',
          at: b.start,
          title: 'Más de tres descansos diarios reducidos',
          detail: `Descanso diario reducido n.º ${reducedSinceWeekly} desde el último descanso semanal (máximo 3). Art. 8.4.`,
        });
      }
    }
  };

  for (const b of restBlocks(events, now, ctx.ferry ?? [])) {
    if (b.ferryGaps) {
      add({
        ruleId: 'R561-ART9-FERRY',
        severity: 'info',
        at: b.start,
        title: 'Descanso en transbordador/tren con interrupciones (art. 9)',
        detail: `El descanso que empieza el ${fmt(b.start)} se interrumpió ${b.ferryGaps.count} ${b.ferryGaps.count === 1 ? 'vez' : 'veces'} (${h(b.ferryGaps.ms)} en total) durante un trayecto en transbordador/tren. Se admite como descanso continuo si el conductor tenía acceso a cama o litera. Art. 9.1.`,
      });
    }
    if (b.end <= ctx.startsAt || periodStart === null || b.start < periodStart) continue;
    const len = b.end - b.start;
    if (len >= LIMITS.WEEKLY_REST_REDUCED) {
      closePeriod(b, true);
      weeklyRests.push({ block: b, durationMs: len, normal: len >= LIMITS.WEEKLY_REST_NORMAL, provisional: b.ongoing && len < LIMITS.WEEKLY_REST_NORMAL });
      const deadline = lastWeeklyEnd + LIMITS.WEEKLY_REST_DEADLINE;
      if (b.start > deadline) {
        add({
          ruleId: 'R561-ART8-6DAYS',
          severity: 'infringement',
          at: deadline,
          title: 'Descanso semanal iniciado demasiado tarde',
          detail: `Debía empezar antes del ${fmt(deadline)} (seis periodos de 24 h tras el anterior); empezó el ${fmt(b.start)}. Art. 8.6.`,
        });
      }
      lastWeeklyEnd = b.end;
      weeklyOngoing = b.ongoing;
      reducedSinceWeekly = 0;
      splitFirst = null;
      periodStart = b.ongoing ? null : b.end;
    } else if (len >= LIMITS.DAILY_REST_REDUCED) {
      closePeriod(b, false);
      splitFirst = null;
      periodStart = b.ongoing ? null : b.end;
    } else if (len >= LIMITS.SPLIT_FIRST && !splitFirst && !b.ongoing) {
      splitFirst = b;
    }
  }

  let open: DailyPeriod | null = null;
  if (periodStart !== null) {
    open = newPeriod(periodStart);
    periods.push(open);
    const latestReduced = open.windowEnd - LIMITS.DAILY_REST_REDUCED;
    if (now > latestReduced) {
      add({
        ruleId: 'R561-ART8-24H',
        severity: 'infringement',
        at: latestReduced,
        title: 'Descanso diario no iniciado a tiempo',
        detail: `La jornada empezó el ${fmt(open.start)}: el descanso diario (al menos 9 h) debía empezar antes del ${fmt(latestReduced)} para completarse dentro de las 24 h. Art. 8.2.`,
      });
    } else {
      obligations.push({
        id: `daily-rest@${open.start}`,
        ruleId: 'R561-ART8-24H',
        title: 'Descanso diario de la jornada actual',
        dueAt: latestReduced,
        status: 'pending',
        detail: `Empieza el descanso antes del ${fmt(open.windowEnd - LIMITS.DAILY_REST_NORMAL)} para que sea normal (11 h), o como muy tarde el ${fmt(latestReduced)} si es reducido (9 h).`,
      });
    }
  }

  // ---- 2. Seis periodos de 24 h sin descanso semanal (situación actual)
  const weeklyDue = lastWeeklyEnd + LIMITS.WEEKLY_REST_DEADLINE;
  if (!weeklyOngoing) {
    if (now > weeklyDue) {
      add({
        ruleId: 'R561-ART8-6DAYS',
        severity: 'infringement',
        at: weeklyDue,
        title: 'Descanso semanal pendiente fuera de plazo',
        detail: `Desde el último descanso semanal (${fmt(lastWeeklyEnd)}) han pasado más de seis periodos de 24 h sin iniciar otro. Art. 8.6.`,
      });
    } else {
      obligations.push({
        id: `weekly-rest@${lastWeeklyEnd}`,
        ruleId: 'R561-ART8-6DAYS',
        title: 'Próximo descanso semanal',
        dueAt: weeklyDue,
        status: 'pending',
        detail: `Debe empezar antes del ${fmt(weeklyDue)} (seis periodos de 24 h desde el ${fmt(lastWeeklyEnd)}). Art. 8.6.`,
      });
    }
  }

  // ---- 3. Conducción diaria y ampliaciones (art. 6.1)
  const extensionsByWeek = new Map<EpochMs, number>();
  for (const p of periods) {
    const to = p.end ?? now;
    p.drivingMs = drivingBetween(events, p.start, to, now);
    p.extended = p.drivingMs > LIMITS.DAILY_DRIVING;
    if (p.extended) {
      const n = (extensionsByWeek.get(p.weekStart) ?? 0) + 1;
      extensionsByWeek.set(p.weekStart, n);
      if (n > LIMITS.EXTENSIONS_PER_WEEK) {
        add({
          ruleId: 'R561-ART6-DAILY10',
          severity: 'infringement',
          at: drivingCrossing(events, p.start, to, LIMITS.DAILY_DRIVING, now) ?? p.start,
          title: 'Tercera ampliación a 10 h en la misma semana',
          detail: `La jornada del ${fmt(p.start)} supera 9 h de conducción y ya se habían usado las dos ampliaciones de la semana. Art. 6.1.`,
        });
      }
    }
    if (p.drivingMs > LIMITS.DAILY_DRIVING_EXTENDED) {
      add({
        ruleId: 'R561-ART6-DAILY10',
        severity: 'infringement',
        at: drivingCrossing(events, p.start, to, LIMITS.DAILY_DRIVING_EXTENDED, now) ?? p.start,
        title: 'Conducción diaria superior a 10 h',
        detail: `La jornada del ${fmt(p.start)} acumula ${h(p.drivingMs)} de conducción (máximo 10 h, y solo dos veces por semana). Art. 6.1.`,
      });
    }
  }

  // ---- 4. Conducción semanal y bisemanal (art. 6.2 y 6.3)
  const weeks: WeekSummary[] = [0, 1].map((i) => {
    const start = addZonedDays(ctx.weekOneStart, 7 * i, tz);
    return { start, drivingMs: drivingBetween(events, start, addZonedDays(start, 7, tz), now), extensions: extensionsByWeek.get(start) ?? 0 };
  });
  for (const w of weeks) {
    if (w.drivingMs > LIMITS.WEEKLY_DRIVING) {
      add({
        ruleId: 'R561-ART6-WEEKLY56',
        severity: 'infringement',
        at: drivingCrossing(events, w.start, addZonedDays(w.start, 7, tz), LIMITS.WEEKLY_DRIVING, now) ?? w.start,
        title: 'Conducción semanal superior a 56 h',
        detail: `La semana del ${fmt(w.start)} acumula ${h(w.drivingMs)} de conducción. Art. 6.2.`,
      });
    }
  }
  const total = weeks[0]!.drivingMs + weeks[1]!.drivingMs;
  if (total > LIMITS.BIWEEKLY_DRIVING) {
    add({
      ruleId: 'R561-ART6-BIWEEKLY90',
      severity: 'infringement',
      at: drivingCrossing(events, weeks[0]!.start, ctx.endsAt, LIMITS.BIWEEKLY_DRIVING, now) ?? weeks[1]!.start,
      title: 'Más de 90 h de conducción en dos semanas consecutivas',
      detail: `Las dos semanas del escenario suman ${h(total)} de conducción. Art. 6.3.`,
    });
  }

  // ---- 5. Conducción continua (art. 7)
  const continuous = computeContinuousDriving(events, now);
  for (const at of continuous.overruns) {
    add({
      ruleId: 'R561-ART7-CONT',
      severity: 'infringement',
      at,
      title: 'Más de 4 h 30 min de conducción sin pausa válida',
      detail: 'Tras 4 h 30 min de conducción hay que hacer una pausa de 45 min (o 15 + 30). Art. 7.',
    });
  }

  // ---- 6. Descansos semanales en dos semanas consecutivas (art. 8.6)
  const inScenario = weeklyRests.filter((r) => r.block.start < ctx.endsAt && r.block.end > ctx.weekOneStart);
  const firm = inScenario.filter((r) => !r.provisional);
  const satisfied = firm.length >= 2 && firm.some((r) => r.normal);
  if (satisfied) {
    obligations.push({ id: 'weekly-pair', ruleId: 'R561-ART8-WR24', title: 'Descansos semanales de las dos semanas', dueAt: ctx.endsAt, status: 'fulfilled', detail: 'Hay al menos dos descansos semanales y uno de ellos es normal (≥ 45 h).' });
  } else if (now >= ctx.endsAt) {
    const pendingOne = inScenario.some((r) => r.provisional);
    add({
      ruleId: 'R561-ART8-WR24',
      severity: pendingOne ? 'needs-context' : 'infringement',
      at: ctx.endsAt,
      title: 'Descansos semanales insuficientes en dos semanas',
      detail: pendingOne
        ? 'El último descanso semanal sigue en curso al terminar el escenario: su valoración depende de cuándo termine. Art. 8.6.'
        : `En las dos semanas hay ${firm.length} descanso(s) semanal(es) y ${firm.filter((r) => r.normal).length} normal(es); se requieren dos normales, o uno normal y uno reducido de al menos 24 h. Art. 8.6.`,
    });
  } else {
    obligations.push({ id: 'weekly-pair', ruleId: 'R561-ART8-WR24', title: 'Descansos semanales de las dos semanas', dueAt: ctx.endsAt, status: 'pending', detail: `Llevas ${firm.length} descanso(s) semanal(es) (${firm.filter((r) => r.normal).length} normal/es). Necesitas dos, al menos uno normal de 45 h. Art. 8.6.` });
  }

  // ---- 7. Compensación de descansos semanales reducidos (art. 8.6 ter y 8.7)
  const blocks = restBlocks(events, now, ctx.ferry ?? []);
  const used = new Set<number>();
  for (const r of weeklyRests) {
    if (r.normal || r.provisional) continue;
    const owed = LIMITS.WEEKLY_REST_NORMAL - r.durationMs;
    const dueAt = addZonedDays(weekOf(r.block.start), 28, tz);
    const carrier = blocks.findIndex((b, i) => {
      if (used.has(i) || b.start < r.block.end || b.end > dueAt) return false;
      const len = b.end - b.start;
      const base = len >= LIMITS.WEEKLY_REST_NORMAL ? LIMITS.WEEKLY_REST_NORMAL : len >= LIMITS.DAILY_REST_REDUCED && len < LIMITS.WEEKLY_REST_REDUCED ? LIMITS.DAILY_REST_REDUCED : Infinity;
      return len - base >= owed;
    });
    const beyond = dueAt > ctx.endsAt;
    const base = { id: `comp@${r.block.start}`, ruleId: 'R561-ART8-COMP', title: `Compensar ${h(owed)} del descanso semanal reducido del ${fmt(r.block.start)}`, dueAt, owedMs: owed };
    if (carrier >= 0) {
      used.add(carrier);
      obligations.push({ ...base, status: 'fulfilled', fulfilledAt: blocks[carrier]!.end, detail: `Compensado en una sola vez junto a un descanso que terminó el ${fmt(blocks[carrier]!.end)}.` });
    } else if (now >= dueAt) {
      obligations.push({ ...base, status: 'overdue', detail: 'No se compensó antes del final de la tercera semana siguiente.' });
      add({ ruleId: 'R561-ART8-COMP', severity: 'infringement', at: dueAt, title: 'Compensación de descanso semanal no realizada', detail: `${h(owed)} debían compensarse antes del ${fmt(dueAt)}. Art. 8.6 ter.` });
    } else {
      obligations.push({
        ...base,
        status: 'pending',
        detail: `Debe tomarse en una sola vez, unida a otro descanso de al menos 9 h, antes del ${fmt(dueAt)}${beyond ? ' — después del final del escenario: la obligación sigue pendiente aunque termine la simulación' : ''}. Art. 8.6 ter y 8.7.`,
      });
    }
  }

  // ---- 8. Estado actual y conducción disponible
  const cw = weekOf(now);
  const weekDrivingMs = drivingBetween(events, cw, addZonedDays(cw, 7, tz), now);
  const biweekDrivingMs = drivingBetween(events, addZonedDays(cw, -7, tz), addZonedDays(cw, 7, tz), now);
  const refWeek = open ? open.weekStart : cw;
  const extensionsUsedThisWeek = extensionsByWeek.get(refWeek) ?? 0;
  const dailyDrivingMs = open?.drivingMs ?? 0;
  const extensionsOther = extensionsUsedThisWeek - (open?.extended ? 1 : 0);
  const dailyCapMs =
    open?.extended || extensionsOther < LIMITS.EXTENSIONS_PER_WEEK ? LIMITS.DAILY_DRIVING_EXTENDED : LIMITS.DAILY_DRIVING;
  const limits: [string, number][] = [
    [dailyCapMs === LIMITS.DAILY_DRIVING_EXTENDED ? 'conducción diaria (10 h con ampliación)' : 'conducción diaria (9 h)', dailyCapMs - dailyDrivingMs],
    ['conducción semanal (56 h)', LIMITS.WEEKLY_DRIVING - weekDrivingMs],
    ['dos semanas (90 h)', LIMITS.BIWEEKLY_DRIVING - biweekDrivingMs],
    ['conducción continua (4 h 30)', CONTINUOUS_DRIVING_LIMIT - continuous.drivingSinceBreakMs],
  ];
  const [limitingFactor, avail] = limits.reduce((a, b) => (b[1] < a[1] ? b : a));

  findings.sort((a, b) => a.at - b.at);
  return {
    periods,
    weeklyRests,
    findings,
    obligations,
    weeks,
    current: {
      period: open,
      dailyDrivingMs,
      dailyCapMs,
      extensionsUsedThisWeek,
      reducedDailySinceWeekly: reducedSinceWeekly,
      weekDrivingMs,
      biweekDrivingMs,
      continuous,
      dailyRestStartBy: open
        ? {
            normal: open.windowEnd - LIMITS.DAILY_REST_NORMAL,
            reduced: reducedSinceWeekly < LIMITS.MAX_REDUCED_DAILY ? open.windowEnd - LIMITS.DAILY_REST_REDUCED : null,
          }
        : null,
      weeklyRestStartBy: weeklyOngoing ? null : weeklyDue,
      availableDrivingMs: Math.max(0, avail),
      limitingFactor,
    },
  };
}
