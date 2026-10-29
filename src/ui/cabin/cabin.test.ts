import { describe, expect, it } from 'vitest';
import { CAMERAS, cameraTransform, translateRange, type CameraId } from './camera';
import { lightingAt, mix } from './lighting';

describe('cámara de la cabina', () => {
  it('el encuadre nunca deja ver fuera del escenario', () => {
    for (const id of Object.keys(CAMERAS) as CameraId[]) {
      for (const look of [[-1, -1], [0, 0], [1, 1]] as [number, number][]) {
        const { translate } = cameraTransform(id, look);
        const { focus, scale } = CAMERAS[id];
        [0, 1].forEach((axis) => {
          const f = focus[axis]!;
          const left = f * (1 - scale) + translate[axis]!;
          const right = f + (100 - f) * scale + translate[axis]!;
          expect(left).toBeLessThanOrEqual(1e-9);
          expect(right).toBeGreaterThanOrEqual(100 - 1e-9);
        });
      }
    }
  });

  it('centra el tacógrafo cuando cabe', () => {
    expect(cameraTransform('tacho').translate).toEqual([-19.4, -29]);
  });

  it('con escala 1 no hay margen de desplazamiento', () => {
    expect(translateRange(30, 1)).toEqual([0, 0]);
  });

  it('el paralaje desplaza la vista de conducción en sentido contrario al cursor', () => {
    const [x] = cameraTransform('driver', [1, 0]).translate;
    expect(x).toBeLessThan(0);
  });
});

describe('iluminación del paisaje', () => {
  it('noche cerrada, pleno día y transición suave', () => {
    expect(lightingAt(2).daylight).toBe(0);
    expect(lightingAt(13).daylight).toBe(1);
    const dawn = lightingAt(7.5).daylight;
    expect(dawn).toBeGreaterThan(0.2);
    expect(dawn).toBeLessThan(0.8);
    expect(lightingAt(2).night).toBe(true);
    expect(lightingAt(13).night).toBe(false);
  });

  it('el tono de atardecer es máximo en la puesta de sol y nulo a mediodía', () => {
    expect(lightingAt(18.5).dusk).toBe(1);
    expect(lightingAt(13).dusk).toBe(0);
  });

  it('el sol está alto a mediodía y oculto de noche', () => {
    expect(lightingAt(13).sun.y).toBeLessThan(lightingAt(9).sun.y);
    expect(lightingAt(23).sun.visible).toBe(false);
  });

  it('mezcla de colores', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#102030', '#102030', 0.3)).toBe('#102030');
  });
});
