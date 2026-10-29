import { useEffect, useState } from 'react';
import type { AssistTarget } from '@/academy/assist';
import { useSimStore } from '@/simulator/store';

type Position = 'off' | 'on' | 'start';

/** Ángulo de la llave en cada posición del contacto (0 · I · II). */
const ANGLE: Record<Position, number> = { off: -50, on: 0, start: 50 };
const LABEL: Record<Position, string> = { off: '0', on: 'I', start: 'II' };
const NAME: Record<Position, string> = { off: 'Llave en 0: contacto quitado', on: 'Llave en I: contacto', start: 'Llave en II: arrancar motor' };

/**
 * Cerradura de contacto genérica con tres posiciones, como en la cabina de un camión:
 * 0 (quitado), I (contacto: se enciende el tacógrafo) y II (arranque, vuelve sola a I).
 * Se coloca junto al tacógrafo, a su misma altura.
 */
export function IgnitionKey({ highlight }: { highlight: AssistTarget }) {
  const ignition = useSimStore((s) => s.sim.vehicle.ignition ?? 'off');
  const dispatch = useSimStore((s) => s.dispatch);
  // La posición II es momentánea: se muestra un instante y la llave vuelve a I.
  const [cranking, setCranking] = useState(false);
  useEffect(() => {
    if (!cranking) return;
    const t = window.setTimeout(() => setCranking(false), 650);
    return () => window.clearTimeout(t);
  }, [cranking]);

  const shown: Position = cranking ? 'start' : ignition === 'off' ? 'off' : 'on';
  const turn = (p: Position) => {
    if (p === 'start') setCranking(true);
    dispatch({ type: 'SET_IGNITION', position: p });
  };
  // Clic en la llave: 0 → I → II (arranque); con el motor en marcha, vuelve a 0.
  const next = (): Position => (ignition === 'off' ? 'on' : ignition === 'on' ? 'start' : 'off');
  const running = ignition === 'running';

  return (
    <section
      aria-label="Llave de contacto"
      data-testid="ignition"
      className={`glass flex shrink-0 flex-row items-center gap-3 rounded-2xl p-3 sm:w-36 sm:flex-col sm:gap-2 ${highlight === 'VEHICLE' && !running ? 'assist-target' : ''}`}
    >
      <button
        type="button"
        onClick={() => turn(next())}
        aria-label={`Girar la llave (ahora ${LABEL[ignition === 'running' ? 'on' : ignition]})`}
        className="relative shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <svg viewBox="0 0 120 120" className="h-24 w-24 sm:h-28 sm:w-28" aria-hidden="true">
          <defs>
            <radialGradient id="lock-face" cx="0.4" cy="0.35" r="0.8">
              <stop offset="0" stopColor="#4b5563" />
              <stop offset="1" stopColor="#111827" />
            </radialGradient>
            <linearGradient id="key-metal" x1="0" x2="1">
              <stop offset="0" stopColor="#9ca3af" />
              <stop offset="0.5" stopColor="#f3f4f6" />
              <stop offset="1" stopColor="#9ca3af" />
            </linearGradient>
          </defs>
          {/* Marcas de posición */}
          {(Object.keys(ANGLE) as Position[]).map((p) => {
            const a = ((ANGLE[p] - 90) * Math.PI) / 180;
            const lit = shown === p;
            return (
              <text key={p} x={60 + Math.cos(a) * 52} y={60 + Math.sin(a) * 52 + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill={lit ? '#fbbf24' : '#94a3b8'}>
                {LABEL[p]}
              </text>
            );
          })}
          <circle cx="60" cy="60" r="40" fill="#0b0d10" />
          <circle cx="60" cy="60" r="36" fill="url(#lock-face)" stroke="#000" strokeWidth="1.5" />
          <circle cx="60" cy="60" r="36" fill="none" stroke={running ? '#34d399' : ignition === 'on' ? '#fbbf24' : 'transparent'} strokeWidth="2" opacity="0.8" />
          {/* Llave: gira según la posición */}
          <g style={{ transform: `rotate(${ANGLE[shown]}deg)`, transformOrigin: '60px 60px', transition: 'transform 350ms cubic-bezier(.3,1.4,.5,1)' }}>
            <rect x="55" y="36" width="10" height="48" rx="3" fill="#1f2937" />
            <rect x="44" y="18" width="32" height="30" rx="10" fill="url(#key-metal)" stroke="#6b7280" />
            <circle cx="60" cy="27" r="4" fill="#1f2937" />
            <rect x="57" y="48" width="6" height="26" rx="2" fill="url(#key-metal)" />
          </g>
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:w-full">
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Posiciones de la llave">
          {(['off', 'on', 'start'] as Position[]).map((p) => {
            const active = p === 'start' ? running : p === 'on' ? ignition === 'on' : ignition === 'off';
            return (
              <button
                key={p}
                type="button"
                data-testid={`ignition-${p}`}
                aria-pressed={active}
                title={NAME[p]}
                aria-label={NAME[p]}
                onClick={() => turn(p)}
                className={`rounded-lg py-1.5 text-xs font-bold transition ${active ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
              >
                {LABEL[p]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300" data-testid="engine-status">
          <span className={`h-2.5 w-2.5 rounded-full ${running ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : ignition === 'on' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-600'}`} aria-hidden="true" />
          {running ? 'Motor en marcha' : ignition === 'on' ? 'Contacto' : 'Motor apagado'}
        </div>
      </div>
    </section>
  );
}
