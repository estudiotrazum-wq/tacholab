import { ACTIVITY_LABEL, ACTIVITIES } from '@/shared/types';
import { deriveSummary } from '@/simulator/derived';
import { useSimStore } from '@/simulator/store';
import { formatDuration } from '@/time-engine/units';
import { CONTINUOUS_DRIVING_LIMIT, breakRemainingMs } from '@/regulations/continuousDriving';
import { ActivityIcon, ACTIVITY_COLOR } from './icons';
import { Panel } from './Panel';

export function StatusPanel() {
  const sim = useSimStore((s) => s.sim);
  const sum = deriveSummary(sim);
  const cont = sum.continuous;
  const pct = cont ? Math.min(100, (cont.drivingSinceBreakMs / CONTINUOUS_DRIVING_LIMIT) * 100) : 0;
  const over = cont ? cont.overrunMs > 0 : false;

  return (
    <Panel title="Estado y acumulados">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Field label="Seleccionado">{ACTIVITY_LABEL[sum.selected]}</Field>
        <Field label="Registrado" testId="recorded-activity">{sum.recorded ? ACTIVITY_LABEL[sum.recorded] : '—'}</Field>
      </div>

      {cont ? (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Conducción continua</span>
            <span className={over ? 'text-rose-300' : 'text-slate-200'}>{formatDuration(cont.drivingSinceBreakMs)} / 4:30</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded bg-ink-700" role="progressbar" aria-valuemin={0} aria-valuemax={270} aria-valuenow={Math.round(cont.drivingSinceBreakMs / 60000)} aria-label="Conducción desde la última pausa válida">
            <div className={`h-full ${over ? 'bg-rose-500' : pct > 94 ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {cont.currentBreakMs > 0
              ? `Pausa en curso ${formatDuration(cont.currentBreakMs)} · faltan ${formatDuration(breakRemainingMs(cont))} para una pausa válida`
              : cont.splitFirstTaken
                ? 'Primera fracción de 15 min realizada: la siguiente pausa debe ser de al menos 30 min.'
                : 'Pausa válida: 45 min seguidos, o 15 min + 30 min (en ese orden).'}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-400">Sin tarjeta: los tiempos no se asignan a ningún conductor.</p>
      )}

      <table className="mt-3 w-full text-xs">
        <caption className="sr-only">Acumulados por actividad</caption>
        <thead className="text-slate-500">
          <tr>
            <th className="text-left font-normal">Actividad</th>
            <th className="text-right font-normal">Hoy</th>
            <th className="text-right font-normal">Semana {sum.weekIndex}</th>
            <th className="text-right font-normal">14 días</th>
          </tr>
        </thead>
        <tbody className="font-mono text-slate-200">
          {ACTIVITIES.map((a) => (
            <tr key={a} className="border-t border-ink-700/60">
              <td className="flex items-center gap-1.5 py-1 font-sans" style={{ color: ACTIVITY_COLOR[a] }}>
                <ActivityIcon activity={a} className="h-4 w-4" />
                <span className="text-slate-300">{ACTIVITY_LABEL[a]}</span>
              </td>
              <td className="text-right">{formatDuration(sum.today[a])}</td>
              <td className="text-right">{formatDuration(sum.week[a])}</td>
              <td className="text-right">{formatDuration(sum.twoWeeks[a])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] leading-snug text-slate-500">
        «Hoy» y «Semana» son acumulados de calendario en UTC (semana: lunes 00:00 – domingo 24:00 UTC). El tiempo de conducción diario normativo, que depende de los descansos, se calculará en la Fase 2.
      </p>
    </Panel>
  );
}

function Field({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="rounded-md border border-ink-700 bg-ink-950/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-slate-100" data-testid={testId}>{children}</div>
    </div>
  );
}
