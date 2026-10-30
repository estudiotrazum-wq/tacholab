import { N_, t } from '@/i18n';
import type { KeyboardEvent, ReactNode } from 'react';
import { LED_COLORS, type LedColor } from '../uiStore';

export interface CabinInteriorProps {
  ledColor: LedColor;
  moving: boolean;
  timeRunning: boolean;
  cardIn: boolean;
  resting: boolean;
  night: boolean;
  displayTitle: string;
  displayLine: string;
  localTime: string;
  pulseTacho: boolean;
  onTacho: () => void;
  onGear: () => void;
  onHorn: () => void;
  onLed: (c: LedColor) => void;
  hazards: boolean;
  headlights: boolean;
  interiorLight: boolean;
  visorDown: boolean;
  ledOn: boolean;
  onMirror: () => void;
  onRoof: () => void;
  onVisor: () => void;
  onSwitch: (id: CabinSwitch) => void;
}

export type CabinSwitch = 'headlights' | 'interiorLight' | 'hazards' | 'ledOn';

const SWITCHES: { id: CabinSwitch; label: string; icon: string }[] = [
  { id: 'headlights', label: N_('Faros'), icon: 'M6 8h6l3 4-3 4H6M17 9h4M17 12h4M17 15h4' },
  { id: 'interiorLight', label: N_('Luz interior'), icon: 'M12 4v3M6 9l2 2M18 9l-2 2M8 15a4 4 0 0 1 8 0Z' },
  { id: 'hazards', label: N_('Luces de emergencia'), icon: 'M12 5 20 19H4Z' },
  { id: 'ledOn', label: N_('Iluminación LED ambiental'), icon: 'M5 12h14M7 8h10M7 16h10' },
];

/** Contorno del habitáculo: todo menos el parabrisas y las ventanillas laterales. */
const WINDSHIELD = 'M232 118 L1368 118 L1442 580 L158 580Z';
const LEFT_WINDOW = 'M0 150 L150 136 L112 600 L0 612Z';
const RIGHT_WINDOW = 'M1450 136 L1600 150 L1600 612 L1488 600Z';
const FRAME = `M0 0 H1600 V900 H0Z ${WINDSHIELD} ${LEFT_WINDOW} ${RIGHT_WINDOW}`;

function Hotspot({ label, onActivate, children, testId }: { label: string; onActivate: () => void; children: ReactNode; testId?: string }) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };
  return (
    <g role="button" tabIndex={0} aria-label={label} onClick={onActivate} onKeyDown={onKey} className="cab-hotspot" data-testid={testId}>
      <title>{label}</title>
      {children}
    </g>
  );
}

