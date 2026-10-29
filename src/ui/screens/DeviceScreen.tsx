import { useState } from 'react';
import { useUiStore } from '../uiStore';
import { useDeviceKeys } from '../hooks/useDeviceKeys';
import { useGuidance } from '../hooks/useGuidance';
import { ExercisePanel } from '../components/ExercisePanel';
import { Tachograph } from '../components/Tachograph';
import { StatusCard } from '../components/StatusCard';
import { ControlStrip } from '../components/ControlStrip';
import { AssistBanner } from '../components/AssistBanner';
import { WarningDetail } from '../components/WarningDetail';
import { CardTray } from '../components/CardTray';
import { Speedometer } from '../components/Speedometer';
import { IgnitionKey } from '../components/IgnitionKey';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Panel del simulador: todo en una pantalla.
 * Tarjetas a la izquierda · tacógrafo y tiempo en el centro · vehículo y estado a la derecha.
 */
export function DeviceScreen() {
  const { warningsEnabled } = useUiStore();
  const guide = useGuidance();
  const highlight = guide?.target ?? null;
  const [help, setHelp] = useState(false);
  // Cada pieza se monta una sola vez y se coloca según el ancho de la pantalla.
  const large = useMediaQuery('(min-width: 1024px)');
  const wide = useMediaQuery('(min-width: 1280px)');

  useDeviceKeys();

  return (
    <div className="mx-auto grid max-w-[96rem] gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[15rem_minmax(0,1fr)_21rem]">
      {/* Columna izquierda: tarjetas (en pantallas medianas pasa arriba del tacógrafo) */}
      {wide && (
        <div>
          <CardTray highlight={highlight} />
        </div>
      )}

      {/* Centro: guía, tacógrafo y tiempo */}
      <div className="min-w-0 space-y-4">
        <ExercisePanel />
        {guide?.source === 'assist' && <AssistBanner hint={guide} />}
        {/* Llave de contacto a la altura del tacógrafo, como en el salpicadero */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <IgnitionKey highlight={highlight} />
          <div className="min-w-0 flex-1">
            <Tachograph highlight={highlight} />
          </div>
        </div>
        <ControlStrip highlight={highlight} />
        {!large && <Speedometer highlight={highlight} compact />}
        {warningsEnabled && <WarningDetail />}
        {!wide && <CardTray highlight={highlight} horizontal />}
        <button type="button" onClick={() => setHelp((h) => !h)} aria-expanded={help} className="text-xs text-slate-400 hover:text-white">
          {help ? 'Ocultar atajos de teclado ▲' : 'Atajos de teclado ▼'}
        </button>
        {help && (
          <ul className="glass grid gap-1 rounded-2xl p-4 text-xs text-slate-400 sm:grid-cols-2">
            <li><kbd>↑ ↓</kbd> navegar / cambiar valor</li>
            <li><kbd>Enter</kbd> ✓ confirmar / abrir menú</li>
            <li><kbd>Esc</kbd> ✕ retroceder</li>
            <li><kbd>A</kbd> botón de actividad</li>
            <li><kbd>E</kbd> expulsar · <kbd>I</kbd> insertar tarjeta</li>
            <li><kbd>K</kbd> girar la llave · <kbd>M</kbd> marcha/parada · <kbd>Espacio</kbd> pausa / ×60</li>
          </ul>
        )}
      </div>

      {/* Derecha: vehículo y estado */}
      <div className="space-y-4">
        {large && <Speedometer highlight={highlight} />}
        <StatusCard />
      </div>
    </div>
  );
}
