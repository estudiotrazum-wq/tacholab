import { N_ } from '@/i18n';
/**
 * Datos del fondo «atlas de carreteras»: un mapa estilizado (diseño propio) de la península ibérica,
 * el sur de Francia y el noroeste de Italia. Coordenadas aproximadas en grados (longitud, latitud)
 * proyectadas de forma equirrectangular sobre un lienzo de 1600 × 1000. Es decorativo: no es un mapa
 * de navegación.
 */
export type LonLat = readonly [number, number];

export const ATLAS_W = 1600;
export const ATLAS_H = 1000;
const LON0 = -10.5;
const LAT0 = 46.6;
const SX = 76; // px por grado de longitud
const SY = 98; // px por grado de latitud

export function project([lon, lat]: LonLat): [number, number] {
  return [Math.round((lon - LON0) * SX * 10) / 10, Math.round((LAT0 - lat) * SY * 10) / 10];
}

export const CITIES = {
  lisboa: { name: N_('Lisboa'), at: [-9.14, 38.72] },
  oporto: { name: N_('Oporto'), at: [-8.61, 41.15] },
  coruna: { name: N_('A Coruña'), at: [-8.41, 43.36] },
  valladolid: { name: N_('Valladolid'), at: [-4.72, 41.65] },
  burgos: { name: N_('Burgos'), at: [-3.7, 42.34] },
  bilbao: { name: N_('Bilbao'), at: [-2.93, 43.26] },
  madrid: { name: N_('Madrid'), at: [-3.7, 40.42] },
  zaragoza: { name: N_('Zaragoza'), at: [-0.89, 41.65] },
  barcelona: { name: N_('Barcelona'), at: [2.17, 41.39] },
  valencia: { name: N_('Valencia'), at: [-0.38, 39.47] },
  murcia: { name: N_('Murcia'), at: [-1.13, 37.99] },
  sevilla: { name: N_('Sevilla'), at: [-5.98, 37.39] },
  malaga: { name: N_('Málaga'), at: [-4.42, 36.72] },
  burdeos: { name: N_('Burdeos'), at: [-0.58, 44.84] },
  toulouse: { name: N_('Toulouse'), at: [1.44, 43.6] },
  perpignan: { name: N_('Perpiñán'), at: [2.9, 42.7] },
  montpellier: { name: N_('Montpellier'), at: [3.88, 43.61] },
  marsella: { name: N_('Marsella'), at: [5.37, 43.3] },
  lyon: { name: N_('Lyon'), at: [4.84, 45.76] },
  niza: { name: N_('Niza'), at: [7.26, 43.7] },
  turin: { name: N_('Turín'), at: [7.69, 45.07] },
  genova: { name: N_('Génova'), at: [8.93, 44.41] },
} as const satisfies Record<string, { name: string; at: LonLat }>;
export type CityId = keyof typeof CITIES;

/** Costa continental (de norte a sur por el Atlántico y de vuelta por el Mediterráneo). */
export const COAST: LonLat[] = [
  [-1.75, 47.2], [-1.6, 46.8], [-1.15, 46.15], [-1.05, 45.6], [-1.2, 44.65], [-1.45, 43.6], [-1.78, 43.37],
  [-2.9, 43.42], [-3.8, 43.47], [-4.9, 43.45], [-5.66, 43.57], [-6.9, 43.57], [-7.7, 43.73], [-8.4, 43.4],
  [-9.3, 42.9], [-8.9, 42.2], [-8.85, 41.6], [-8.7, 41.15], [-8.75, 40.6], [-8.95, 39.9], [-9.4, 39.4],
  [-9.5, 38.75], [-9.1, 38.45], [-8.87, 37.95], [-8.95, 37.0], [-7.9, 37.0], [-6.95, 37.2], [-6.3, 36.5],
  [-5.6, 36.0], [-4.4, 36.7], [-3.0, 36.75], [-2.45, 36.83], [-2.0, 36.7], [-1.6, 37.3], [-0.98, 37.6],
  [-0.48, 38.35], [0.2, 38.75], [-0.32, 39.47], [0.0, 39.98], [0.75, 40.75], [1.25, 41.1], [2.2, 41.4],
  [3.2, 41.9], [3.3, 42.3], [3.05, 42.7], [3.4, 43.25], [3.9, 43.5], [4.6, 43.4], [5.3, 43.3], [5.9, 43.1],
  [6.6, 43.2], [7.3, 43.7], [8.2, 43.9], [8.9, 44.4], [9.8, 44.1], [10.6, 43.9], [11, 43.6],
];

