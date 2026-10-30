import { msg, N_, type I18nText } from '@/i18n';
import type { EpochMs } from '@/shared/types';
import { CONTINUOUS_DRIVING_LIMIT, CONTINUOUS_DRIVING_PREWARN } from '@/regulations/continuousDriving';
import { LIMITS, restBlocks, type ComplianceReport } from '@/regulations/compliance';
import { formatDuration, HOUR, MINUTE } from '@/time-engine/units';
import { openEvent } from '@/time-engine/timeline';
import { formatDateTime } from '@/time-engine/zoned';
import type { DeviceWarning } from '@/tachograph/types';
import { complianceFor, currentDriverEvents } from './derived';
import type { SimState } from './state';

/**
 * Avisos del dispositivo derivados del informe normativo. Cada aviso tiene una
 * clave única (aviso + periodo) para emitirse una sola vez, y un instante de
 * cruce exacto, aunque se avance el reloj de golpe.
 */
export interface WarningTrigger {
  key: string;
  at: EpochMs;
  warning: Omit<DeviceWarning, 'at'>;
}

/** Texto de aviso con datos: en español y con su identificador para traducirlo. */
function dyn(id: string, p?: Record<string, string | number>): { text: string; textI18n: I18nText } {
  const m = msg(id, p);
  return { text: m.text, textI18n: m.i18n };
}

export function warningTriggers(sim: SimState, report: ComplianceReport | null = complianceFor(sim)): WarningTrigger[] {
  if (!report) return [];
  const now = sim.clock.now;
  const moving = sim.vehicle.moving;
  const resting = openEvent(sim.timeline)?.activity === 'REST';
  const c = report.current;
  const out: WarningTrigger[] = [];

  /** Umbral de conducción: ya superado (instante pasado) o, si se conduce, cuándo se alcanzará. */
  const driving = (key: string, current: number, threshold: number, w: WarningTrigger['warning']) => {
    const remaining = threshold - current;
    if (remaining <= 0) out.push({ key, at: now + remaining, warning: w });
    else if (moving) out.push({ key, at: now + remaining, warning: w });
  };
  /** Umbral horario: solo aplica si no se está ya descansando. */
  const timed = (key: string, at: EpochMs | null, w: WarningTrigger['warning']) => {
    if (at === null || (resting && at <= now)) return;
    out.push({ key, at, warning: w });
  };
  const tz = sim.scenario.timeZone;
  const fmt = (t: EpochMs) => `${formatDateTime(t, tz)} UTC`;

  const cont = c.continuous;
  // Con «Fuera de ámbito» abierto no se emiten las advertencias de conducción continua (anexo IC, req. 62).
  const outOfScope = sim.device.condition === 'OUT';
  if (!outOfScope) driving(`CONT_PRE:${cont.periodIndex}`, cont.drivingSinceBreakMs, CONTINUOUS_DRIVING_PREWARN, {
    code: 'CONT_DRIVING_PREWARN', severity: 'info', ruleId: 'R561-ART7-CONT',
    title: N_('Pausa próxima'),
    text: N_('Llevas 4 h 15 min de conducción continua. Planifica una pausa en los próximos 15 min.'),
  });
  if (!outOfScope) driving(`CONT_EXC:${cont.periodIndex}`, cont.drivingSinceBreakMs, CONTINUOUS_DRIVING_LIMIT, {
    code: 'CONT_DRIVING_EXCEEDED', severity: 'warning', ruleId: 'R561-ART7-CONT',
    title: N_('Límite de conducción continua alcanzado'),
    text: N_('Llevas 4 h 30 min sin una pausa válida: si sigues conduciendo cometes una infracción. Detén el vehículo y haz una pausa de 45 min (o 15 + 30).'),
  });

  if (c.period) {
    const p = c.period.start;
    const cap = c.dailyCapMs;
    driving(`DAILY_PRE:${p}`, c.dailyDrivingMs, cap - LIMITS.DAILY_PREWARN, {
      code: 'DAILY_DRIVING_PREWARN', severity: 'info', ruleId: cap > LIMITS.DAILY_DRIVING ? 'R561-ART6-DAILY10' : 'R561-ART6-DAILY9',
      title: N_('Fin de la conducción diaria próximo'),
      ...dyn('Quedan 15 min para alcanzar {cap} h de conducción en esta jornada.', { cap: formatDuration(cap) }),
    });
    if (cap > LIMITS.DAILY_DRIVING) {
      driving(`DAILY_EXT:${p}`, c.dailyDrivingMs, LIMITS.DAILY_DRIVING, {
        code: 'DAILY_EXTENSION', severity: 'info', ruleId: 'R561-ART6-DAILY10',
        title: N_('Ampliación a 10 h en uso'),
        ...dyn('Superas 9 h de conducción: usas una de las dos ampliaciones semanales ({n}/2).', { n: c.extensionsUsedThisWeek + (c.dailyDrivingMs > LIMITS.DAILY_DRIVING ? 0 : 1) }),
      });
    }
    driving(`DAILY_EXC:${p}`, c.dailyDrivingMs, cap, {
      code: 'DAILY_DRIVING_EXCEEDED', severity: 'warning', ruleId: cap > LIMITS.DAILY_DRIVING ? 'R561-ART6-DAILY10' : 'R561-ART6-DAILY9',
      title: N_('Límite de conducción diaria alcanzado'),
      text: cap > LIMITS.DAILY_DRIVING
        ? N_('Has llegado a 10 h de conducción en la jornada: seguir conduciendo es una infracción.')
        : N_('Has llegado a 9 h y ya no te quedan ampliaciones esta semana: seguir conduciendo es una infracción.'),
    });
    const rest = c.dailyRestStartBy!;
    timed(`DREST_NORMAL:${p}`, rest.normal, {
      code: 'DAILY_REST_DUE', severity: 'info', ruleId: 'R561-ART8-24H',
      title: N_('Hora de iniciar el descanso diario'),
      ...(rest.reduced
        ? dyn('Para que el descanso diario sea normal (11 h) debe empezar ahora. Como muy tarde, reducido (9 h): {at}.', { at: fmt(rest.reduced) })
        : dyn('Para que el descanso diario sea normal (11 h) debe empezar ahora.')),
    });
    if (rest.reduced) {
      timed(`DREST_LAST:${p}`, rest.reduced, {
        code: 'DAILY_REST_LAST_CALL', severity: 'infringement', ruleId: 'R561-ART8-24H',
        title: N_('Descanso diario fuera de plazo'),
        text: N_('Ya no cabe un descanso diario de 9 h dentro de las 24 h de la jornada.'),
      });
    }
  }

  const wk = Math.floor((now - sim.scenario.weekOneStart) / (7 * 24 * HOUR));
  driving(`WEEK_PRE:${wk}`, c.weekDrivingMs, LIMITS.WEEKLY_PREWARN, {
    code: 'WEEKLY_DRIVING_PREWARN', severity: 'info', ruleId: 'R561-ART6-WEEKLY56',
    title: N_('Límite semanal próximo'), text: N_('Llevas 55 h de conducción esta semana (máximo 56 h).'),
  });
  driving(`WEEK_EXC:${wk}`, c.weekDrivingMs, LIMITS.WEEKLY_DRIVING, {
    code: 'WEEKLY_DRIVING_EXCEEDED', severity: 'warning', ruleId: 'R561-ART6-WEEKLY56',
    title: N_('Límite semanal alcanzado'), text: N_('Has llegado a 56 h de conducción esta semana: seguir conduciendo es una infracción.'),
  });
  driving(`BIWEEK_PRE:${wk}`, c.biweekDrivingMs, LIMITS.BIWEEKLY_PREWARN, {
    code: 'BIWEEKLY_DRIVING_PREWARN', severity: 'info', ruleId: 'R561-ART6-BIWEEKLY90',
    title: N_('Límite de dos semanas próximo'), text: N_('Llevas 89 h de conducción en dos semanas consecutivas (máximo 90 h).'),
  });
  driving(`BIWEEK_EXC:${wk}`, c.biweekDrivingMs, LIMITS.BIWEEKLY_DRIVING, {
    code: 'BIWEEKLY_DRIVING_EXCEEDED', severity: 'warning', ruleId: 'R561-ART6-BIWEEKLY90',
    title: N_('Límite de dos semanas alcanzado'), text: N_('Has llegado a 90 h de conducción en dos semanas consecutivas: seguir conduciendo es una infracción.'),
  });
  timed(`WREST:${c.weeklyRestStartBy}`, c.weeklyRestStartBy, {
    code: 'WEEKLY_REST_DUE', severity: 'infringement', ruleId: 'R561-ART8-6DAYS',
    title: N_('Descanso semanal pendiente'),
    text: N_('Han pasado seis periodos de 24 h desde el último descanso semanal: debías haberlo iniciado.'),
  });
  return out;
}

