import { useUiStore } from '../uiStore';
import { useDeviceKeys } from '../hooks/useDeviceKeys';
import { MobileControlBar } from '../components/MobileControlBar';
import { ExercisePanel } from '../components/ExercisePanel';
import { useGuidance } from '../hooks/useGuidance';
import { Tachograph } from '../components/Tachograph';
import { TimeLab } from '../components/TimeLab';
import { VehiclePanel } from '../components/VehiclePanel';
import { StatusPanel } from '../components/StatusPanel';
import { CompliancePanel } from '../components/CompliancePanel';
import { AssistBanner } from '../components/AssistBanner';
import { WarningDetail } from '../components/WarningDetail';


/** Vista principal del simulador: tacógrafo ampliado + reloj + vehículo + estado. */
export function DeviceScreen() {
  const { learningMode, warningsEnabled, go } = useUiStore();
  const guide = useGuidance();
  const highlight = guide?.target ?? null;

  useDeviceKeys();

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 pb-24 sm:pb-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <MobileControlBar />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => go('cabin')} className="text-sm text-slate-400 hover:text-cyan-300">
            ← Volver a la cabina
          </button>
          <span className="text-xs text-slate-500">Modo {learningMode === 'assisted' ? 'asistido' : 'libre'}</span>
        </div>
        <ExercisePanel />
        {guide?.source === 'assist' && <AssistBanner hint={guide} />}
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
