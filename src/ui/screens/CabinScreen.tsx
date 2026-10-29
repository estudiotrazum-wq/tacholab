import { useMemo, useState } from 'react';
import { ACTIVITY_LABEL } from '@/shared/types';
import { SPEEDS, type Speed } from '@/time-engine/clock';
import { formatTime, zonedParts } from '@/time-engine/zoned';
import { renderDisplay } from '@/tachograph/display';
import { openEvent } from '@/time-engine/timeline';
import { useSimStore } from '@/simulator/store';
import { useUiStore, LED_COLORS } from '../uiStore';
import { CabinScene } from '../cabin/CabinScene';
import { CabinInterior } from '../cabin/CabinInterior';
import { dayPhase } from '../cabin/dayPhase';
import { playHorn } from '../cabin/horn';

/**
 * Cabina de camión genérica (cabina adelantada) en 2D por capas: paisaje en
 * perspectiva CSS detrás e interior SVG delante. Sin marcas ni diseños identificables.
 */
export function CabinScreen() {
  const { go, ledColor, update, learningMode } = useUiStore();
  const sim = useSimStore((s) => s.sim);
  const dispatch = useSimStore((s) => s.dispatch);
  const [zooming, setZooming] = useState(false);
  const [honk, setHonk] = useState(0);
  const display = useMemo(() => renderDisplay(sim), [sim]);

  const local = sim.scenario.localTimeZone;
  const phase = dayPhase(zonedParts(sim.clock.now, local).hour);
  const moving = sim.vehicle.moving;
  const speed = sim.clock.speed;
  const running = speed > 0;
  const recorded = openEvent(sim.timeline)?.activity ?? null;
  const alert = sim.device.warning !== null;
  const roadSpeed = speed >= 30 ? '0.22s' : speed >= 5 ? '0.4s' : '0.75s';

  const enterDevice = () => {
    if (zooming) return;
    setZooming(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => go('device'), reduce ? 0 : 700);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div
        className={`cab-stage relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-ink-700 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] ${moving && running ? 'is-moving' : ''} ${alert ? 'is-alert' : ''}`}
        style={{ ['--led' as string]: LED_COLORS[ledColor].hex, ['--road-speed' as string]: roadSpeed }}
      >
        <div
          className="absolute inset-0 transition-transform duration-700 ease-in-out"
          style={{ transform: zooming ? 'scale(3.4)' : 'scale(1)', transformOrigin: '69% 79%' }}
        >
          <CabinScene phase={phase} />
          <CabinInterior
            ledColor={ledColor}
            moving={moving}
            timeRunning={running}
            cardIn={sim.device.insertedCardId !== null}
            resting={recorded === 'REST'}
            night={phase === 'night' || phase === 'dusk'}
            displayTitle={display.title}
            displayLine={display.lines[0]}
            localTime={formatTime(sim.clock.now, local)}
            pulseTacho={learningMode === 'assisted'}
            onTacho={enterDevice}
            onGear={() => dispatch({ type: 'SET_MOVING', moving: !moving })}
            onHorn={() => {
              playHorn();
              setHonk((n) => n + 1);
            }}
            onLed={(c) => update({ ledColor: c })}
          />
        </div>
        {honk > 0 && (
          <span key={honk} className="pointer-events-none absolute left-[30%] top-[62%] animate-[honk_0.9s_ease-out_forwards] text-xl font-black text-white drop-shadow-[0_0_8px_var(--led)] sm:text-3xl">
            ¡MOOOC!
          </span>
        )}
        {alert && (
          <div className="pointer-events-none absolute inset-x-0 top-[24%] mx-auto w-fit rounded-full border border-orange-400/60 bg-black/70 px-4 py-1.5 text-xs text-orange-200 sm:text-sm" role="alert">
            ⚠ {sim.device.warning?.title} — revisa el tacógrafo
          </div>
        )}
      </div>

      {/* Barra de control bajo la cabina */}
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-ink-700 bg-ink-900/80 px-3 py-2">
        <div className="font-mono text-sm">
          <span className="text-cyan-200">{formatTime(sim.clock.now, 'UTC')} UTC</span>
          <span className="ml-2 text-slate-500">{formatTime(sim.clock.now, local)} local</span>
        </div>
        <div className="flex gap-1" role="group" aria-label="Velocidad del reloj">
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              type="button"
              aria-pressed={speed === sp}
              onClick={() => dispatch({ type: 'SET_SPEED', speed: sp as Speed })}
              className={`rounded-md border px-2 py-1 text-xs ${speed === sp ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100' : 'border-ink-600 text-slate-300 hover:border-cyan-700'}`}
            >
              {sp === 0 ? '❚❚' : sp === 1 ? '▶ ×1' : `×${sp}`}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400">
          Registrado: <span className="text-slate-100">{recorded ? ACTIVITY_LABEL[recorded] : '—'}</span>
        </span>
        <button type="button" onClick={enterDevice} className="ml-auto rounded-lg border border-cyan-600 bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-500/20">
          Ir al tacógrafo →
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Interactúa con la cabina: <strong className="text-slate-300">tacógrafo</strong> (consola central), <strong className="text-slate-300">selector de marcha</strong> N/D,{' '}
        <strong className="text-slate-300">luces LED</strong> (consola del techo) y <strong className="text-slate-300">claxon</strong> (centro del volante). La taza humea durante las pausas.
      </p>
    </div>
  );
}
