import { SKY, type DayPhase } from './dayPhase';

/** Pseudoaleatorio determinista para colocar estrellas siempre en el mismo sitio. */
const STARS = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 36, s: 1 + r(3) * 1.6, d: r(4) * 3 };
});

/** Paisaje exterior visto a través del parabrisas: cielo, montañas y autovía con perspectiva real. */
export function CabinScene({ phase }: { phase: DayPhase }) {
  const c = SKY[phase];
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: c.sky }} />
      {phase === 'night' &&
        STARS.map((s, i) => (
          <span key={i} className="cab-star absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
        ))}
      {/* Sol o luna */}
      <span
        className="absolute rounded-full"
        style={
          phase === 'night'
            ? { left: '72%', top: '17%', width: 34, height: 34, background: '#e8ecf5', boxShadow: '0 0 30px 6px rgba(200,215,255,0.35)' }
            : phase === 'day'
              ? { left: '22%', top: '14%', width: 46, height: 46, background: '#fff7d6', boxShadow: '0 0 60px 20px rgba(255,245,200,0.6)' }
              : { left: '64%', top: '31%', width: 56, height: 56, background: '#ffd29a', boxShadow: '0 0 70px 25px rgba(255,170,90,0.55)' }
        }
      />
      {/* Montañas */}
      <svg className="absolute inset-x-0 w-full" style={{ top: '22%', height: '19%' }} viewBox="0 0 1600 200" preserveAspectRatio="none">
        <path d="M0 200 L0 120 L140 60 L260 110 L420 30 L560 100 L700 50 L860 120 L1000 40 L1150 100 L1300 55 L1450 110 L1600 70 L1600 200Z" fill={c.mountains[0]} />
        <path d="M0 200 L0 160 L200 110 L380 150 L560 105 L760 150 L980 115 L1200 160 L1400 120 L1600 150 L1600 200Z" fill={c.mountains[1]} />
      </svg>
      {/* Terreno */}
      <div className="absolute inset-x-0 bottom-0" style={{ top: '40%', background: c.ground }} />
      {/* Autovía en perspectiva: el conductor circula por el carril derecho */}
      <div className="road-wrap">
        <div className="road-plane">
          <span className="road-shoulder" style={{ left: 0 }} />
          <span className="road-shoulder" style={{ right: 0 }} />
          <span className="road-line solid" style={{ left: '25.5%' }} />
          <span className="road-line dashed" style={{ left: '49.6%' }} />
          <span className="road-line solid" style={{ left: '73.6%' }} />
        </div>
      </div>
      {/* Bruma del horizonte */}
      <div className="absolute inset-x-0" style={{ top: '34%', height: '10%', background: `linear-gradient(transparent, ${c.haze}, transparent)` }} />
      {/* Camión por delante (genérico) */}
      <svg className="absolute" style={{ left: '56.2%', top: '37.2%', width: '3.6%' }} viewBox="0 0 60 60">
        <rect x="4" y="2" width="52" height="46" rx="2" fill={phase === 'night' ? '#2b3340' : '#dfe5ea'} stroke="#5d6875" />
        <rect x="8" y="50" width="12" height="8" rx="2" fill="#111" />
        <rect x="40" y="50" width="12" height="8" rx="2" fill="#111" />
        <rect x="6" y="40" width="8" height="5" fill="#ff3b3b" opacity={phase === 'night' ? 1 : 0.8} />
        <rect x="46" y="40" width="8" height="5" fill="#ff3b3b" opacity={phase === 'night' ? 1 : 0.8} />
      </svg>
      {/* Señal de área de descanso */}
      <div className="absolute flex items-center gap-1 rounded-sm border border-white/80 bg-[#0b5ea8] px-1.5 py-0.5 text-white shadow" style={{ left: '69%', top: '27%', fontSize: 'clamp(6px, 0.85vw, 11px)' }}>
        <svg viewBox="0 0 24 24" className="h-[1.6em] w-[1.6em]" fill="none" stroke="white" strokeWidth="2">
          <path d="M3 18V7M3 14h18v4M21 14v-2.5a2.5 2.5 0 0 0-2.5-2.5H10v5" />
          <circle cx="6.5" cy="11.5" r="1.6" />
        </svg>
        <span className="font-semibold leading-tight">Área de descanso<br />12 km</span>
      </div>
      <span className="absolute w-[0.25%] bg-slate-500" style={{ left: '72%', top: '32%', height: '8.5%' }} />
    </div>
  );
}
