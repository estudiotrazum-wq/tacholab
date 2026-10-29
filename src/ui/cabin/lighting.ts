/**
 * Iluminación del paisaje en función de la hora local (con decimales).
 * Curva aproximada y sin estaciones: amanecer 07:30, atardecer 18:30.
 * Funciones puras para poder probarlas.
 */

export const SUNRISE = 7.5;
export const SUNSET = 18.5;
const TWILIGHT = 1.25; // horas de transición

export interface Lighting {
  /** 0 = noche cerrada, 1 = pleno día. */
  daylight: number;
  /** 0..1: intensidad del tono anaranjado del amanecer/atardecer. */
  dusk: number;
  sky: [string, string, string];
  ground: string;
  mountains: [string, string];
  haze: string;
  sun: { x: number; y: number; visible: boolean };
  starsOpacity: number;
  /** El interior se considera nocturno (LED más intensos, cuadro iluminado). */
  night: boolean;
}

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const k = Math.min(1, Math.max(0, t));
  const ch = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, '0');
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
}

const NIGHT = { sky: ['#02040b', '#0b1530', '#1a2440'], ground: '#0a120f', mountains: ['#0b1324', '#101a2d'] } as const;
const DAY = { sky: ['#3f7fc4', '#8fbde6', '#d6e8f2'], ground: '#5f7d4a', mountains: ['#7f97ad', '#97abbc'] } as const;
const DUSK = { sky: ['#27325c', '#c0727a', '#f6b47a'], ground: '#3d4a33', mountains: ['#4a3f5f', '#5d4f6b'] } as const;

export function lightingAt(hour: number): Lighting {
  const h = ((hour % 24) + 24) % 24;
  const daylight = h < 12 ? smooth((h - (SUNRISE - TWILIGHT / 2)) / TWILIGHT) : 1 - smooth((h - (SUNSET - TWILIGHT / 2)) / TWILIGHT);
  const distance = Math.min(Math.abs(h - SUNRISE), Math.abs(h - SUNSET));
  const dusk = Math.max(0, 1 - distance / 1.5);
  const base = (i: 0 | 1 | 2) => mix(mix(NIGHT.sky[i], DAY.sky[i], daylight), DUSK.sky[i], dusk * 0.85);
  const progress = (h - SUNRISE) / (SUNSET - SUNRISE);
  return {
    daylight,
    dusk,
    sky: [base(0), base(1), base(2)],
    ground: mix(mix(NIGHT.ground, DAY.ground, daylight), DUSK.ground, dusk * 0.6),
    mountains: [
      mix(mix(NIGHT.mountains[0], DAY.mountains[0], daylight), DUSK.mountains[0], dusk * 0.7),
      mix(mix(NIGHT.mountains[1], DAY.mountains[1], daylight), DUSK.mountains[1], dusk * 0.7),
    ],
    haze: dusk > 0.3 ? `rgba(255,170,110,${(0.25 + dusk * 0.25).toFixed(2)})` : `rgba(${daylight > 0.5 ? '230,240,250' : '40,60,110'},${(0.3 + daylight * 0.25).toFixed(2)})`,
    sun: { x: 12 + progress * 76, y: 40 - Math.sin(Math.PI * Math.min(1, Math.max(0, progress))) * 28, visible: progress > -0.04 && progress < 1.04 },
    starsOpacity: 1 - smooth(daylight * 2),
    night: daylight < 0.35,
  };
}
