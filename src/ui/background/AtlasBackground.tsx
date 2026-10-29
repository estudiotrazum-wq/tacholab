import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ODOMETER_START_KM } from '@/simulator/engine';
import { useSimStore } from '@/simulator/store';
import {
  ATLAS_H,
  ATLAS_W,
  BORDERS,
  CITIES,
  COAST,
  ISLANDS,
  MOTORWAYS,
  RELIEF,
  ROUTE,
  contourPath,
  project,
  roadPath,
  routeProgress,
  smoothPath,
  type CityId,
} from './atlas';

/**
 * Fondo «atlas de carreteras» nocturno: relieve, costa, fronteras, autovías con su denominación,
 * ciudades y la ruta del camión resaltada. El camión avanza por la ruta según el cuentakilómetros.
 * Diseño propio y decorativo; se atenúa en el centro para no restar legibilidad.
 */
export function AtlasBackground() {
  const km = useSimStore((s) => (s.sim.vehicle.odometerKm ?? ODOMETER_START_KM) - ODOMETER_START_KM);
  const moving = useSimStore((s) => s.sim.vehicle.moving);
  return (
    <div className="atlas-bg" aria-hidden="true" data-testid="atlas-bg">
      <svg viewBox={`0 0 ${ATLAS_W} ${ATLAS_H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <AtlasStatic />
        <RouteLayer km={km} moving={moving} />
      </svg>
      <div className="atlas-vignette" />
    </div>
  );
}

const routePath = () => {
  const pts = ROUTE.map((id) => CITIES[id].at);
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const seg = roadPath(pts[i]!, pts[i + 1]!);
    d += i === 0 ? seg : seg.replace(/^M[^Q]+/, ' ');
  }
  return d;
};

function RouteLayer({ km, moving }: { km: number; moving: boolean }) {
  const d = useMemo(routePath, []);
  const ref = useRef<SVGPathElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number; angle: number } | null>(null);
  const progress = routeProgress(km);

  useEffect(() => {
    const path = ref.current;
    if (!path || typeof path.getTotalLength !== 'function') return;
    const len = path.getTotalLength();
    const at = progress * len;
    const p = path.getPointAtLength(at);
    const q = path.getPointAtLength(Math.min(len, at + 2));
    setPos({ x: p.x, y: p.y, angle: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI });
  }, [progress]);

  return (
    <g>
      <path d={d} fill="none" stroke="rgba(34,211,238,0.18)" strokeWidth="14" strokeLinecap="round" />
      <path ref={ref} d={d} fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d={d} fill="none" stroke="#e0fbff" strokeWidth="1.4" strokeDasharray="10 16" className={moving ? 'atlas-flow' : ''} opacity="0.7" />
      {pos && (
        <g transform={`translate(${pos.x} ${pos.y})`}>
          <circle r="18" fill="rgba(34,211,238,0.18)" className="atlas-ping" />
          <circle r="9" fill="#0b1220" stroke="#22d3ee" strokeWidth="2.5" />
          <g transform={`rotate(${pos.angle})`}>
            <path d="M-4 -3.2h5.5l2.5 3.2-2.5 3.2H-4Z" fill="#22d3ee" />
          </g>
        </g>
      )}
    </g>
  );
}

/** Capa fija del mapa (se dibuja una sola vez). */
const AtlasStatic = memo(function AtlasStatic() {
  const [tlx, tly] = project([11.5, 47.6]);
  const [brx] = project([11.5, 35]);
  const land = `${smoothPath(COAST)} L${brx} ${tly} L${project([-2, 47.6])[0]} ${tly} Z`;
  void tlx;
  const cityIds = Object.keys(CITIES) as CityId[];
  const route = new Set(ROUTE);
  return (
    <>
      <defs>
        <linearGradient id="atlas-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06101f" />
          <stop offset="1" stopColor="#040a16" />
        </linearGradient>
        <linearGradient id="atlas-land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d1b2e" />
          <stop offset="1" stopColor="#0a1626" />
        </linearGradient>
        <pattern id="atlas-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0v6" stroke="rgba(56,189,248,0.05)" strokeWidth="1" />
        </pattern>
        <filter id="atlas-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Mar y retícula de meridianos y paralelos */}
      <rect width={ATLAS_W} height={ATLAS_H} fill="url(#atlas-sea)" />
      <rect width={ATLAS_W} height={ATLAS_H} fill="url(#atlas-hatch)" />
      <g stroke="rgba(148,163,184,0.06)" strokeWidth="1">
        {Array.from({ length: 22 }, (_, i) => -10 + i).map((lon) => {
          const [x] = project([lon, 0]);
          return <line key={`m${lon}`} x1={x} y1={0} x2={x} y2={ATLAS_H} />;
        })}
        {Array.from({ length: 12 }, (_, i) => 36 + i).map((lat) => {
          const [, y] = project([0, lat]);
          return <line key={`p${lat}`} x1={0} y1={y} x2={ATLAS_W} y2={y} />;
        })}
      </g>

      {/* Tierra: costa con línea de costa iluminada */}
      <path d={land} fill="url(#atlas-land)" />
      {ISLANDS.map((isl, i) => (
        <path key={i} d={smoothPath(isl, true)} fill="url(#atlas-land)" stroke="rgba(56,189,248,0.35)" strokeWidth="1.2" />
      ))}
      <path d={smoothPath(COAST)} fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="10" />
      <path d={smoothPath(COAST)} fill="none" stroke="rgba(56,189,248,0.4)" strokeWidth="1.3" />

      {/* Relieve: curvas de nivel */}
      <g fill="none" stroke="rgba(167,139,250,0.10)" strokeWidth="1">
        {RELIEF.flatMap((r, ri) => Array.from({ length: r.rings }, (_, k) => <path key={`${ri}-${k}`} d={contourPath(r, k + 1)} />))}
      </g>

      {/* Fronteras */}
      <g fill="none" stroke="rgba(244,114,182,0.25)" strokeWidth="1.2" strokeDasharray="2 5" strokeLinecap="round">
        {BORDERS.map((b, i) => <path key={i} d={smoothPath(b)} />)}
      </g>

      {/* Autovías: doble línea y escudo con su denominación */}
      <g fill="none" strokeLinecap="round">
        {MOTORWAYS.map((m) => {
          const d = roadPath(CITIES[m.from].at, CITIES[m.to].at);
          return (
            <g key={`${m.from}-${m.to}`}>
              <path d={d} stroke="rgba(251,191,36,0.10)" strokeWidth="6" />
              <path d={d} stroke="rgba(251,191,36,0.38)" strokeWidth="1.4" />
            </g>
          );
        })}
      </g>
      <g fontFamily="Inter Variable, ui-sans-serif, system-ui" fontSize="10" fontWeight="700">
        {MOTORWAYS.filter((_, i) => i % 2 === 0).map((m) => {
          const [x1, y1] = project(CITIES[m.from].at);
          const [x2, y2] = project(CITIES[m.to].at);
          const x = (x1 + x2) / 2;
          const y = (y1 + y2) / 2;
          const w = m.ref.length * 6.4 + 8;
          return (
            <g key={`ref-${m.from}-${m.to}`} transform={`translate(${x - w / 2} ${y - 7})`} opacity="0.55">
              <rect width={w} height="14" rx="3" fill="#0b1a2e" stroke="rgba(251,191,36,0.5)" />
              <text x={w / 2} y="10.5" textAnchor="middle" fill="rgba(253,230,138,0.85)">{m.ref}</text>
            </g>
          );
        })}
      </g>

      {/* Ciudades */}
      <g fontFamily="Inter Variable, ui-sans-serif, system-ui">
        {cityIds.map((id) => {
          const [x, y] = project(CITIES[id].at);
          const big = id === 'madrid' || id === 'barcelona' || id === 'lisboa' || id === 'lyon';
          const onRoute = route.has(id);
          return (
            <g key={id} transform={`translate(${x} ${y})`}>
              {onRoute && <circle r="10" fill="rgba(34,211,238,0.16)" filter="url(#atlas-glow)" />}
              <circle r={big ? 4.5 : 3} fill={onRoute ? '#a5f3fc' : '#cbd5e1'} opacity={onRoute ? 0.95 : 0.55} />
              <text x="8" y="4" fontSize={big ? 14 : 11.5} fontWeight={big ? 600 : 500} fill={onRoute ? 'rgba(207,250,254,0.75)' : 'rgba(203,213,225,0.42)'} letterSpacing="0.02em">
                {CITIES[id].name}
              </text>
            </g>
          );
        })}
      </g>

      {/* Rotulación de mares */}
      <g fontFamily="Inter Variable, ui-sans-serif, system-ui" fill="rgba(125,211,252,0.22)" fontStyle="italic" letterSpacing="0.35em" fontSize="15">
        <text x={project([-10.2, 40.6])[0]} y={project([-10.2, 40.6])[1]} transform={`rotate(-90 ${project([-10.2, 40.6]).join(' ')})`}>OCÉANO ATLÁNTICO</text>
        <text x={project([-6.5, 44.6])[0]} y={project([-6.5, 44.6])[1]}>GOLFO DE VIZCAYA</text>
        <text x={project([3.2, 38.6])[0]} y={project([3.2, 38.6])[1]}>MAR MEDITERRÁNEO</text>
      </g>

      {/* Rosa de los vientos y escala */}
      <g transform={`translate(${ATLAS_W - 120} ${ATLAS_H - 130})`} opacity="0.4" stroke="rgba(203,213,225,0.6)" fill="none">
        <circle r="38" />
        <circle r="30" strokeDasharray="2 4" />
        <path d="M0 -46 L6 0 L0 46 L-6 0Z" fill="rgba(203,213,225,0.25)" />
        <path d="M-46 0 L0 5 L46 0 L0 -5Z" fill="rgba(203,213,225,0.12)" />
        <text y="-52" textAnchor="middle" fontSize="12" fill="rgba(203,213,225,0.8)" stroke="none" fontFamily="Inter Variable, ui-sans-serif">N</text>
      </g>
      <g transform={`translate(${ATLAS_W - 300} ${ATLAS_H - 40})`} opacity="0.45" fontFamily="Inter Variable, ui-sans-serif" fontSize="10" fill="rgba(203,213,225,0.8)">
        <rect width="64" height="5" fill="rgba(203,213,225,0.7)" />
        <rect x="64" width="64" height="5" fill="none" stroke="rgba(203,213,225,0.7)" />
        <text y="18">0</text>
        <text x="60" y="18">100</text>
        <text x="118" y="18">200 km</text>
      </g>
    </>
  );
});
