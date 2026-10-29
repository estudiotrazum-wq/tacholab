import { describe, expect, it } from 'vitest';
import { RULES, SOURCE_VERSION } from './rules';

describe('catálogo normativo', () => {
  it('cada regla tiene identificador único, referencia y versión de texto contrastada', () => {
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    for (const r of RULES) {
      expect(r.reference).toMatch(/561\/2006/);
      expect(r.textCheckedAgainst).toBe(SOURCE_VERSION);
      expect(r.legallyVerified).toBe(false);
    }
  });
  it('las reglas implementadas apuntan a un test automático', () => {
    for (const r of RULES.filter((x) => x.status === 'preliminary')) expect(r.testFile).toBeTruthy();
  });
});
