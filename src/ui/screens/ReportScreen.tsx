import { useMemo, useState } from 'react';
import { RULES } from '@/regulations/rules';
import type { Finding, Obligation } from '@/regulations/compliance';
import { complianceFor } from '@/simulator/derived';
import { scenarioDef } from '@/scenarios/library';
import { driverEvents } from '@/time-engine/timeline';
import { useSimStore } from '@/simulator/store';
import { formatDuration } from '@/time-engine/units';
import { formatDateTime, formatWeekday } from '@/time-engine/zoned';
import { Panel } from '../components/Panel';

const SEVERITY: Record<Finding['severity'], { label: string; cls: string }> = {
  infringement: { label: 'Infracción simulada', cls: 'border-rose-500/50 bg-rose-950/30 text-rose-200' },
  warning: { label: 'Advertencia', cls: 'border-amber-500/50 bg-amber-950/30 text-amber-200' },
  'needs-context': { label: 'Requiere contexto', cls: 'border-violet-500/50 bg-violet-950/30 text-violet-200' },
  info: { label: 'Información', cls: 'border-sky-500/40 bg-sky-950/30 text-sky-200' },
};

const OBLIGATION: Record<Obligation['status'], { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-500/15 text-amber-200' },
  fulfilled: { label: 'Cumplida', cls: 'bg-emerald-500/15 text-emerald-300' },
  overdue: { label: 'Vencida', cls: 'bg-rose-500/20 text-rose-200' },
};

const REST_KIND = { NORMAL: 'Diario normal', SPLIT: 'Diario fraccionado 3 + 9', REDUCED: 'Diario reducido', INSUFFICIENT: 'Insuficiente' } as const;

