import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from './en';
import { detectLang, interpolate, translate } from './index';

/** Recorre el código y extrae los identificadores marcados con t(), N_() o msg(). */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) && !p.includes('/i18n/') ? [p] : [];
  });
}

const CALL = /(?:\b(?:t|N_|msg|tr|dyn)\(|\bI\(\s*'(?:title|detail)',)\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;

export function extractIds(): Map<string, string> {
  const ids = new Map<string, string>();
  for (const file of sourceFiles(join(__dirname, '..'))) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(CALL)) {
      const raw = m[1] ?? m[2] ?? '';
      const id = raw.replace(/\\(.)/g, '$1');
      if (!ids.has(id)) ids.set(id, file.replace(/.*\/src\//, 'src/'));
    }
  }
  return ids;
}

describe('traducciones', () => {
  const ids = extractIds();

  it('hay textos marcados para traducir', () => {
    expect(ids.size).toBeGreaterThan(100);
  });

  it('cada texto marcado tiene traducción al inglés', () => {
    const missing = [...ids].filter(([id]) => !(id in en)).map(([id, file]) => `${file}: ${id}`);
    expect(missing).toEqual([]);
  });

  it('las traducciones conservan los marcadores {dato}', () => {
    const bad = Object.entries(en).filter(([es, tr]) => {
      const a = (es.match(/\{\w+\}/g) ?? []).sort().join();
      const b = (tr.match(/\{\w+\}/g) ?? []).sort().join();
      return a !== b;
    });
    expect(bad).toEqual([]);
  });

  it('no sobran entradas en el catálogo', () => {
    const unused = Object.keys(en).filter((id) => !ids.has(id));
    expect(unused).toEqual([]);
  });

  it('interpolación y detección de idioma', () => {
    expect(interpolate('Hola {n}', { n: 3 })).toBe('Hola 3');
    expect(translate('es', 'X {a}', { a: 1 })).toBe('X 1');
    expect(detectLang('es-ES')).toBe('es');
    expect(detectLang('en-GB')).toBe('en');
    expect(detectLang('ro-RO')).toBe('en');
  });
});
