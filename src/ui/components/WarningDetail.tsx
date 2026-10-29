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
    <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-4 text-sm" role="alert">
      <div className="font-semibold text-amber-200">⚠ {w.title}</div>
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
