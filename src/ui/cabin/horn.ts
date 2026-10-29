let ctx: AudioContext | null = null;

/** Claxon de dos tonos sintetizado (sin archivos de audio). */
export function playHorn(): void {
  try {
    ctx ??= new AudioContext();
    const t = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
    gain.gain.setValueAtTime(0.18, t + 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    gain.connect(ctx.destination);
    for (const f of [311, 370]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(gain);
      o.start(t);
      o.stop(t + 0.72);
    }
  } catch {
    /* audio no disponible */
  }
}
