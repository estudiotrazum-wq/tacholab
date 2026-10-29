import { useEffect } from 'react';
import { assistHint } from '@/academy/assist';
import { useSimStore } from '@/simulator/store';
import type { Button } from '@/tachograph/types';
import { useUiStore } from '../uiStore';
import { Tachograph } from '../components/Tachograph';
import { TimeLab } from '../components/TimeLab';
import { VehiclePanel } from '../components/VehiclePanel';
import { StatusPanel } from '../components/StatusPanel';
import { CompliancePanel } from '../components/CompliancePanel';
import { AssistBanner } from '../components/AssistBanner';
import { WarningDetail } from '../components/WarningDetail';

const KEYMAP: Record<string, Button> = {
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  Enter: 'OK',
  Escape: 'BACK',
  a: 'ACTIVITY',
  e: 'EJECT',
};

/** Vista principal del simulador: tacógrafo ampliado + reloj + vehículo + estado. */
export function DeviceScreen() {
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const { learningMode, warningsEnabled, go } = useUiStore();
  const hint = assistHint(sim);
  const highlight = learningMode === 'assisted' ? hint.target : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      // Enter y Escape sobre un botón enfocado conservan su comportamiento nativo.
      if ((e.key === 'Enter' || e.key === ' ') && el.tagName === 'BUTTON') return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const button = KEYMAP[key];
      const state = useSimStore.getState().sim;
      if (button) {
        e.preventDefault();
        dispatch({ type: 'PRESS', button });
      } else if (key === 'm') {
        dispatch({ type: 'SET_MOVING', moving: !state.vehicle.moving });
      } else if (key === 'i') {
        dispatch({ type: 'INSERT_CARD', cardId: 'card-a' });
      } else if (key === ' ') {
        e.preventDefault();
        dispatch({ type: 'SET_SPEED', speed: state.clock.speed === 0 ? 60 : 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch]);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => go('cabin')} className="text-sm text-slate-400 hover:text-cyan-300">
            ← Volver a la cabina
          </button>
          <span className="text-xs text-slate-500">Modo {learningMode === 'assisted' ? 'asistido' : 'libre'}</span>
        </div>
        {learningMode === 'assisted' && <AssistBanner hint={hint} />}
        <Tachograph highlight={highlight} />
        {warningsEnabled && <WarningDetail />}
        <details className="rounded-xl border border-ink-700 bg-ink-900/60 p-3 text-xs text-slate-400">
          <summary className="cursor-pointer text-slate-300">Atajos de teclado y botones</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            <li><kbd>↑ ↓</kbd> navegar / cambiar valor</li>
            <li><kbd>Enter</kbd> ✓ confirmar / abrir menú</li>
            <li><kbd>Esc</kbd> ✕ retroceder</li>
            <li><kbd>A</kbd> botón de actividad (trabajo → disponibilidad → descanso)</li>
            <li><kbd>E</kbd> expulsar tarjeta · <kbd>I</kbd> insertar tarjeta</li>
            <li><kbd>M</kbd> iniciar/detener vehículo · <kbd>Espacio</kbd> pausa / ×60</li>
          </ul>
          <p className="mt-2">
            El icono iluminado en la pantalla es la actividad <em>registrada</em>; la marca inferior indica la actividad <em>seleccionada</em> cuando difieren (por ejemplo, en marcha).
          </p>
        </details>
      </div>
      <div className="space-y-4">
        <TimeLab highlight={highlight} />
        <VehiclePanel highlight={highlight} />
        <CompliancePanel />
        <StatusPanel />
      </div>
    </div>
  );
}
