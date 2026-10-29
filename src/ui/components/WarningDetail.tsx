import { RULES } from '@/regulations/rules';
import { useSimStore } from '@/simulator/store';
import { formatDateTime } from '@/time-engine/zoned';

/** Explicación ampliada del aviso activo, con la norma aplicable. */
export function WarningDetail() {
  const w = useSimStore((s) => s.sim.device.warning);
  const tz = useSimStore((s) => s.sim.scenario.timeZone);
  if (!w) return null;
  const rule = w.ruleId ? RULES.find((r) => r.id === w.ruleId) : undefined;
  return (
    <div className={`rounded-xl border p-4 text-sm ${w.severity === 'info' ? 'border-sky-500/50 bg-sky-950/30' : 'border-amber-500/50 bg-amber-950/30'}`} role="alert">
      <div className="font-semibold text-amber-200">{w.severity === 'info' ? 'ℹ' : '⚠'} {w.title}{w.severity === 'infringement' && <span className="ml-2 rounded bg-rose-500/20 px-1.5 text-[10px] uppercase tracking-wider text-rose-200">infracción simulada</span>}</div>
      <p className="mt-1 text-amber-100/90">{w.text}</p>
      <p className="mt-1 text-xs text-amber-200/70">Instante: {formatDateTime(w.at, tz)}</p>
      {rule && (
        <p className="mt-2 text-xs text-slate-300">
          <span className="text-slate-400">Norma:</span> {rule.reference}. {rule.pedagogy}{' '}
          <span className="text-amber-300/80">(Texto contrastado con la versión consolidada oficial de 31.12.2024; interpretación pendiente de revisión profesional.)</span>
        </p>
      )}
      <p className="mt-2 text-xs text-slate-400">Pulsa ✓ en el tacógrafo para confirmar el aviso. En modo libre puedes seguir conduciendo para ver las consecuencias.</p>
    </div>
  );
}
