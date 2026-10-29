import { useState } from 'react';
import { ACTIVITY_LABEL } from '@/shared/types';
import { LIMITS } from '@/regulations/compliance';
import { CONTINUOUS_DRIVING_LIMIT, breakRemainingMs } from '@/regulations/continuousDriving';
import { complianceFor, deriveSummary } from '@/simulator/derived';
import { useSimStore } from '@/simulator/store';
import { formatDuration } from '@/time-engine/units';
import { formatDateTime, formatTime } from '@/time-engine/zoned';
import { useUiStore } from '../uiStore';
import { ActivityIcon, ACTIVITY_COLOR } from './icons';
import { StatusPanel } from './StatusPanel';

/**
 * Resumen único del estado: lo que más importa a la vista (cuánto puedes
 * conducir y por qué) y el resto plegado en «Ver detalle».
 */
export function StatusCard() {
  const sim = useSimStore((s) => s.sim);
  const go = useUiStore((s) => s.go);
  const [details, setDetails] = useState(false);
  const sum = deriveSummary(sim);
  const report = complianceFor(sim);
  const tz = sim.scenario.timeZone;

  if (!report) {
    return (
      <section className="glass rounded-2xl p-5" aria-label="Estado">
        <div className="text-sm font-semibold text-slate-100">Sin tarjeta</div>
        <p className="mt-1 text-sm text-slate-400">Inserta la tarjeta ficticia en la ranura del tacógrafo para que los tiempos se asignen a un conductor.</p>
        <Activity recorded={sum.recorded} selected={sum.selected} />
      </section>
    );
  }

  const c = report.current;
  const infr = report.findings.filter((f) => f.severity === 'infringement').length;
  const cont = c.continuous;
  const avail = c.availableDrivingMs;
  const pct = Math.min(1, avail / CONTINUOUS_DRIVING_LIMIT);
  const ringColor = avail === 0 ? '#f43f5e' : pct < 0.2 ? '#fbbf24' : '#22d3ee';

  return (
    <section className="glass rounded-2xl p-5" aria-label="Estado">
      <div className="flex items-center gap-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${pct * 314} 314`} style={{ transition: 'stroke-dasharray 400ms ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-2xl font-semibold text-white" data-testid="available-driving">{formatDuration(avail)}</div>
            <div className="text-[9px] uppercase leading-tight tracking-wider text-slate-400">para<br />conducir</div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-400">Te limita</div>
          <div className="text-sm font-medium text-slate-100">{c.limitingFactor}</div>
          <button
            type="button"
            onClick={() => go('report')}
            data-testid="infringement-count"
            className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${infr ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/15 text-emerald-300'}`}
          >
            {infr ? `${infr} infracción(es) · ver informe` : 'Sin infracciones'}
          </button>
        </div>
      </div>

      <Activity recorded={sum.recorded} selected={sum.selected} />

      <div className="mt-4 space-y-3">
        <Meter label="Conducción continua" value={cont.drivingSinceBreakMs} max={CONTINUOUS_DRIVING_LIMIT} hint={cont.currentBreakMs > 0 ? `Pausa en curso: faltan ${formatDuration(breakRemainingMs(cont))}` : cont.splitFirstTaken ? '15 min hechos: falta una pausa de 30 min' : undefined} />
        <Meter label="Jornada" value={c.dailyDrivingMs} max={c.dailyCapMs} hint={`${c.extensionsUsedThisWeek}/2 ampliaciones a 10 h esta semana`} />
        <Meter label="Semana" value={c.weekDrivingMs} max={LIMITS.WEEKLY_DRIVING} />
        <Meter label="Dos semanas" value={c.biweekDrivingMs} max={LIMITS.BIWEEKLY_DRIVING} />
      </div>

      {(c.dailyRestStartBy || c.weeklyRestStartBy) && (
        <div className="mt-4 space-y-1 rounded-xl bg-white/5 p-3 text-xs text-slate-300">
          {c.dailyRestStartBy && (
            <div>🛏 Descanso diario: empieza antes de las <strong className="text-white">{formatTime(c.dailyRestStartBy.normal, tz)}</strong> UTC (11 h)</div>
          )}
          {c.weeklyRestStartBy && (
            <div>📅 Descanso semanal: antes del <strong className="text-white">{formatDateTime(c.weeklyRestStartBy, tz)}</strong> UTC</div>
          )}
        </div>
      )}

      <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details} className="mt-4 w-full rounded-xl py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white">
        {details ? 'Ocultar detalle ▲' : 'Ver detalle ▼'}
      </button>
      {details && (
        <div className="mt-2">
          <StatusPanel bare />
        </div>
      )}
    </section>
  );
}

function Activity({ recorded, selected }: { recorded: ReturnType<typeof deriveSummary>['recorded']; selected: ReturnType<typeof deriveSummary>['selected'] }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-slate-400">Registrando</span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 font-medium text-slate-100" data-testid="recorded-activity">
        {recorded && <span style={{ color: ACTIVITY_COLOR[recorded] }}><ActivityIcon activity={recorded} className="h-4 w-4" /></span>}
        {recorded ? ACTIVITY_LABEL[recorded] : '—'}
      </span>
      {recorded !== selected && (
        <span className="text-slate-500">· seleccionado: {ACTIVITY_LABEL[selected]}</span>
      )}
    </div>
  );
}

function Meter({ label, value, max, hint }: { label: string; value: number; max: number; hint?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const over = value > max;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-300">{label}</span>
        <span className={`font-mono ${over ? 'text-rose-300' : 'text-slate-100'}`}>
          {formatDuration(value)} <span className="text-slate-500">/ {formatDuration(max)}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max / 60000)} aria-valuenow={Math.round(value / 60000)}>
        <div className={`h-full rounded-full ${over ? 'bg-rose-500' : pct > 90 ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-400 to-sky-500'}`} style={{ width: `${pct}%`, transition: 'width 300ms ease' }} />
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-500">{hint}</div>}
    </div>
  );
}