export const ISLANDS: LonLat[][] = [
  // Mallorca, Menorca, Ibiza
  [[2.35, 39.55], [2.7, 39.95], [3.2, 39.95], [3.45, 39.7], [3.1, 39.3], [2.7, 39.45]],
  [[3.8, 40.0], [4.3, 40.08], [4.3, 39.85], [3.85, 39.92]],
  [[1.2, 38.95], [1.55, 39.1], [1.6, 38.85], [1.35, 38.82]],
  // Córcega y norte de Cerdeña
  [[8.6, 42.95], [9.4, 43.0], [9.55, 42.2], [9.25, 41.4], [8.8, 41.6], [8.6, 42.2]],
  [[8.2, 41.15], [9.6, 41.1], [9.8, 40.6], [9.7, 39.8], [8.5, 39.8], [8.4, 40.5]],
];

/** Fronteras (decorativas). */
export const BORDERS: LonLat[][] = [
  [[-8.9, 41.9], [-8.2, 42.1], [-6.6, 41.95], [-6.2, 41.6], [-6.9, 41.0], [-6.8, 40.3], [-7.0, 39.6], [-7.5, 39.6], [-7.0, 38.9], [-7.3, 38.4], [-7.0, 38.0], [-7.5, 37.6], [-7.4, 37.2]],
  [[-1.78, 43.37], [-0.7, 42.9], [0.7, 42.85], [1.7, 42.5], [3.15, 42.43]],
  [[7.5, 43.8], [6.9, 44.4], [7.0, 45.0], [6.8, 45.8], [7.0, 46.6]],
];

/** Relieve: centros de las cordilleras (lon, lat), radios en grados y orientación. */
export const RELIEF: { at: LonLat; rx: number; ry: number; rot: number; rings: number }[] = [
  { at: [0.6, 42.7], rx: 2.6, ry: 0.55, rot: -8, rings: 6 }, // Pirineos
  { at: [6.9, 45.4], rx: 1.4, ry: 1.0, rot: 30, rings: 7 }, // Alpes
  { at: [-5.2, 43.05], rx: 2.3, ry: 0.45, rot: 0, rings: 4 }, // Cordillera Cantábrica
  { at: [-4.6, 40.55], rx: 2.0, ry: 0.4, rot: 18, rings: 4 }, // Sistema Central
  { at: [-3.1, 37.1], rx: 1.2, ry: 0.35, rot: 0, rings: 4 }, // Sierra Nevada
  { at: [-2.3, 41.0], rx: 1.6, ry: 0.6, rot: -40, rings: 3 }, // Sistema Ibérico
  { at: [3.3, 44.6], rx: 1.0, ry: 0.9, rot: 0, rings: 4 }, // Macizo Central
];

