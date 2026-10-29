import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { formatTime, zonedParts } from '@/time-engine/zoned';
import { lcdPlain, renderDisplay } from '@/tachograph/display';
import { openEvent } from '@/time-engine/timeline';
import { useSimStore } from '@/simulator/store';
import { useGuidance } from '../hooks/useGuidance';
import { ExercisePanel } from '../components/ExercisePanel';
import { useUiStore, LED_COLORS, type LedColor } from '../uiStore';
import { CabinScene } from '../cabin/CabinScene';
import { CabinInterior } from '../cabin/CabinInterior';
import { lightingAt } from '../cabin/lighting';
import { CAMERAS, cameraTransform, type CameraId } from '../cabin/camera';
import { useCabinStore } from '../cabin/cabinStore';
import { playHorn } from '../cabin/horn';
import { Tachograph } from '../components/Tachograph';
import { ControlDock } from '../components/ControlDock';
import { useDeviceKeys } from '../hooks/useDeviceKeys';
import { useMediaQuery } from '../hooks/useMediaQuery';

/**
 * Cabina de camión genérica (cabina adelantada) en 2D por capas con cámara:
 * paisaje en perspectiva CSS detrás e interior SVG delante. Sin marcas ni
 * diseños identificables. El tacógrafo se puede manejar dentro de la cabina.
 */
