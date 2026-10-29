import { useMemo } from 'react';
import { CONTINUOUS_DRIVING_LIMIT } from '@/regulations/continuousDriving';
import { LIMITS } from '@/regulations/compliance';
import { complianceFor, deriveSummary } from '@/simulator/derived';
import { useSimStore } from '@/simulator/store';
import { formatDuration } from '@/time-engine/units';
import { formatTime } from '@/time-engine/zoned';

const hm = (ms: number) => formatDuration(Math.max(0, ms)).replace(':', 'h ');

/**
 * Lo que queda de un vistazo: conducción hasta la pausa, conducción del día, amplitud de la jornada
 * (13 h con descanso de 11 h, 15 h con descanso reducido de 9 h; art. 8.2) y conducción de la semana.
 */
export function RemainingStrip() {
  const sim = useSimStore((s) => s.sim);
  const data = useMemo(() => {
    const cur = complianceFor(sim)?.current;
    if (!cur) return null;
    const sum = deriveSummary(sim);
    const now = sim.clock.now;
    const by = cur.dailyRestStartBy;
    return {
      pause: CONTINUOUS_DRIVING_LIMIT - (sum.continuous?.drivingSinceBreakMs ?? 0),
      day: cur.dailyCapMs - cur.dailyDrivingMs,
      dayCap: cur.dailyCapMs,
      j13: by ? by.normal - now : null,
      j13At: by?.normal ?? null,
      j15: by && by.reduced !== null ? by.reduced - now : null,
      j15At: by?.reduced ?? null,
      reducedLeft: LIMITS.MAX_REDUCED_DAILY - cur.reducedDailySinceWeekly,
      week: LIMITS.WEEKLY_DRIVING - cur.weekDrivingMs,
    };
  }, [sim]);

  if (!data) {
    return <p className="mt-4 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-400" data-testid="remaining-strip">Inserta la tarjeta para ver lo que te queda de conducción y de jornada.</p>;
  }
  const tz = sim.scenario.timeZone;
  const tone = (ms: number | null) => (ms === null ? 'text-slate-500' : ms <= 0 ? 'text-rose-300' : ms <= 30 * 60_000 ? 'text-amber-300' : 'text-white');
  const items = [
    { label: 'Hasta la pausa', value: hm(data.pause), ms: data.pause, hint: 'Máx. 4h 30 seguidas' },
    { label: 'Conducción hoy', value: hm(data.day), ms: data.day, hint: `Límite ${formatDuration(data.dayCap).replace(':', 'h ')} hoy` },
    {
      label: 'Jornada 13 h',
      value: data.j13 === null ? '—' : hm(data.j13),
      ms: data.j13,
      hint: data.j13At ? `Desc. 11 h antes de ${formatTime(data.j13At, tz)} UTC` : 'Sin jornada abierta',
    },
    {
      label: 'Jornada 15 h',
      value: data.j15 === null ? (data.j13 === null ? '—' : 'agotada') : hm(data.j15),
      ms: data.j15,
      hint: data.j15At ? `Desc. 9 h antes de ${formatTime(data.j15At, tz)} UTC (quedan ${data.reducedLeft})` : 'Ya usaste los 3 descansos reducidos',
    },
    { label: 'Semana', value: hm(data.week), ms: data.week, hint: 'Máx. 56 h' },
  ];
  return (
    <div className="mt-4" data-testid="remaining-strip">
      <div className="mb-1.5 text-xs text-slate-300">Te queda</div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl bg-white/5 px-3 py-2" title={it.hint}>
            <dt className="text-[11px] text-slate-400">{it.label}</dt>
            <dd className={`font-mono text-base font-semibold ${tone(it.ms)}`}>{it.value}</dd>
            <dd className="text-[10px] leading-tight text-slate-500">{it.hint}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
