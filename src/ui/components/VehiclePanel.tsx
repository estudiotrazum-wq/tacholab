import { useSimStore } from '@/simulator/store';
import type { AssistTarget } from '@/academy/assist';
import { Panel } from './Panel';

export function VehiclePanel({ highlight }: { highlight: AssistTarget }) {
  const moving = useSimStore((s) => s.sim.vehicle.moving);
  const after = useSimStore((s) => s.sim.config.afterStopActivity);
  const dispatch = useSimStore((s) => s.dispatch);
  return (
    <Panel title="Vehículo">
      <div className="flex items-center gap-4">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 border-ink-600 bg-ink-950" aria-hidden="true">
          <span className="font-mono text-lg text-cyan-200">{moving ? '80' : '0'}</span>
          <span className="absolute bottom-2 text-[9px] text-slate-500">km/h</span>
        </div>
        <button
          type="button"
          data-testid="vehicle-toggle"
          aria-pressed={moving}
          onClick={() => dispatch({ type: 'SET_MOVING', moving: !moving })}
          className={`flex-1 rounded-lg border px-3 py-3 text-sm font-semibold transition ${highlight === 'VEHICLE' ? 'assist-target' : ''} ${
            moving ? 'border-rose-500/60 bg-rose-500/15 text-rose-200' : 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'
          }`}
        >
          {moving ? '■ Detener vehículo (M)' : '▶ Iniciar marcha (M)'}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        En marcha se registra conducción automáticamente. Al detenerse se selecciona{' '}
        {after === 'KEEP' ? 'la actividad previa' : after === 'WORK' ? '«otros trabajos»' : after === 'REST' ? '«descanso»' : '«disponibilidad»'}{' '}
        (aproximación pedagógica, configurable en Ajustes).
      </p>
    </Panel>
  );
}