export function CabinScreen() {
  const { go, ledColor, update, learningMode } = useUiStore();
  const cab = useCabinStore();
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const [honk, setHonk] = useState(0);
  const [settled, setSettled] = useState(true);
  const [look, setLook] = useState<[number, number]>([0, 0]);
  const small = useMediaQuery('(max-width: 639px)');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const finePointer = useMediaQuery('(pointer: fine)');
  const display = useMemo(() => renderDisplay(sim), [sim]);
  const lookFrame = useRef(0);

  const local = sim.scenario.localTimeZone;
  const p = zonedParts(sim.clock.now, local);
  const light = lightingAt(p.hour + p.minute / 60);
  const moving = sim.vehicle.moving;
  const speed = sim.clock.speed;
  const running = speed > 0;
  const recorded = openEvent(sim.timeline)?.activity ?? null;
  const alert = sim.device.warning !== null;
  const roadSpeed = speed >= 30 ? '0.22s' : speed >= 5 ? '0.4s' : '0.75s';
  const camera = cab.camera;
  const parallax = camera === 'driver' && cab.quality === 'high' && !reduceMotion && finePointer;
  const cam = cameraTransform(camera, parallax ? look : [0, 0]);
  const showDevice = camera === 'tacho' && settled;
  const guide = useGuidance();
  const assisted = learningMode === 'assisted' || guide?.source === 'exercise';

  // El teclado maneja el tacógrafo cuando la cámara está sobre él.
  useDeviceKeys(showDevice);

  // La cámara vuelve a la vista de conducción al salir de la pantalla.
  useEffect(() => () => useCabinStore.getState().setCamera('driver'), []);

  const moveCamera = (id: CameraId) => {
    if (id === 'tacho' && small) {
      go('device');
      return;
    }
    setSettled(reduceMotion || cab.quality === 'low');
    setLook([0, 0]);
    cab.setCamera(id);
    if (!reduceMotion && cab.quality === 'high') window.setTimeout(() => setSettled(true), 760);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
      const ids: CameraId[] = ['driver', 'tacho', 'mirror', 'roof'];
      const n = Number(e.key);
      if (n >= 1 && n <= 4) moveCamera(ids[n - 1]!);
      else if (e.key === 'Escape' && camera !== 'driver' && camera !== 'tacho') moveCamera('driver');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!parallax) return;
    const r = e.currentTarget.getBoundingClientRect();
    const next: [number, number] = [((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1];
    cancelAnimationFrame(lookFrame.current);
    lookFrame.current = requestAnimationFrame(() => setLook(next));
  };

  const stageClasses = [
    'cab-stage relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_40px_100px_-30px_rgba(0,0,0,0.95),0_0_0_1px_rgba(34,211,238,0.05)]',
    moving && running ? 'is-moving' : '',
    alert ? 'is-alert' : '',
    cab.ledOn ? '' : 'led-off',
    cab.quality === 'low' ? 'q-low' : '',
  ].join(' ');

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="mb-3">
        <ExercisePanel compact />
      </div>
      {small && (
        <div className="mb-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-50">
          En pantallas pequeñas te recomendamos el modo dispositivo: el tacógrafo a tamaño completo.
          <button type="button" onClick={() => go('device')} className="mt-2 block w-full rounded-xl bg-cyan-400 py-2 font-semibold text-slate-950">Abrir el modo dispositivo</button>
        </div>
      )}
      {/* La cabina se ajusta a la altura de la ventana para que quepa sobre la barra de control. */}
      <div className="mx-auto" style={{ maxWidth: 'min(100%, calc((100vh - 17.5rem) * 16 / 9))' }}>
      <div
        className={stageClasses}
        style={{ ['--led' as string]: LED_COLORS[ledColor].hex, ['--road-speed' as string]: roadSpeed, ['--led-intensity' as string]: String(cab.ledBrightness) }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setLook([0, 0])}
        data-testid="cab-stage"
        data-camera={camera}
      >
        <div className={`cab-camera absolute inset-0 ${parallax && camera === 'driver' ? 'is-looking' : ''}`} style={{ transform: cam.transform, transformOrigin: cam.origin }}>
          {/* El paisaje está más lejos: se desplaza menos que el interior (profundidad). */}
          <div className="absolute inset-0" style={{ transform: parallax ? `translate(${look[0] * 1.6}%, ${look[1] * 0.9}%) scale(1.04)` : 'scale(1.04)' }}>
            <CabinScene light={light} headlights={cab.headlights} />
          </div>
          <CabinInterior
            ledColor={ledColor}
            moving={moving}
            timeRunning={running}
            cardIn={sim.device.insertedCardId !== null}
            resting={recorded === 'REST'}
            night={light.night}
            displayTitle={lcdPlain(display.lines[0])}
            displayLine={lcdPlain(display.lines[1])}
            localTime={formatTime(sim.clock.now, local)}
            pulseTacho={assisted && camera === 'driver'}
            hazards={cab.hazards}
            headlights={cab.headlights}
            interiorLight={cab.interiorLight}
            visorDown={cab.visorDown}
            ledOn={cab.ledOn}
            onTacho={() => moveCamera('tacho')}
            onMirror={() => moveCamera('mirror')}
            onRoof={() => moveCamera('roof')}
            onVisor={() => cab.toggle('visorDown')}
            onSwitch={(id) => cab.toggle(id)}
            onGear={() => dispatch({ type: 'SET_MOVING', moving: !moving })}
            onHorn={() => {
              playHorn();
              setHonk((n) => n + 1);
            }}
            onLed={(c) => update({ ledColor: c })}
          />
        </div>

        {honk > 0 && camera === 'driver' && (
          <span key={honk} className="pointer-events-none absolute left-[30%] top-[62%] animate-[honk_0.9s_ease-out_forwards] text-xl font-black text-white drop-shadow-[0_0_8px_var(--led)] sm:text-3xl">
            ¡MOOOC!
          </span>
        )}
        {alert && !showDevice && (
          <div className="pointer-events-none absolute inset-x-0 top-[24%] mx-auto w-fit rounded-full border border-orange-400/60 bg-black/70 px-4 py-1.5 text-xs text-orange-200 sm:text-sm" role="alert">
            ⚠ {sim.device.warning?.title} — revisa el tacógrafo
          </div>
        )}

        {/* Cámara sobre el tacógrafo: el dispositivo real, a tamaño nítido */}
        {showDevice && (
          <div className="absolute inset-x-0 bottom-0 flex max-h-full flex-col items-center gap-2 overflow-auto bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-10" data-testid="cab-device">
            <Tachograph highlight={guide?.target ?? null} compact />
            <CameraBack onBack={() => moveCamera('driver')} extra={<button type="button" onClick={() => go('device')} className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs text-slate-200 hover:border-cyan-600">Laboratorio completo →</button>} />
          </div>
        )}
        {camera === 'mirror' && settled && (
          <Overlay title="Retrovisor izquierdo" onBack={() => moveCamera('driver')}>
            Antes de incorporarte o cambiar de carril, comprueba el espejo principal y el gran angular: un camión tiene ángulos muertos amplios.
            {cab.hazards && <strong className="mt-1 block text-amber-300">Luces de emergencia activadas: el repetidor del espejo parpadea.</strong>}
          </Overlay>
        )}
        {camera === 'roof' && settled && (
          <Overlay title="Iluminación ambiental" onBack={() => moveCamera('driver')} testId="roof-panel">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(LED_COLORS) as LedColor[]).map((c) => (
                <button key={c} type="button" aria-pressed={ledColor === c} aria-label={`Color ${LED_COLORS[c].label}`} onClick={() => update({ ledColor: c })} className={`h-7 w-7 rounded-full border-2 ${ledColor === c ? 'border-white' : 'border-transparent'}`} style={{ background: LED_COLORS[c].hex }} />
              ))}
              <label className="ml-2 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={cab.ledOn} onChange={() => cab.toggle('ledOn')} className="accent-cyan-400" /> Encendidas
              </label>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs">
              Intensidad
              <input type="range" min={0.2} max={1} step={0.05} value={cab.ledBrightness} onChange={(e) => cab.set({ ledBrightness: Number(e.target.value) })} className="flex-1 accent-cyan-400" aria-label="Intensidad de los LED" data-testid="led-brightness" />
            </label>
          </Overlay>
        )}
      </div>

      </div>

      {/* Cámaras */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <div className="glass inline-flex rounded-full p-1" role="group" aria-label="Cámara">
          {(Object.keys(CAMERAS) as CameraId[]).map((id, i) => (
            <button
              key={id}
              type="button"
              aria-pressed={camera === id}
              title={`${CAMERAS[id].label} (tecla ${i + 1}). En la cabina, todo lo que brilla al pasar el ratón se puede pulsar.`}
              aria-label={`Cámara: ${CAMERAS[id].label}`}
              data-testid={`camera-${id}`}
              onClick={() => moveCamera(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${camera === id ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'}`}
            >
              {CAMERAS[id].label}
            </button>
          ))}
        </div>
      </div>
      <ControlDock highlight={guide?.target ?? null} />
    </div>
  );
}

function CameraBack({ onBack, extra }: { onBack: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <button type="button" onClick={onBack} data-testid="camera-back" className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs text-slate-200 hover:border-cyan-600">
        ← Vista de conducción
      </button>
      {extra}
    </div>
  );
}

function Overlay({ title, onBack, children, testId }: { title: string; onBack: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <div className="absolute bottom-3 left-1/2 w-[min(92%,26rem)] -translate-x-1/2 rounded-xl border border-white/15 bg-black/75 p-3 text-sm text-slate-200 backdrop-blur" data-testid={testId}>
      <div className="mb-1 font-semibold text-white">{title}</div>
      <div className="text-xs text-slate-300">{children}</div>
      <div className="mt-2">
        <CameraBack onBack={onBack} />
      </div>
    </div>
  );
}
