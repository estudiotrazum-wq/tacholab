import { t } from '@/i18n';
import type { AssistTarget } from '@/academy/assist';
import { useSimStore } from '@/simulator/store';
import { DEFAULT_SPEED_KMH, ODOMETER_START_KM } from '@/simulator/engine';

const MAX = 120;
/** Ángulo de la aguja: arco de 240° (de −120° a +120°). */
const angle = (v: number) => -120 + (Math.min(v, MAX) / MAX) * 240;

/** Velocímetro genérico con cuentakilómetros y estado del motor. */
export function Speedometer({ highlight, compact = false }: { highlight: AssistTarget; compact?: boolean }) {
  const sim = useSimStore((s) => s.sim);
  const moving = sim.vehicle.moving;
  const ignition = sim.vehicle.ignition ?? 'off';
  const speed = moving ? (sim.vehicle.speedKmh ?? DEFAULT_SPEED_KMH) : 0;
  const km = sim.vehicle.odometerKm ?? ODOMETER_START_KM;

  return (
    <section aria-label={t('Vehículo')} className={`glass rounded-2xl p-4 ${compact ? 'flex items-center gap-4' : ''}`}>
      <svg viewBox="0 0 200 170" className={compact ? 'h-28 w-32 shrink-0' : 'mx-auto w-full max-w-[15rem]'} role="img" aria-label={t('Velocidad {v} km/h', { v: speed })}>
        <defs>
          <linearGradient id="arc" x1="0" x2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        {/* Arco de fondo y arco recorrido */}
        <path d="M 30 140 A 80 80 0 1 1 170 140" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
        {speed > 0 && <path d="M 30 140 A 80 80 0 1 1 170 140" fill="none" stroke="url(#arc)" strokeWidth="12" strokeLinecap="round" pathLength={100} strokeDasharray={`${(Math.min(speed, MAX) / MAX) * 100} 100`} style={{ transition: 'stroke-dasharray 900ms ease' }} />}
        {[0, 20, 40, 60, 80, 100, 120].map((v) => {
          const a = ((angle(v) - 90) * Math.PI) / 180;
          return (
            <text key={v} x={100 + Math.cos(a) * 58} y={100 + Math.sin(a) * 58 + 4} textAnchor="middle" fontSize="11" fill="#94a3b8">{v}</text>
          );
        })}
        <g style={{ transform: `rotate(${angle(speed)}deg)`, transformOrigin: '100px 100px', transition: 'transform 900ms cubic-bezier(.3,1.4,.5,1)' }}>
          <line x1="100" y1="100" x2="100" y2="38" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="#0b1220" stroke="#f8fafc" strokeWidth="2" />
        <text x="100" y="132" textAnchor="middle" fontSize="26" fontWeight="600" fill="#f8fafc" fontFamily="ui-monospace, monospace">{speed}</text>
        <text x="100" y="147" textAnchor="middle" fontSize="10" fill="#94a3b8">km/h</text>
        <text x="100" y="165" textAnchor="middle" fontSize="11" fill="#cbd5e1" fontFamily="ui-monospace, monospace" data-testid="odometer">{km.toFixed(1)} km</text>
      </svg>

      <div className={compact ? 'flex-1' : 'mt-3'}>
        <div className={`flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-xs ${highlight === 'VEHICLE' ? 'assist-target' : ''}`} data-testid="vehicle-state">
          <span className={`h-2.5 w-2.5 rounded-full ${moving ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : ignition === 'running' ? 'bg-amber-400' : 'bg-slate-600'}`} aria-hidden="true" />
          {moving ? t('En marcha') : ignition === 'running' ? t('Motor en ralentí') : ignition === 'on' ? t('Contacto puesto') : t('Motor apagado')}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          {moving
            ? t('El tacógrafo registra conducción. Baja el acelerador a 0 para detenerte.')
            : ignition === 'running'
              ? t('Sube el acelerador para empezar a circular.')
              : t('Gira la llave a II para arrancar el motor.')}
        </p>
      </div>
    </section>
  );
}
