import { describe, expect, it } from 'vitest';
import { BEATS_PER_BAR, midiToHz, SONG_BEATS, songNotes } from './song';

describe('música: «Ruta 561»', () => {
  const notes = songNotes();
  it('cada compás tiene bajo en 1 y 3 y rasgueo en 2 y 4', () => {
    const bass = notes.filter((n) => n.voice === 'bass').map((n) => n.beat % BEATS_PER_BAR);
    const chord = notes.filter((n) => n.voice === 'chord').map((n) => n.beat % BEATS_PER_BAR);
    expect(new Set(bass)).toEqual(new Set([0, 2]));
    expect(new Set(chord)).toEqual(new Set([1, 3]));
  });

  it('la melodía está en sol mayor y llena exactamente cada compás', () => {
    const G_MAJOR = new Set([7, 9, 11, 0, 2, 4, 6]);
    const lead = notes.filter((n) => n.voice === 'lead');
    expect(lead.every((n) => G_MAJOR.has(n.midi % 12))).toBe(true);
    const total = lead.reduce((a, n) => a + n.dur, 0);
    expect(total).toBe(SONG_BEATS);
    expect(Math.max(...notes.map((n) => n.beat + n.dur))).toBeLessThanOrEqual(SONG_BEATS);
  });

  it('afinación de referencia', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(57)).toBeCloseTo(220);
  });
});
