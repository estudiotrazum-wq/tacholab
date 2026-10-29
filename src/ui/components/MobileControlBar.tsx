import { useSimStore } from '@/simulator/store';

/** Controles esenciales fijos en la parte inferior en móviles (modo dispositivo). */
export function MobileControlBar() {
  const moving = useSimStore((s) => s.sim.vehicle.moving);
  const speed = useSimStore((s) => s.sim.clock.speed);
  const dispatch = useSimStore((s) => s.dispatch);
  const btn = 'flex-1 rounded-lg border px-2 py-2.5 text-sm font-semibold';
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-ink-700 bg-ink-950/95 p-2 backdrop-blur sm:hidden print:hidden" data-testid="mobile-bar">
      <button type="button" onClick={() => dispatch({ type: 'SET_SPEED', speed: speed === 0 ? 60 : 0 })} className={`${btn} border-ink-600 text-slate-200`}>
        {speed === 0 ? '▶ ×60' : '❚❚ Pausa'}
      </button>
      <button type="button" onClick={() => dispatch({ type: 'SET_MOVING', moving: !moving })} className={`${btn} ${moving ? 'border-rose-500/60 bg-rose-500/15 text-rose-200' : 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'}`}>
        {moving ? '■ Detener' : '▶ Marcha'}
      </button>
      <button type="button" onClick={() => dispatch({ type: 'JUMP_NEXT_EVENT' })} className={`${btn} border-ink-600 text-slate-200`}>
        Siguiente ⏭
      </button>
    </div>
  );
}
