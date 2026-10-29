import { describe, expect, it } from 'vitest';
import { fit, lcdLength, lcdPlain, LCD_COLS } from './display';

describe('pantalla LCD de 2 × 20', () => {
  it('cada pictograma ocupa una celda y se rellena hasta 20', () => {
    const l = fit('06:00{L} {D}{C}');
    expect(lcdLength(l)).toBe(LCD_COLS);
    expect(lcdPlain(l).startsWith('06:00⊙ ◉▣')).toBe(true);
  });
  it('recorta sin partir un pictograma', () => {
    const l = fit('x'.repeat(19) + '{D}{D}');
    expect(lcdLength(l)).toBe(LCD_COLS);
    expect(l.endsWith('{D}')).toBe(true);
  });
});
