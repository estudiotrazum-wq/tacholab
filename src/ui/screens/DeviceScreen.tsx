import { useUiStore } from '../uiStore';
import { useDeviceKeys } from '../hooks/useDeviceKeys';
import { useGuidance } from '../hooks/useGuidance';
import { ExercisePanel } from '../components/ExercisePanel';
import { Tachograph } from '../components/Tachograph';
import { StatusCard } from '../components/StatusCard';
import { ControlDock } from '../components/ControlDock';
import { AssistBanner } from '../components/AssistBanner';
import { WarningDetail } from '../components/WarningDetail';

/** Vista del tacógrafo: el dispositivo en el centro, el estado a un lado y los controles abajo. */
export function DeviceScreen() {
  const { warningsEnabled } = useUiStore();
  const guide = useGuidance();
  const highlight = guide?.target ?? null;

  useDeviceKeys();

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <ExercisePanel />
        {guide?.source === 'assist' && <AssistBanner hint={guide} />}
        <Tachograph highlight={highlight} />
        {warningsEnabled && <WarningDetail />}
        <details className="glass rounded-2xl p-4 text-xs text-slate-400">
          <summary className="cursor-pointer text-slate-300">Atajos de teclado</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            <li><kbd>↑ ↓</kbd> navegar / cambiar valor</li>
            <li><kbd>Enter</kbd> ✓ confirmar / abrir menú</li>
            <li><kbd>Esc</kbd> ✕ retroceder</li>
            <li><kbd>A</kbd> botón de actividad</li>
            <li><kbd>E</kbd> expulsar · <kbd>I</kbd> insertar tarjeta</li>
            <li><kbd>M</kbd> arrancar/detener · <kbd>Espacio</kbd> pausa / ×60</li>
          </ul>
          <p className="mt-2">El icono iluminado en la pantalla es la actividad <em>registrada</em>; la marca inferior, la <em>seleccionada</em> cuando difieren.</p>
        </details>
      </div>
      <StatusCard />
      <ControlDock highlight={highlight} />
    </div>
  );
}