/** Red de autovías y autopistas (tramos entre ciudades) con su denominación. */
export const MOTORWAYS: { from: CityId; to: CityId; ref: string }[] = [
  { from: 'lisboa', to: 'oporto', ref: 'A1' },
  { from: 'oporto', to: 'coruna', ref: 'AP-9' },
  { from: 'lisboa', to: 'madrid', ref: 'A-5' },
  { from: 'madrid', to: 'zaragoza', ref: 'A-2' },
  { from: 'zaragoza', to: 'barcelona', ref: 'AP-2' },
  { from: 'madrid', to: 'valencia', ref: 'A-3' },
  { from: 'madrid', to: 'sevilla', ref: 'A-4' },
  { from: 'sevilla', to: 'malaga', ref: 'A-92' },
  { from: 'malaga', to: 'murcia', ref: 'A-7' },
  { from: 'murcia', to: 'valencia', ref: 'A-7' },
  { from: 'valencia', to: 'barcelona', ref: 'AP-7' },
  { from: 'madrid', to: 'burgos', ref: 'A-1' },
  { from: 'burgos', to: 'bilbao', ref: 'AP-68' },
  { from: 'valladolid', to: 'burgos', ref: 'A-62' },
  { from: 'oporto', to: 'valladolid', ref: 'A-11' },
  { from: 'bilbao', to: 'burdeos', ref: 'E-70' },
  { from: 'burdeos', to: 'toulouse', ref: 'A62' },
  { from: 'toulouse', to: 'montpellier', ref: 'A61' },
  { from: 'barcelona', to: 'perpignan', ref: 'AP-7' },
  { from: 'perpignan', to: 'montpellier', ref: 'A9' },
  { from: 'montpellier', to: 'marsella', ref: 'A9' },
  { from: 'marsella', to: 'niza', ref: 'A8' },
  { from: 'niza', to: 'genova', ref: 'A10' },
  { from: 'montpellier', to: 'lyon', ref: 'A7' },
  { from: 'lyon', to: 'turin', ref: 'E-70' },
  { from: 'turin', to: 'genova', ref: 'A26' },
  { from: 'zaragoza', to: 'bilbao', ref: 'AP-68' },
];

/** Ruta del camión (resaltada): Madrid → Lyon por Zaragoza, Barcelona y la costa francesa. */
export const ROUTE: CityId[] = ['madrid', 'zaragoza', 'barcelona', 'perpignan', 'montpellier', 'lyon'];
/** Longitud aproximada de la ruta por carretera (km), para situar el camión según el cuentakilómetros. */
export const ROUTE_KM = 1260;

/**
 * Curva suave entre dos puntos: cuadrática con el punto de control desplazado en perpendicular
 * (desplazamiento determinista según los extremos, para que las carreteras no sean rectas).
 */
export function roadPath(a: LonLat, b: LonLat, bend = 0.08): string {
  const [x1, y1] = project(a);
  const [x2, y2] = project(b);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const sign = Math.sin(x1 * 12.9898 + y2 * 78.233) > 0 ? 1 : -1;
  const cx = mx - dy * bend * sign;
  const cy = my + dx * bend * sign;
  return `M${x1} ${y1} Q${Math.round(cx)} ${Math.round(cy)} ${x2} ${y2}`;
}

/** Trazo suavizado (Catmull-Rom a Bézier) por una lista de puntos. */
export function smoothPath(points: LonLat[], closed = false): string {
  const p = points.map(project);
  if (p.length < 2) return '';
  const at = (i: number) => p[closed ? (i + p.length) % p.length : Math.max(0, Math.min(p.length - 1, i))]!;
  let d = `M${p[0]![0]} ${p[0]![1]}`;
  const n = closed ? p.length : p.length - 1;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return closed ? `${d} Z` : d;
}

/** Curva de nivel orgánica: elipse con ondulación determinista. */
export function contourPath(r: (typeof RELIEF)[number], k: number): string {
  const [cx, cy] = project(r.at);
  const rx = r.rx * SX * (k / r.rings);
  const ry = r.ry * SY * (k / r.rings);
  const rot = (r.rot * Math.PI) / 180;
  const pts: string[] = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const wobble = 1 + 0.08 * Math.sin(3 * t + k) + 0.05 * Math.sin(5 * t + cx * 0.01 + k * 2);
    const x = Math.cos(t) * rx * wobble;
    const y = Math.sin(t) * ry * wobble;
    pts.push(`${(cx + x * Math.cos(rot) - y * Math.sin(rot)).toFixed(1)} ${(cy + x * Math.sin(rot) + y * Math.cos(rot)).toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** Fracción recorrida de la ruta según los kilómetros recorridos desde el inicio del escenario. */
export function routeProgress(kmDriven: number): number {
  const f = (kmDriven % ROUTE_KM) / ROUTE_KM;
  return f < 0 ? f + 1 : f;
}