/** Hitos de un descanso en curso (pausa válida, descanso diario, semanal). */
const REST_MILESTONES: [number, string][] = [
  [15 * MINUTE, N_('Pausa de 15 min completada')],
  [30 * MINUTE, N_('Pausa de 30 min completada')],
  [45 * MINUTE, N_('Pausa de 45 min completada')],
  [LIMITS.DAILY_REST_REDUCED, N_('Descanso diario reducido (9 h) completado')],
  [LIMITS.DAILY_REST_NORMAL, N_('Descanso diario normal (11 h) completado')],
  [LIMITS.WEEKLY_REST_REDUCED, N_('Descanso semanal reducido (24 h) completado')],
  [LIMITS.WEEKLY_REST_NORMAL, N_('Descanso semanal normal (45 h) completado')],
];

/** Próximo instante relevante para detener un avance largo del reloj. */
export function nextStop(sim: SimState): { at: EpochMs; label: string } | null {
  const now = sim.clock.now;
  const candidates: { at: EpochMs; label: string }[] = warningTriggers(sim)
    .filter((t) => t.at > now && !sim.device.warnFlags[t.key])
    .map((t) => ({ at: t.at, label: t.warning.title }));
  if (sim.device.insertedCardId) {
    const last = restBlocks(currentDriverEvents(sim), now).at(-1);
    if (last?.ongoing) {
      const len = last.end - last.start;
      const m = REST_MILESTONES.find(([ms]) => ms > len);
      if (m) candidates.push({ at: last.start + m[0], label: m[1] });
    }
  }
  return candidates.sort((a, b) => a.at - b.at)[0] ?? null;
}
