import { N_ } from '@/i18n';
/**
 * Cámara de la cabina: puntos de vista como zoom sobre el escenario 2D.
 * Todo se expresa en % del escenario; se limita el encuadre para no mostrar
 * zonas vacías fuera del dibujo.
 */
export type CameraId = 'driver' | 'tacho' | 'mirror' | 'roof';

export interface CameraPreset {
  label: string;
  /** Punto de interés en % del escenario. */
  focus: [number, number];
  scale: number;
}

export const CAMERAS: Record<CameraId, CameraPreset> = {
  driver: { label: N_('Conducción'), focus: [50, 50], scale: 1.06 },
  tacho: { label: N_('Tacógrafo'), focus: [69.4, 79], scale: 2.4 },
  mirror: { label: N_('Retrovisor'), focus: [3.5, 35], scale: 3 },
  roof: { label: N_('Consola de techo'), focus: [50, 7], scale: 2.4 },
};

/** Intervalo de desplazamiento válido para un eje (en % del escenario). */
export function translateRange(focus: number, scale: number): [number, number] {
  return [(100 - focus) * (1 - scale), focus * (scale - 1)];
}

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));

export interface CameraTransform {
  transform: string;
  origin: string;
  translate: [number, number];
}

/**
 * Transformación CSS: escala alrededor del foco y lo lleva al centro.
 * `look` (-1..1) añade un pequeño giro de cabeza (paralaje) en la vista de conducción.
 */
export function cameraTransform(id: CameraId, look: [number, number] = [0, 0]): CameraTransform {
  const { focus, scale } = CAMERAS[id];
  const tx = clamp(50 - focus[0] - look[0] * 2.5, translateRange(focus[0], scale));
  const ty = clamp(50 - focus[1] - look[1] * 1.5, translateRange(focus[1], scale));
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return {
    transform: `translate(${r(tx)}%, ${r(ty)}%) scale(${scale})`,
    origin: `${focus[0]}% ${focus[1]}%`,
    translate: [r(tx), r(ty)],
  };
}
