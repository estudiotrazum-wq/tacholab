/**
 * «Ruta 561»: melodía country original para TachoLab (composición propia, sin muestras ni obras de terceros).
 * Ritmo de «boom-chick» a 104 ppm en sol mayor: bajo en los tiempos 1 y 3, rasgueo en 2 y 4 y una
 * melodía tipo banjo en la escala pentatónica. Es lógica pura: devuelve las notas de un ciclo.
 */
export interface SongNote {
  /** Tiempo de inicio en pulsos desde el comienzo del ciclo. */
  beat: number;
  /** Nota MIDI (60 = do central). */
  midi: number;
  /** Duración en pulsos. */
  dur: number;
  voice: 'bass' | 'chord' | 'lead';
}

export const SONG_BPM = 104;
export const BEATS_PER_BAR = 4;

/** Acordes: raíz MIDI y tríada (sol, do y re mayor). */
const CHORDS = {
  G: { root: 43, fifth: 50, triad: [55, 59, 62] },
  C: { root: 48, fifth: 43, triad: [55, 60, 64] },
  D: { root: 50, fifth: 45, triad: [54, 57, 62] },
} as const;
type ChordName = keyof typeof CHORDS;

/** Progresión de 16 compases (I-I-IV-I-V-V-I-I · I-IV-I-V-I-IV-V-I). */
export const PROGRESSION: readonly ChordName[] = ['G', 'G', 'C', 'G', 'D', 'D', 'G', 'G', 'G', 'C', 'G', 'D', 'G', 'C', 'D', 'G'];

/** Melodía: por compás, pares [corchea dentro del compás (0-7), nota MIDI, duración en corcheas]. */
const LEAD: readonly (readonly [number, number, number])[][] = [
  [[0, 67, 2], [2, 71, 1], [3, 74, 1], [4, 76, 2], [6, 74, 2]],
  [[0, 71, 2], [2, 69, 1], [3, 67, 1], [4, 69, 4]],
  [[0, 72, 2], [2, 76, 2], [4, 74, 1], [5, 72, 1], [6, 69, 2]],
  [[0, 71, 3], [3, 67, 1], [4, 64, 2], [6, 67, 2]],
  [[0, 66, 2], [2, 69, 2], [4, 74, 2], [6, 72, 2]],
  [[0, 71, 2], [2, 69, 2], [4, 66, 2], [6, 62, 2]],
  [[0, 67, 1], [1, 69, 1], [2, 71, 2], [4, 74, 1], [5, 71, 1], [6, 69, 2]],
  [[0, 67, 6], [6, 62, 2]],
  [[0, 71, 1], [1, 74, 1], [2, 79, 2], [4, 76, 2], [6, 74, 2]],
  [[0, 76, 2], [2, 72, 2], [4, 69, 2], [6, 72, 2]],
  [[0, 71, 2], [2, 67, 2], [4, 71, 2], [6, 74, 2]],
  [[0, 69, 2], [2, 66, 2], [4, 62, 2], [6, 66, 2]],
  [[0, 67, 2], [2, 71, 1], [3, 74, 1], [4, 79, 2], [6, 76, 2]],
  [[0, 72, 2], [2, 76, 2], [4, 72, 2], [6, 69, 2]],
  [[0, 66, 1], [1, 69, 1], [2, 74, 2], [4, 72, 2], [6, 66, 2]],
  [[0, 67, 8]],
];

export const SONG_BARS = PROGRESSION.length;
export const SONG_BEATS = SONG_BARS * BEATS_PER_BAR;

export function songNotes(): SongNote[] {
  const notes: SongNote[] = [];
  PROGRESSION.forEach((name, bar) => {
    const c = CHORDS[name];
    const b0 = bar * BEATS_PER_BAR;
    // Boom (bajo alterno raíz-quinta) y chick (rasgueo corto)
    notes.push({ beat: b0, midi: c.root, dur: 0.9, voice: 'bass' });
    notes.push({ beat: b0 + 2, midi: c.fifth, dur: 0.9, voice: 'bass' });
    for (const off of [1, 3]) for (const m of c.triad) notes.push({ beat: b0 + off, midi: m, dur: 0.35, voice: 'chord' });
    for (const [eighth, midi, len] of LEAD[bar]!) notes.push({ beat: b0 + eighth / 2, midi, dur: len / 2, voice: 'lead' });
  });
  return notes.sort((a, b) => a.beat - b.beat);
}

export const midiToHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
