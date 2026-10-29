import type { Lighting } from './lighting';

/** Pseudoaleatorio determinista para colocar estrellas siempre en el mismo sitio. */
const STARS = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 100, y: r(2) * 36, s: 1 + r(3) * 1.6, d: r(4) * 3 };
});

/** Paisaje exterior visto a través del parabrisas: cielo, montañas y autovía con perspectiva real. */
export function CabinScene({ light, headlights }: { light: Lighting; headlights: boolean }) {
  const [top, mid, bottom] = light.sky;
  const beam = headlights ? 0.1 + (1 - light.daylight) * 0.7 : 0;
  return (
    <div className="cab-scene absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: `linear-gradient(${top} 0%, ${mid} 65%, ${bottom} 100%)` }} />
      {light.starsOpacity > 0.02 &&
        STARS.map((s, i) => (
          <span key={i} className="cab-star absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s`, opacity: light.starsOpacity }} />
        ))}
      {/* Luna */}
      {light.daylight < 0.6 && (
        <span className="absolute rounded-full" style={{ left: '72%', top: '17%', width: 34, height: 34, background: '#e8ecf5', opacity: 1 - light.daylight, boxShadow: '0 0 30px 6px rgba(200,215,255,0.35)' }} />
      )}
      {/* Sol: recorre el cielo de este a oeste */}
      {light.sun.visible && (
        <span
          className="absolute -translate-x-1/2 rounded-full"
          style={{
            left: `${light.sun.x}%`,
            top: `${light.sun.y}%`,
            width: 48,
            height: 48,
            background: light.dusk > 0.4 ? '#ffd29a' : '#fff7d6',
            boxShadow: `0 0 70px 24px ${light.dusk > 0.4 ? 'rgba(255,170,90,0.55)' : 'rgba(255,245,200,0.6)'}`,
          }}
        />
      )}
      <svg className="absolute inset-x-0 w-full" style={{ top: '22%', height: '19%' }} viewBox="0 0 1600 200" preserveAspectRatio="none">
        <path d="M0 200 L0 120 L140 60 L260 110 L420 30 L560 100 L700 50 L860 120 L1000 40 L1150 100 L1300 55 L1450 110 L1600 70 L1600 200Z" fill={light.mountains[0]} />
        <path d="M0 200 L0 160 L200 110 L380 150 L560 105 L760 150 L980 115 L1200 160 L1400 120 L1600 150 L1600 200Z" fill={light.mountains[1]} />
      </svg>
      <div className="absolute inset-x-0 bottom-0" style={{ top: '40%', background: light.ground }} />
      <div className="road-wrap">
        <div className="road-plane" style={{ filter: `brightness(${0.45 + light.daylight * 0.55})` }}>
          <span className="road-shoulder" style={{ left: 0 }} />
          <span className="road-shoulder" style={{ right: 0 }} />
          <span className="road-line solid" style={{ left: '25.5%' }} />
          <span className="road-line dashed" style={{ left: '49.6%' }} />
          <span className="road-line solid" style={{ left: '73.6%' }} />
        </div>
      </div>
      {/* Haz de los faros sobre la calzada */}
      {beam > 0 && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          data-testid="headlight-beam"
          style={{
            top: '42%',
            background: `radial-gradient(60% 85% at 52% 100%, rgba(255,244,214,${beam.toFixed(2)}) 0%, rgba(255,244,214,${(beam * 0.35).toFixed(2)}) 45%, transparent 75%)`,
            clipPath: 'polygon(46% 0, 58% 0, 100% 100%, 0 100%)',
          }}
        />
      )}
      <div className="absolute inset-x-0" style={{ top: '34%', height: '10%', background: `linear-gradient(transparent, ${light.haze}, transparent)` }} />
      <svg className="absolute" style={{ left: '56.2%', top: '37.2%', width: '3.6%' }} viewBox="0 0 60 60">
        <rect x="4" y="2" width="52" height="46" rx="2" fill={light.night ? '#2b3340' : '#dfe5ea'} stroke="#5d6875" />
        <rect x="8" y="50" width="12" height="8" rx="2" fill="#111" />
        <rect x="40" y="50" width="12" height="8" rx="2" fill="#111" />
        <rect x="6" y="40" width="8" height="5" fill="#ff3b3b" />
        <rect x="46" y="40" width="8" height="5" fill="#ff3b3b" />
      </svg>
      <div className="absolute flex items-center gap-1 rounded-sm border border-white/80 bg-[#0b5ea8] px-1.5 py-0.5 text-white shadow" style={{ left: '69%', top: '27%', fontSize: 'clamp(6px, 0.85vw, 11px)', filter: `brightness(${0.55 + light.daylight * 0.45})` }}>
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
