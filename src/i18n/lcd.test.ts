import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { lcdLength, lcdPlain, renderDisplay } from '@/tachograph/display';
import { simReducer, type SimAction } from '@/simulator/engine';
import { createInitialSim, type SimState } from '@/simulator/state';
import { COUNTRIES, MENU, SPAIN_REGIONS, type Button } from '@/tachograph/types';
import { en } from './en';
import { setLang } from './index';

/** Textos del visor: los que aparecen en display.ts y types.ts (menús, países, regiones). */
function lcdIds(): string[] {
  const CALL = /\b(?:t|N_)\(\s*'((?:[^'\\]|\\.)*)'/g;
  const ids = new Set<string>();
  for (const f of ['tachograph/display.ts', 'tachograph/types.ts']) {
    for (const m of readFileSync(join(__dirname, '..', f), 'utf8').matchAll(CALL)) ids.add(m[1]!.replace(/\\(.)/g, '$1'));
  }
  return [...ids];
}

describe('visor en inglés', () => {
  afterEach(() => setLang('es'));

  it('los textos del visor caben en su espacio (20 columnas; países y regiones 15; menús principales 16)', () => {
    const limit = (id: string) =>
      COUNTRIES.some((c) => c.name === id) || SPAIN_REGIONS.some((r) => r.name === id) ? 15
      : MENU.some((g) => g.label === id) ? 16
      : 20;
    const tooLong = lcdIds()
      .filter((id) => !/\{(?!D\}|W\}|A\}|R\}|C\}|L\}|U\}|\?\}|M\}|O\}|F\}|X\})\w+\}/.test(id))
      .filter((id) => lcdLength(en[id]!) > limit(id))
      .map((id) => `${id} → ${en[id]}`);
    expect(tooLong).toEqual([]);
  });

  it('todas las pantallas del visor tienen exactamente 20 columnas en inglés', () => {
    setLang('en');
    const run = (s: SimState, ...a: SimAction[]) => a.reduce(simReducer, s);
    const press = (...b: Button[]): SimAction[] => b.map((button) => ({ type: 'PRESS', button }));
    let s = run(createInitialSim(), { type: 'INSERT_CARD', cardId: 'card-a' }, ...press('OK', 'OK', 'OK', 'OK'), { type: 'DISMISS_NOTICE' });
    for (let i = 0; i < 6; i++) {
      expect(renderDisplay(s).lines.every((l) => lcdLength(l) === 20)).toBe(true);
      s = run(s, ...press('DOWN'));
    }
    // Menú: todos los menús principales y sus funciones
    s = run(s, ...press('OK'));
    for (let g = 0; g < MENU.length; g++) {
      expect(lcdPlain(renderDisplay(s).lines[1]).trimEnd().length).toBeLessThanOrEqual(20);
      s = run(s, ...press('DOWN'));
    }
  });

  it('procedimiento de inserción en inglés', () => {
    setLang('en');
    const run = (s: SimState, ...a: SimAction[]) => a.reduce(simReducer, s);
    const press = (...b: Button[]): SimAction[] => b.map((button) => ({ type: 'PRESS', button }));
    let s = run(createInitialSim(), { type: 'INSERT_CARD', cardId: 'card-a' }, ...press('OK'));
    const lines = () => renderDisplay(s).lines.map(lcdPlain);
    expect(lines()[0]).toContain('Last withdrawal');
    expect(lines()[1]).toContain('first use');
    s = run(s, ...press('OK'));
    expect(lines()[0]).toContain('Start country');
    expect(lines()[1]).toContain('Spain');
    s = run(s, ...press('OK'));
    expect(lines()[1]).toContain('Andalusia');
    s = run(s, ...press('OK'));
    expect(lines()[0]).toContain('Ready to drive');
    expect(renderDisplay(s).lines.every((l) => lcdLength(l) === 20)).toBe(true);
  });
});
