import { describe, expect, it } from 'vitest';
import { ATLAS_H, ATLAS_W, CITIES, MOTORWAYS, project, ROUTE, ROUTE_KM, routeProgress, roadPath, smoothPath, COAST } from './atlas';

describe('fondo atlas', () => {
  it('todas las ciudades caen dentro del lienzo', () => {
    for (const c of Object.values(CITIES)) {
      const [x, y] = project(c.at);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(ATLAS_W);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(ATLAS_H);
    }
  });

  it('Madrid queda al sur de Bilbao y al oeste de Barcelona', () => {
    const [mx, my] = project(CITIES.madrid.at);
    const [, by] = project(CITIES.bilbao.at);
    const [bx] = project(CITIES.barcelona.at);
    expect(my).toBeGreaterThan(by);
    expect(mx).toBeLessThan(bx);
  });

  it('las autovías y la ruta usan ciudades existentes', () => {
    for (const m of MOTORWAYS) expect(roadPath(CITIES[m.from].at, CITIES[m.to].at)).toMatch(/^M[\d.]+ [\d.]+ Q/);
    expect(ROUTE[0]).toBe('madrid');
    expect(smoothPath(COAST)).toMatch(/^M.* C/);
  });

  it('el camión recorre la ruta en bucle según los kilómetros', () => {
    expect(routeProgress(0)).toBe(0);
    expect(routeProgress(ROUTE_KM / 2)).toBeCloseTo(0.5);
    expect(routeProgress(ROUTE_KM + 63)).toBeCloseTo(0.05);
  });
});
