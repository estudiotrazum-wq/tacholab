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
      data-tour="ignition"
      className={`glass flex shrink-0 flex-row items-center gap-3 rounded-2xl p-3 sm:w-36 sm:flex-col sm:gap-2 ${highlight === 'VEHICLE' && !running ? 'assist-target' : ''}`}
    >
      <button
        type="button"
        onClick={() => turn(next())}
        aria-label={`Girar la llave (ahora ${LABEL[ignition === 'running' ? 'on' : ignition]})`}
        className="relative shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <svg viewBox="0 0 120 120" className="h-24 w-24 overflow-visible sm:h-28 sm:w-28" aria-hidden="true">
          <defs>
            <radialGradient id="ign-bezel" cx="0.35" cy="0.25" r="0.9">
              <stop offset="0" stopColor="#3a4150" />
              <stop offset="0.55" stopColor="#1b2029" />
              <stop offset="1" stopColor="#0c0f14" />
            </radialGradient>
            <radialGradient id="ign-knob" cx="0.4" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#2a303b" />
              <stop offset="1" stopColor="#0d1015" />
            </radialGradient>
            <linearGradient id="ign-fob" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b4252" />
              <stop offset="0.5" stopColor="#161a22" />
              <stop offset="1" stopColor="#07090c" />
            </linearGradient>
            <linearGradient id="ign-chrome" x1="0" x2="1">
              <stop offset="0" stopColor="#6b7280" />
              <stop offset="0.5" stopColor="#e5e7eb" />
              <stop offset="1" stopColor="#6b7280" />
            </linearGradient>
            <filter id="ign-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
          {/* Anillo de LED con tres segmentos: 0 · I · II */}
          {(Object.keys(ANGLE) as Position[]).map((p) => {
            const lit = p === 'off' ? true : p === 'on' ? ignition !== 'off' : running || shown === 'start';
            const color = p === 'off' ? (ignition === 'off' ? '#94a3b8' : '#475569') : p === 'on' ? '#fbbf24' : '#34d399';
            const a0 = ((ANGLE[p] - 90 - 20) * Math.PI) / 180;
            const a1 = ((ANGLE[p] - 90 + 20) * Math.PI) / 180;
            const r = 49;
            const d = `M${60 + Math.cos(a0) * r} ${60 + Math.sin(a0) * r} A${r} ${r} 0 0 1 ${60 + Math.cos(a1) * r} ${60 + Math.sin(a1) * r}`;
            const am = ((ANGLE[p] - 90) * Math.PI) / 180;
            return (
              <g key={p}>
                {lit && p !== 'off' && <path d={d} stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" filter="url(#ign-glow)" opacity="0.7" />}
                <path d={d} stroke={lit ? color : '#273040'} strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <text x={60 + Math.cos(am) * 41} y={60 + Math.sin(am) * 41 + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fontFamily="Inter Variable, ui-sans-serif" fill={shown === p ? '#f8fafc' : '#64748b'}>
                  {LABEL[p]}
                </text>
              </g>
            );
          })}
          {/* Bisel y mando */}
          <circle cx="60" cy="60" r="34" fill="url(#ign-bezel)" />
          <circle cx="60" cy="60" r="34" fill="none" stroke="rgba(255,255,255,0.08)" />
          <circle cx="60" cy="60" r="27" fill="url(#ign-knob)" stroke="#05070a" strokeWidth="1.5" />
          {/* Llave de mando (fob) insertada: gira con la posición */}
          <g style={{ transform: `rotate(${ANGLE[shown]}deg)`, transformOrigin: '60px 60px', transition: 'transform 380ms cubic-bezier(.3,1.35,.5,1)' }}>
            <rect x="49" y="31" width="22" height="58" rx="11" fill="url(#ign-fob)" stroke="url(#ign-chrome)" strokeWidth="1.4" />
            <rect x="53" y="36" width="14" height="3" rx="1.5" fill={running ? '#34d399' : ignition === 'on' ? '#fbbf24' : '#334155'} />
            {ignition !== 'off' && <rect x="53" y="36" width="14" height="3" rx="1.5" fill={running ? '#34d399' : '#fbbf24'} filter="url(#ign-glow)" />}
            <circle cx="60" cy="60" r="5.5" fill="none" stroke="rgba(255,255,255,0.18)" />
            <path d="M57.5 60h5M60 57.5v5" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" strokeLinecap="round" />
            <rect x="52" y="78" width="16" height="6" rx="3" fill="rgba(255,255,255,0.05)" />
          </g>
        </svg>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:w-full">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/30 p-1" role="group" aria-label="Posiciones de la llave">
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
                className={`rounded-lg py-1.5 text-xs font-bold transition ${
                  active
                    ? p === 'start'
                      ? 'bg-emerald-400 text-slate-950 shadow-[0_0_14px_-2px_rgba(52,211,153,0.8)]'
                      : p === 'on'
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_14px_-2px_rgba(251,191,36,0.8)]'
                        : 'bg-slate-500/40 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
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
