import { describe, expect, it } from 'vitest';
import { complianceFor } from '@/simulator/derived';
import { simReducer } from '@/simulator/engine';
import { HOUR } from '@/time-engine/units';
import { formatDateTime } from '@/time-engine/zoned';
import { SCENARIOS, scenarioDef } from './library';

const infringements = (id: string) => {
  const sim = scenarioDef(id)!.build();
  return complianceFor(sim)!.findings.filter((f) => f.severity === 'infringement').map((f) => f.ruleId);
};

describe('biblioteca de escenarios', () => {
  it('todos se construyen sin solapes y con eventos ordenados', () => {
    for (const def of SCENARIOS) {
      const sim = def.build();
      expect(sim.scenario.libraryId).toBe(def.id);
      const ev = sim.timeline.events;
      for (let i = 1; i < ev.length; i++) expect(ev[i]!.start).toBe(ev[i - 1]!.end);
    }
  });

  it('referencia 56 + 34: sin infracciones y todos los objetivos cumplidos', () => {
    const sim = scenarioDef('ref-5634')!.build();
    const r = complianceFor(sim)!;
    expect(r.weeks.map((w) => w.drivingMs / HOUR)).toEqual([56, 34]);
    expect(infringements('ref-5634')).toEqual([]);
    expect(scenarioDef('ref-5634')!.evaluate!(r, sim).every((o) => o.status === 'done')).toBe(true);
  });

  it('semana 2: arranca el lunes 13:30 UTC con 34 h disponibles en total y sin infracciones', () => {
    const sim = scenarioDef('week2-34')!.build();
    expect(formatDateTime(sim.clock.now, 'UTC')).toBe('09/11/2026 13:30');
    const r = complianceFor(sim)!;
    expect(infringements('week2-34')).toEqual([]);
    expect(r.current.biweekDrivingMs).toBe(56 * HOUR);
    expect(r.weeklyRests[0]!.normal).toBe(true);
    // Sigue siendo una simulación jugable: se puede conducir desde el estado cargado.
    let s = simReducer(sim, { type: 'SET_MOVING', moving: true });
    s = simReducer(s, { type: 'ADVANCE_BY', ms: 2 * HOUR });
    expect(complianceFor(s)!.weeks[1]!.drivingMs).toBe(2 * HOUR);
  });

  it('descanso semanal reducido: compensación de 15 h pendiente con fecha fuera del horizonte', () => {
    const sim = scenarioDef('reduced-weekly')!.build();
    const r = complianceFor(sim)!;
    const comp = r.obligations.find((o) => o.ruleId === 'R561-ART8-COMP')!;
    expect(comp.owedMs).toBe(15 * HOUR);
    expect(comp.status).toBe('pending');
    expect(comp.dueAt).toBeGreaterThan(sim.scenario.endsAt);
    expect(infringements('reduced-weekly')).toEqual([]);
  });

  it('encuentra los errores: contiene exactamente los errores previstos', () => {
    expect([...new Set(infringements('find-errors'))].sort()).toEqual(['R561-ART6-DAILY10', 'R561-ART7-CONT', 'R561-ART8-24H']);
  });
});
