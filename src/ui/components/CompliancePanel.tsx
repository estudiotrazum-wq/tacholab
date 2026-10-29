import { complianceFor } from '@/simulator/derived';
import { useSimStore } from '@/simulator/store';
import { formatDuration } from '@/time-engine/units';
import { formatDateTime } from '@/time-engine/zoned';
import { LIMITS } from '@/regulations/compliance';
import { Panel } from './Panel';

/** Límites normativos de la Fase 2 calculados sobre la línea temporal. */
export function CompliancePanel() {
  const sim = useSimStore((s) => s.sim);
  const report = complianceFor(sim);
  if (!report) return null;
  const c = report.current;
  const tz = sim.scenario.timeZone;
  const fmt = (t: number) => `${formatDateTime(t, tz).slice(0, 16)} UTC`;
  const infringements = report.findings.filter((f) => f.severity === 'infringement').length;

  return (
    <Panel
      title="Límites normativos"
      aside={
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${infringements ? 'bg-rose-500/20 text-rose-200' : 'bg-emerald-500/15 text-emerald-300'}`} data-testid="infringement-count">
          {infringements ? `${infringements} infracción(es)` : 'Sin infracciones'}
        </span>
      }
    >
      <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/30 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-cyan-300/80">Puedes conducir todavía</div>
        <div className="font-mono text-2xl text-cyan-100" data-testid="available-driving">{formatDuration(c.availableDrivingMs)}</div>
        <div className="text-xs text-slate-400">Limitado por: {c.limitingFactor}</div>
      </div>

      <div className="mt-3 space-y-2">
        <Bar label={c.period ? 'Conducción de la jornada' : 'Conducción de la jornada (descansando)'} value={c.dailyDrivingMs} max={c.dailyCapMs} />
        <Bar label="Conducción de la semana" value={c.weekDrivingMs} max={LIMITS.WEEKLY_DRIVING} />
        <Bar label="Semana anterior + actual" value={c.biweekDrivingMs} max={LIMITS.BIWEEKLY_DRIVING} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label="Ampliaciones a 10 h" value={`${c.extensionsUsedThisWeek} / 2`} warn={c.extensionsUsedThisWeek >= 2} />
        <Stat label="Descansos diarios reducidos" value={`${c.reducedDailySinceWeekly} / 3`} warn={c.reducedDailySinceWeekly >= 3} />
      </dl>

      <ul className="mt-3 space-y-1 text-xs text-slate-300">
        {c.dailyRestStartBy && (
          <li>
            <span className="text-slate-500">Descanso diario:</span> empezar antes de <strong>{fmt(c.dailyRestStartBy.normal)}</strong> (11 h)
            {c.dailyRestStartBy.reduced ? <> o como muy tarde <strong>{fmt(c.dailyRestStartBy.reduced)}</strong> (reducido, 9 h)</> : ' — ya no quedan descansos reducidos'}
          </li>
        )}
        {c.weeklyRestStartBy && (
          <li>
            <span className="text-slate-500">Descanso semanal:</span> empezar antes de <strong>{fmt(c.weeklyRestStartBy)}</strong>
          </li>
        )}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        La jornada se cuenta entre descansos diarios, no por medianoche. Supuesto: el escenario empieza tras un descanso semanal normal y sin conducción la semana anterior.
      </p>
    </Panel>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const over = value > max;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={`font-mono ${over ? 'text-rose-300' : 'text-slate-200'}`}>{formatDuration(value)} / {formatDuration(max)}</span>
      </div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-ink-700" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max / 60000)} aria-valuenow={Math.round(value / 60000)}>
        <div className={`h-full ${over ? 'bg-rose-500' : pct > 90 ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn: boolean }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-950/60 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className={`font-mono ${warn ? 'text-amber-300' : 'text-slate-100'}`}>{value}</dd>
    </div>
  );
}