/** LED: núcleo fino + halo difuminado. */
function Led({ d, width = 4, breathe = true }: { d: string; width?: number; breathe?: boolean }) {
  return (
    <g className={breathe ? 'led-breathe' : ''}>
      <path d={d} className="led-glow" strokeWidth={width * 5} fill="none" strokeLinecap="round" />
      <path d={d} className="led-core" strokeWidth={width} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Mirror({ x, flip, hazards }: { x: number; flip: boolean; hazards: boolean }) {
  const armX = flip ? x - 40 : x + 74;
  return (
    <g>
      <path d={`M${flip ? 1488 : 112} 330 L${armX} 330`} stroke="#141b24" strokeWidth="10" />
      <rect x={x} y="220" width="74" height="190" rx="12" fill="#151c25" stroke="#2a3542" strokeWidth="3" />
      <rect x={x + 7} y="228" width="60" height="120" rx="7" fill="url(#mirror)" />
      <rect x={x + 7} y="354" width="60" height="48" rx="7" fill="url(#mirror)" opacity="0.85" />
      {/* Lateral del semirremolque propio en el reflejo */}
      <path d={flip ? `M${x + 7} 236 L${x + 24} 236 L${x + 24} 342 L${x + 7} 342Z` : `M${x + 50} 236 L${x + 67} 236 L${x + 67} 342 L${x + 50} 342Z`} fill="#cfd6dd" opacity="0.55" />
      <rect x={flip ? x + 7 : x + 46} y="250" width="21" height="4" className="led-fill" opacity="0.5" />
      {/* Marcas viales en el reflejo: se desplazan al circular */}
      <path d={`M${flip ? x + 52 : x + 20} 300 L${flip ? x + 40 : x + 32} 346`} className="mirror-road" stroke="#f4f1e3" strokeWidth="2.5" strokeDasharray="6 10" />
      {/* Repetidor de intermitente */}
      <rect x={x + 22} y="408" width="30" height="7" rx="3" fill={hazards ? '#fbbf24' : '#3b3020'} className={hazards ? 'hazard-blink' : ''} />
    </g>
  );
}

export function CabinInterior(p: CabinInteriorProps) {
  const speed = p.moving ? 82 : 0;
  // Aguja: 0 km/h = -120°, 120 km/h = +120°
  const needle = -120 + (speed / 120) * 240;
  const rpm = p.moving ? 30 : -95;
  const glow = p.night ? 1 : 0.65;

  return (
    <svg viewBox="0 0 1600 900" className="absolute inset-0 h-full w-full" role="group" aria-label={t('Interior de la cabina del camión')}>
      <defs>
        <filter id="led-blur" x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <linearGradient id="trim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#151d28" />
          <stop offset="1" stopColor="#0a0f16" />
        </linearGradient>
        <linearGradient id="dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26313f" />
          <stop offset="0.18" stopColor="#161f2a" />
          <stop offset="1" stopColor="#080c12" />
        </linearGradient>
        <linearGradient id="console" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1c2633" />
          <stop offset="1" stopColor="#0b1017" />
        </linearGradient>
        <linearGradient id="mirror" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.night ? '#16223a' : '#9cc3e6'} />
          <stop offset="0.55" stopColor={p.night ? '#0d1424' : '#c9d9e4'} />
          <stop offset="0.56" stopColor={p.night ? '#151a20' : '#4b5157'} />
          <stop offset="1" stopColor={p.night ? '#0c0f13' : '#3b4045'} />
        </linearGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        {/* Solo el habitáculo (sin cristales): para que la luz interior no se pinte sobre el paisaje */}
        <clipPath id="interior">
          <path d={FRAME} clipRule="evenodd" />
        </clipPath>
        <radialGradient id="dome" cx="0.5" cy="0" r="1">
          <stop offset="0" stopColor="#ffe7b0" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff1cf" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ledwash" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="var(--led)" stopOpacity={0.28 * glow} />
          <stop offset="1" stopColor="var(--led)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Reflejo tenue del salpicadero en el cristal */}
      <path d={WINDSHIELD} fill={p.night ? 'rgba(34,211,238,0.035)' : 'rgba(255,255,255,0.04)'} />

      {/* Limpiaparabrisas en reposo, largos como en un camión */}
      <g stroke="#0b1016" strokeLinecap="round">
        <path d="M300 572 L760 556" strokeWidth="7" />
        <path d="M840 572 L1300 556" strokeWidth="7" />
        <path d="M300 572 L330 562 M840 572 L870 562" strokeWidth="14" />
      </g>

      {/* Retrovisores (se ven a través de las ventanillas laterales) */}
      <Hotspot label={t('Mirar el retrovisor izquierdo')} onActivate={p.onMirror} testId="cab-mirror">
        <Mirror x={18} flip={false} hazards={p.hazards} />
        <rect x="12" y="214" width="86" height="206" rx="14" className="hot-ring" fill="none" stroke="var(--led)" strokeWidth="3" />
      </Hotspot>
      <Mirror x={1508} flip hazards={p.hazards} />

      {/* Habitáculo */}
      <path d={FRAME} fillRule="evenodd" fill="url(#trim)" />
      <path d="M232 118 L158 580 M1368 118 L1442 580" stroke="#273342" strokeWidth="3" />

      {/* Techo: estantes portaobjetos típicos de camión */}
      <rect x="0" y="0" width="1600" height="104" fill="#0f151d" />
      {[60, 245, 430, 990, 1175, 1360].map((x) => (
        <g key={x}>
          <rect x={x} y="16" width="172" height="74" rx="8" fill="#141c26" stroke="#222d3a" />
          <rect x={x + 66} y="74" width="40" height="7" rx="3" fill="#0a0e14" />
        </g>
      ))}
      <rect x="0" y="96" width="1600" height="16" fill="#0c1118" />
      {/* Tira LED bajo los estantes y luz que baña el habitáculo */}
      <path d="M0 112 H1600 V380 H0Z" fill="url(#ledwash)" className="led-breathe pointer-events-none" />
      <Led d="M40 106 H1560" width={3.5} />

      {/* Luz interior de techo */}
      <g>
        <rect x="1232" y="92" width="76" height="16" rx="8" fill={p.interiorLight ? '#fff3d6' : '#1c2430'} stroke="#2b3747" />
        {p.interiorLight && <ellipse cx="1270" cy="300" rx="520" ry="420" fill="url(#dome)" clipPath="url(#interior)" pointerEvents="none" data-testid="dome-light" />}
      </g>

      {/* Consola de techo: selector de iluminación ambiental */}
      <g>
        <Hotspot label={t('Acercarse a la consola de techo')} onActivate={p.onRoof} testId="cab-roof">
          <rect x="636" y="12" width="328" height="84" rx="12" fill="#121923" stroke="#2a3644" />
          <rect x="632" y="8" width="336" height="92" rx="14" className="hot-ring" fill="none" stroke="var(--led)" strokeWidth="2" />
        </Hotspot>
        <text x="800" y="36" textAnchor="middle" fill="#7c8a9c" fontSize="13" letterSpacing="4">{t('AMBIENTE LED')}</text>
        {(Object.keys(LED_COLORS) as LedColor[]).map((c, i) => {
          const cx = 688 + i * 56;
          const active = p.ledColor === c;
          return (
            <Hotspot key={c} label={t('Luces LED {name}', { name: t(LED_COLORS[c].label) })} onActivate={() => p.onLed(c)} testId={`led-${c}`}>
              <circle cx={cx} cy="64" r="20" fill="transparent" />
              {active && <circle cx={cx} cy="64" r="19" fill="none" stroke={LED_COLORS[c].hex} strokeWidth="2.5" filter="url(#led-blur)" />}
              <circle cx={cx} cy="64" r="13" fill={LED_COLORS[c].hex} opacity={active ? 1 : 0.45} stroke={active ? '#fff' : '#0a0e14'} strokeWidth="2" />
              <circle cx={cx} cy="64" r="22" className="hot-ring" fill="none" stroke="#fff" strokeWidth="2" />
            </Hotspot>
          );
        })}
      </g>

      {/* Parasol izquierdo: se sube o se baja */}
      <Hotspot label={p.visorDown ? t('Subir el parasol') : t('Bajar el parasol')} onActivate={p.onVisor} testId="cab-visor">
        <g style={{ transform: p.visorDown ? 'none' : 'translateY(-58px) scaleY(0.25)', transformOrigin: '430px 112px', transition: 'transform 400ms ease' }}>
          <path d="M252 112 L610 112 L600 182 Q430 192 262 182Z" fill="#111821" opacity="0.94" stroke="#222d3a" />
        </g>
        <rect x="252" y="112" width="358" height="80" fill="transparent" />
      </Hotspot>

      {/* Colgante (se balancea en marcha) */}
      <g className="cab-charm">
        <line x1="1040" y1="112" x2="1040" y2="200" stroke="#3b4756" strokeWidth="2" />
        <circle cx="1040" cy="214" r="15" fill="#0d131b" stroke="var(--led)" strokeWidth="3" />
        <text x="1040" y="219" textAnchor="middle" fill="var(--led)" fontSize="12" fontWeight="700">TL</text>
      </g>

      {/* Salpicadero */}
      <path d="M0 612 L112 600 L158 580 Q800 548 1442 580 L1488 600 L1600 612 V900 H0Z" fill="url(#dash)" />
      <Led d="M150 598 Q800 562 1450 598" width={3} />
      <path d="M150 640 Q800 600 1450 640" stroke="#0a0f15" strokeWidth="2" fill="none" />

      {/* Puertas con tira LED */}
      <path d="M0 640 L120 628 L210 900 H0Z" fill="#0d1218" stroke="#1d2733" />
      <Led d="M20 690 L128 676" width={3} />
      <rect x="40" y="740" width="90" height="34" rx="6" fill="#151c25" stroke="#273342" />
      <path d="M1600 640 L1480 628 L1420 900 H1600Z" fill="#0d1218" stroke="#1d2733" />
      <Led d="M1580 690 L1472 676" width={3} />

      {/* Rejillas de ventilación con contorno LED */}
      {[230, 820].map((x) => (
        <g key={x}>
          <rect x={x} y="626" width="70" height="34" rx="10" fill="#0a0f15" stroke="#26313f" />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={x + 8} y1={634 + i * 6} x2={x + 62} y2={634 + i * 6} stroke="#1c2633" strokeWidth="3" />
          ))}
          <rect x={x - 2} y="624" width="74" height="38" rx="11" fill="none" className="led-core" strokeWidth="1.5" opacity="0.7" />
        </g>
      ))}

      {/* Panel de interruptores: faros, luz interior, emergencia y LED */}
      <g>
        <rect x="150" y="690" width="170" height="70" rx="10" fill="#0e141c" stroke="#222d3a" />
        {SWITCHES.map((sw, i) => {
          const on = p[sw.id];
          const x = 164 + i * 38;
          return (
            <Hotspot key={sw.id} label={on ? t('{name}: encendido', { name: t(sw.label) }) : t('{name}: apagado', { name: t(sw.label) })} onActivate={() => p.onSwitch(sw.id)} testId={`switch-${sw.id}`}>
              <rect x={x} y="704" width="28" height="42" rx="5" fill={on ? '#243042' : '#1a2330'} stroke={on ? '#3f5168' : '#2c3a4b'} />
              <circle cx={x + 14} cy="713" r="3.5" fill={on ? (sw.id === 'hazards' ? '#fbbf24' : '#34d399') : '#334155'} className={on && sw.id === 'hazards' ? 'hazard-blink' : ''} />
              <g transform={`translate(${x + 4} 720) scale(0.85)`}>
                <path d={sw.icon} fill="none" stroke={on ? '#e2e8f0' : '#64748b'} strokeWidth="1.8" strokeLinejoin="round" />
              </g>
              <rect x={x - 2} y="702" width="32" height="46" rx="6" className="hot-ring" fill="none" stroke="var(--led)" strokeWidth="2" />
            </Hotspot>
          );
        })}
      </g>

      {/* Cuadro de instrumentos */}
      <path d="M318 640 Q560 570 802 640 L786 668 Q560 612 334 668Z" fill="#0b1017" />
      <rect x="350" y="650" width="420" height="120" rx="34" fill="#05080d" stroke="#1f2a37" />
      <g>
        <circle cx="440" cy="710" r="50" fill="#0a1019" stroke="#283648" strokeWidth="2" />
        <circle cx="440" cy="710" r="50" fill="none" className="led-core" strokeWidth="2" strokeDasharray="4 10" opacity="0.6" />
        <line x1="440" y1="710" x2="440" y2="670" stroke="#ff6b4a" strokeWidth="4" strokeLinecap="round" transform={`rotate(${needle} 440 710)`} style={{ transition: 'transform 1.2s ease' }} />
        <text x="440" y="748" textAnchor="middle" fill="#64748b" fontSize="11">km/h</text>
        <circle cx="680" cy="710" r="50" fill="#0a1019" stroke="#283648" strokeWidth="2" />
        <circle cx="680" cy="710" r="50" fill="none" className="led-core" strokeWidth="2" strokeDasharray="4 10" opacity="0.6" />
        <line x1="680" y1="710" x2="680" y2="670" stroke="#ff6b4a" strokeWidth="4" strokeLinecap="round" transform={`rotate(${rpm} 680 710)`} style={{ transition: 'transform 1.2s ease' }} />
        <text x="680" y="748" textAnchor="middle" fill="#64748b" fontSize="11">{t('rpm ×100')}</text>
        <rect x="503" y="668" width="114" height="84" rx="10" fill="#071722" stroke="#123445" />
        <text x="560" y="712" textAnchor="middle" fill="#7df9ff" fontSize="34" fontFamily="monospace">{speed}</text>
        <text x="560" y="740" textAnchor="middle" fill="#5eead4" fontSize="14" fontFamily="monospace">{p.localTime}</text>
        {/* Testigos: faros y emergencia */}
        <path d="M506 684 h9 l4 5 -4 5 h-9Z" fill={p.headlights ? '#22c55e' : '#1e293b'} />
        <path d="M604 680 l9 15 h-18Z" fill={p.hazards ? '#ef4444' : '#1e293b'} className={p.hazards ? 'hazard-blink' : ''} />
      </g>

      {/* Volante de camión: grande y casi horizontal */}
      <Hotspot label={t('Claxon')} onActivate={p.onHorn} testId="cab-horn">
        <ellipse cx="560" cy="930" rx="96" ry="58" fill="#121922" stroke="#2b3949" strokeWidth="2" />
        <text x="560" y="922" textAnchor="middle" fill="#3e4c5e" fontSize="16" fontWeight="700" letterSpacing="2">TL</text>
        <ellipse cx="560" cy="930" rx="104" ry="64" className="hot-ring" fill="none" stroke="var(--led)" strokeWidth="3" />
      </Hotspot>
      <g pointerEvents="none">
        <path d="M466 912 L262 878 M654 912 L858 878" stroke="#1a222d" strokeWidth="34" strokeLinecap="round" />
        <path d="M466 900 L262 866 M654 900 L858 866" stroke="#2b3747" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="560" cy="900" rx="312" ry="178" fill="none" stroke="#121821" strokeWidth="50" />
        <ellipse cx="560" cy="900" rx="312" ry="178" fill="none" stroke="#344457" strokeWidth="3" transform="translate(0 -23)" />
        <ellipse cx="560" cy="900" rx="312" ry="178" fill="none" stroke="#06090d" strokeWidth="3" transform="translate(0 23)" />
        {/* Costura LED en la parte superior del aro */}
        <path d="M330 790 Q560 690 790 790" fill="none" className="led-core" strokeWidth="2.5" strokeDasharray="10 8" opacity="0.7" />
      </g>

      {/* Consola central envolvente orientada al conductor */}
      <path d="M890 640 Q1110 610 1340 628 L1400 900 H900Z" fill="url(#console)" stroke="#202b38" />
      <Led d="M900 652 Q1110 622 1330 640" width={2.5} />

      {/* Tacógrafo TL-1: protagonista */}
      <Hotspot label={t('Acercarse al tacógrafo')} onActivate={p.onTacho} testId="cabin-tachograph">
        <ellipse cx="1110" cy="712" rx="230" ry="90" fill="var(--led)" opacity={0.12 * glow} filter="url(#soft)" />
        <rect x="930" y="664" width="360" height="104" rx="12" fill="#1a2533" stroke="#3a4a5e" strokeWidth="2" />
        <rect x="926" y="660" width="368" height="112" rx="15" fill="none" stroke="var(--led)" strokeWidth="3" className={p.pulseTacho ? 'cab-tacho-ring' : 'hot-ring'} />
        <rect x="944" y="676" width="214" height="62" rx="5" fill="#041a24" />
        <text x="954" y="700" fill="#7df9ff" fontFamily="monospace" fontSize="16">{p.displayTitle.slice(0, 20)}</text>
        <text x="954" y="726" fill="#7df9ff" fontFamily="monospace" fontSize="16" opacity="0.9">{p.displayLine.slice(0, 20)}</text>
        {[1170, 1200, 1230, 1260].map((x) => (
          <rect key={x} x={x} y="678" width="24" height="22" rx="4" fill="#2a3849" stroke="#0a0f15" />
        ))}
        <rect x="1170" y="710" width="114" height="10" rx="3" fill="#05090f" />
        {p.cardIn && <rect x="1180" y="711" width="46" height="8" rx="2" fill="#0ea5e9" />}
        <rect x="944" y="746" width="214" height="8" rx="3" fill="#05090f" />
        <circle cx="1278" cy="752" r="5" fill={p.cardIn ? '#34d399' : '#334155'} />
        <text x="1110" y="790" textAnchor="middle" fill="#64748b" fontSize="12" letterSpacing="5">TL-1 EDU</text>
      </Hotspot>

      {/* Selector de marcha: D = en marcha, N = parado */}
      <Hotspot label={p.moving ? t('Selector de marcha: detener el vehículo') : t('Selector de marcha: iniciar la marcha')} onActivate={p.onGear} testId="cab-gear">
        <circle cx="1000" cy="846" r="58" fill="transparent" />
        <circle cx="1000" cy="846" r="40" fill="#121922" stroke="#33445a" strokeWidth="3" />
        <circle cx="1000" cy="846" r="30" fill="#0a0f15" />
        <line x1="1000" y1="846" x2={p.moving ? 1022 : 1000} y2={p.moving ? 826 : 820} stroke="var(--led)" strokeWidth="5" strokeLinecap="round" />
        {[['R', 962, 812], ['N', 1000, 798], ['D', 1040, 812]].map(([l, x, y]) => {
          const lit = (l === 'D' && p.moving) || (l === 'N' && !p.moving);
          return (
            <text key={l as string} x={x as number} y={y as number} textAnchor="middle" fontSize="18" fontWeight="700" fill={lit ? 'var(--led)' : '#475569'}>
              {l}
            </text>
          );
        })}
        <circle cx="1000" cy="846" r="50" className="hot-ring" fill="none" stroke="var(--led)" strokeWidth="2" />
      </Hotspot>

      {/* Taza de café: humea durante las pausas */}
      <g>
        <ellipse cx="1210" cy="862" rx="46" ry="14" fill="#05080d" />
        <path d="M1186 820 h48 l-4 42 h-40Z" fill="#e2e8f0" />
        <path d="M1234 828 q18 4 0 24" fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <rect x="1186" y="836" width="48" height="6" className="led-fill" />
        {p.resting && (
          <g className="cab-steam" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round">
            <path d="M1198 808 q-6 -10 0 -20 q6 -10 0 -20" />
            <path d="M1211 808 q-6 -10 0 -20 q6 -10 0 -20" />
            <path d="M1224 808 q-6 -10 0 -20 q6 -10 0 -20" />
          </g>
        )}
      </g>

      {/* Viñeta para dar profundidad */}
      <rect width="1600" height="900" fill="url(#vignette)" pointerEvents="none" />
      {!p.timeRunning && p.moving && (
        <g pointerEvents="none">
          <rect x="560" y="300" width="480" height="54" rx="27" fill="rgba(5,8,13,0.8)" stroke="var(--led)" />
          <text x="800" y="334" textAnchor="middle" fill="#e2e8f0" fontSize="20">{t('Reloj en pausa · pulsa ▶ para avanzar')}</text>
        </g>
      )}
    </svg>
  );
}
