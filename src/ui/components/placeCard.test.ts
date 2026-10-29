import { describe, expect, it } from 'vitest';
import { placeCard } from './TutorialCoach';

const view = { w: 1440, h: 900, top: 0, bottom: 0 };
const card = { w: 384, h: 240 };
const overlaps = (p: { top: number; left: number }, r: { top: number; left: number; width: number; height: number }) =>
  p.left < r.left + r.width && r.left < p.left + card.w && p.top < r.top + r.height && r.top < p.top + card.h;

describe('tutorial: colocación de la tarjeta', () => {
  it('no tapa ni la pieza señalada ni el tacógrafo', () => {
    const tacho = { top: 140, left: 520, width: 560, height: 260 };
    const accel = { top: 520, left: 720, width: 330, height: 60 };
    const p = placeCard(card, accel, [tacho, accel], view)!;
    expect(p).not.toBeNull();
    expect(overlaps(p, tacho)).toBe(false);
    expect(overlaps(p, accel)).toBe(false);
  });

  it('prefiere colocarse debajo de la pieza si cabe', () => {
    const target = { top: 100, left: 600, width: 200, height: 60 };
    expect(placeCard(card, target, [target], view)).toEqual({ top: 174, left: 508 });
  });

  it('devuelve null si no hay hueco libre (la interfaz la minimiza)', () => {
    const big = { top: 40, left: 20, width: 1400, height: 820 };
    expect(placeCard(card, big, [big], view)).toBeNull();
  });
});