/** Informe de resultados: infracciones simuladas, obligaciones y jornadas. */
export function ReportScreen() {
  const sim = useSimStore((s) => s.sim);
  const tz = sim.scenario.timeZone;
  const fmt = (t: number) => `${formatWeekday(t, tz)} ${formatDateTime(t, tz)}`;
  const [driverId, setDriverId] = useState(sim.device.insertedCardId ?? 'card-a');
  const report = useMemo(() => complianceFor(sim, driverId), [sim, driverId]);
  if (!report) return null;
  const finished = sim.clock.now >= sim.clock.endsAt;
  const def = scenarioDef(sim.scenario.libraryId);
  const objectives = def?.evaluate?.(report, sim) ?? [];

  const downloadJson = () => {
    const data = {
      generadoPor: 'TachoLab EU (simulador educativo, no oficial)',
      escenario: sim.scenario,
      evaluadoHasta: new Date(sim.clock.now).toISOString(),
      normativa: 'Reglamento (CE) 561/2006, texto consolidado 02006R0561-20241231',
      conductor: sim.cards[driverId]?.displayId,
      semanas: report.weeks,
      infracciones: report.findings,
      obligaciones: report.obligations,
      jornadas: report.periods,
      actividades: driverEvents(sim.timeline, driverId),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tacholab-informe-${sim.scenario.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="rep-driver" className="text-sm text-slate-400">Conductor ficticio</label>
        <select id="rep-driver" value={driverId} onChange={(e) => setDriverId(e.target.value)} className="rounded-md border border-ink-600 bg-ink-900 px-2 py-1 text-sm">
          {Object.values(sim.cards).map((c) => <option key={c.id} value={c.id}>{c.holderName}</option>)}
        </select>
        <span className="text-xs text-slate-500">
          {sim.scenario.title} · evaluado hasta {fmt(sim.clock.now)} UTC{finished ? ' · escenario terminado' : ' · escenario en curso'}
        </span>
        <span className="ml-auto flex gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="rounded-md border border-ink-600 px-3 py-1.5 text-xs hover:border-cyan-700">Imprimir / PDF</button>
          <button type="button" onClick={downloadJson} data-testid="export-json" className="rounded-md border border-ink-600 px-3 py-1.5 text-xs hover:border-cyan-700">Descargar JSON</button>
        </span>
      </div>

      {objectives.length > 0 && (
        <Panel title="Objetivos del escenario (comprobación automática)">
          <ul className="grid gap-2 sm:grid-cols-3" data-testid="objectives">
            {objectives.map((o) => (
              <li key={o.text} className={`rounded-lg border px-3 py-2 text-sm ${o.status === 'done' ? 'border-emerald-600/50 text-emerald-200' : o.status === 'failed' ? 'border-rose-600/50 text-rose-200' : 'border-ink-600 text-slate-300'}`}>
                {o.status === 'done' ? '✓' : o.status === 'failed' ? '✗' : '…'} {o.text}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        {report.weeks.map((w, i) => (
          <Kpi key={w.start} label={`Conducción semana ${i + 1}`} value={formatDuration(w.drivingMs)} max="56:00" over={w.drivingMs > 56 * 3600e3} />
        ))}
        <Kpi label="Total dos semanas" value={formatDuration(report.weeks[0]!.drivingMs + report.weeks[1]!.drivingMs)} max="90:00" over={report.weeks[0]!.drivingMs + report.weeks[1]!.drivingMs > 90 * 3600e3} />
        <Kpi label="Infracciones simuladas" value={String(report.findings.filter((f) => f.severity === 'infringement').length)} max="" over={report.findings.some((f) => f.severity === 'infringement')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Infracciones y avisos (${report.findings.length})`}>
          <ul className="space-y-2" data-testid="findings">
            {report.findings.map((f) => {
              const rule = RULES.find((r) => r.id === f.ruleId);
              return (
                <li key={f.id} className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY[f.severity].cls}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <strong>{f.title}</strong>
                    <span className="text-[10px] uppercase tracking-wider opacity-80">{SEVERITY[f.severity].label}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{f.detail}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{fmt(f.at)} UTC · {rule ? rule.reference : f.ruleId}</p>
                </li>
              );
            })}
            {report.findings.length === 0 && <li className="py-4 text-center text-sm text-emerald-300">Sin infracciones hasta el momento.</li>}
          </ul>
        </Panel>

        <Panel title="Obligaciones">
          <ul className="space-y-2">
            {report.obligations.map((o) => (
              <li key={o.id} className="rounded-lg border border-ink-700 bg-ink-950/50 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong className="text-slate-100">{o.title}</strong>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${OBLIGATION[o.status].cls}`}>{OBLIGATION[o.status].label}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{o.detail}</p>
                {o.dueAt > sim.scenario.endsAt && o.status === 'pending' && (
                  <p className="mt-1 text-[11px] text-amber-300">Vence después del final del escenario: no se da por cumplida al terminar la simulación.</p>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title={`Jornadas y descansos (${report.periods.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="text-slate-500">
              <tr>
                <th className="text-left font-normal">#</th>
                <th className="text-left font-normal">Inicio jornada</th>
                <th className="text-left font-normal">Inicio descanso</th>
                <th className="text-right font-normal">Conducción</th>
                <th className="text-left font-normal pl-4">Descanso que la cierra</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {report.periods.map((p) => {
                const cl = p.closing;
                const len = cl ? cl.block.end - cl.block.start : 0;
                return (
                  <tr key={p.start} className="border-t border-ink-700/60">
                    <td className="py-1 text-slate-500">{p.index + 1}</td>
                    <td className="font-mono">{fmt(p.start)}</td>
                    <td className="font-mono">{p.end ? fmt(p.end) : 'en curso'}</td>
                    <td className={`text-right font-mono ${p.drivingMs > 10 * 3600e3 ? 'text-rose-300' : p.extended ? 'text-amber-300' : ''}`}>
                      {formatDuration(p.drivingMs)}{p.extended ? ' (10 h)' : ''}
                    </td>
                    <td className="pl-4">
                      {cl ? (
                        <>
                          {cl.weekly ? (len >= 45 * 3600e3 ? 'Semanal normal' : 'Semanal reducido') : REST_KIND[cl.kind]} · {formatDuration(len)}
                          {cl.provisional && <span className="text-slate-500"> (en curso)</span>}
                          {cl.kind === 'INSUFFICIENT' && !cl.provisional && <span className="text-rose-300"> · solo {formatDuration(cl.insideWindowMs)} en 24 h</span>}
                        </>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Cálculo según el Reglamento (CE) 561/2006 (texto consolidado 31.12.2024), en UTC. Herramienta educativa: no es un análisis oficial ni asesoramiento jurídico.
        </p>
      </Panel>
    </div>
  );
}

function Kpi({ label, value, max, over }: { label: string; value: string; max: string; over: boolean }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-900/80 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-mono text-xl ${over ? 'text-rose-300' : 'text-slate-100'}`}>
        {value}{max && <span className="text-sm text-slate-500"> / {max}</span>}
      </div>
    </div>
  );
}
