import { t } from '@/i18n';
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
import { useTutorialStore } from '@/tutorial/store';
import { startTutorial } from '../tutorial';

/**
 * Panel del simulador: todo en una pantalla.
 * Tarjetas a la izquierda · tacógrafo y tiempo en el centro · vehículo y estado a la derecha.
 */
export function DeviceScreen() {
  const { warningsEnabled, tutorialDone, update } = useUiStore();
  const tutorialActive = useTutorialStore((s) => s.active);
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
        {!tutorialDone && !tutorialActive && (
          <div className="glass flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-300/20 px-4 py-3" data-testid="tutorial-invite">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-400 text-slate-950" aria-hidden="true">▶</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{t('¿Primera vez? Haz el tutorial de inicio')}</div>
              <div className="text-xs text-slate-400">{t('Un turno completo guiado paso a paso: tarjeta, llave, conducción, pausa y retirada.')}</div>
            </div>
            <button type="button" onClick={startTutorial} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">{t('Empezar')}</button>
            <button type="button" onClick={() => update({ tutorialDone: true })} aria-label={t('No mostrar más')} className="rounded-xl px-2 py-2 text-xs text-slate-400 hover:text-white">{t('Ahora no')}</button>
          </div>
        )}
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
          {help ? t('Ocultar atajos de teclado ▲') : t('Atajos de teclado ▼')}
        </button>
        {help && (
          <ul className="glass grid gap-1 rounded-2xl p-4 text-xs text-slate-400 sm:grid-cols-2">
            <li><kbd>↑ ↓</kbd> {t('navegar / cambiar valor')}</li>
            <li><kbd>{t('Enter')}</kbd> {t('✓ confirmar / abrir menú')}</li>
            <li><kbd>{t('Esc')}</kbd> {t('✕ retroceder')}</li>
            <li><kbd>A</kbd> {t('botón de actividad')}</li>
            <li><kbd>E</kbd> {t('expulsar ·')} <kbd>I</kbd> {t('insertar tarjeta')}</li>
            <li><kbd>K</kbd> {t('girar la llave ·')} <kbd>M</kbd> {t('marcha/parada ·')} <kbd>{t('Espacio')}</kbd> {t('pausa / ×60')}</li>
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
