import { midiToHz, SONG_BEATS, SONG_BPM, songNotes, type SongNote } from './song';

/**
 * Sonido sintetizado con Web Audio: no usa grabaciones. Efectos del tacógrafo (teclas, tarjeta,
 * impresora, avisos), motor diésel del camión (arranque, ralentí, aceleración, freno de aire) y la
 * música de ambiente. El contexto de audio se crea con el primer gesto del usuario (política de
 * reproducción automática de los navegadores).
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private engine: { osc: OscillatorNode[]; filter: BiquadFilterNode; out: GainNode; lfo: OscillatorNode; lfoGain: GainNode } | null = null;
  private lastKmh = 0;
  private music: { timer: number; startAt: number; nextIndex: number; loop: number; notes: SongNote[] } | null = null;
  private settings = { sfx: true, music: false, volume: 0.7, musicVolume: 0.45 };
  private onUnlock: (() => void) | null = null;

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Crea o reanuda el contexto de audio; debe llamarse desde un gesto del usuario. */
  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.connect(this.master);
        this.musicBus = this.ctx.createGain();
        this.musicBus.connect(this.master);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, len);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.apply();
        this.onUnlock?.();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  /** Función que se llama una vez creado el audio (para sincronizar motor y música con el estado). */
  whenUnlocked(fn: () => void): void {
    this.onUnlock = fn;
    if (this.ctx) fn();
  }

  configure(s: Partial<typeof this.settings>): void {
    this.settings = { ...this.settings, ...s };
    this.apply();
  }

  private apply(): void {
    if (!this.ctx || !this.master || !this.sfxBus || !this.musicBus) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.volume, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx ? 1 : 0, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.musicVolume * 0.6, t, 0.1);
    if (this.settings.music) this.startMusic();
    else this.stopMusic();
  }

  // ------------------------------------------------------------ utilidades

  private tone(freq: number, at: number, dur: number, gain: number, type: OscillatorType = 'square', bus = this.sfxBus): void {
    if (!this.ctx || !bus) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(bus);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  private noise(at: number, dur: number, gain: number, filter: { type: BiquadFilterType; freq: number; q?: number }, bus = this.sfxBus): void {
    if (!this.ctx || !bus || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = filter.type;
    f.frequency.value = filter.freq;
    f.Q.value = filter.q ?? 1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(at, Math.random() * 0.5);
    src.stop(at + dur + 0.02);
  }

  private get now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  // ------------------------------------------------------------ tacógrafo

  /** Pitido corto de tecla, como el de los tacógrafos al pulsar. */
  beep(): void {
    if (!this.ready) return;
    this.tone(2600, this.now, 0.06, 0.08);
  }

  /** Aviso: tres pitidos. */
  warning(): void {
    if (!this.ready) return;
    for (let i = 0; i < 3; i++) this.tone(1800, this.now + i * 0.22, 0.14, 0.12);
  }

  /** Tarjeta: clic mecánico y motor del lector. */
  card(direction: 'in' | 'out'): void {
    if (!this.ready || !this.ctx) return;
    const t = this.now;
    this.noise(t, 0.05, 0.25, { type: 'highpass', freq: 2500 });
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(direction === 'in' ? 70 : 110, t + 0.05);
    o.frequency.linearRampToValueAtTime(direction === 'in' ? 110 : 70, t + 0.4);
    g.gain.setValueAtTime(0, t + 0.05);
    g.gain.linearRampToValueAtTime(0.05, t + 0.1);
    g.gain.linearRampToValueAtTime(0, t + 0.42);
    o.connect(g).connect(this.sfxBus!);
    o.start(t + 0.05);
    o.stop(t + 0.45);
    this.noise(t + 0.42, 0.04, 0.2, { type: 'highpass', freq: 3000 });
  }

  /** Impresora térmica: zumbido de avance de papel. */
  printer(): void {
    if (!this.ready || !this.ctx) return;
    const t = this.now;
    for (let i = 0; i < 28; i++) this.noise(t + i * 0.05, 0.035, 0.07, { type: 'bandpass', freq: 3200, q: 4 });
    this.tone(180, t, 1.4, 0.02, 'sawtooth');
  }

  /** Giro de la llave. */
  keyClick(): void {
    if (!this.ready) return;
    this.noise(this.now, 0.03, 0.3, { type: 'highpass', freq: 4000 });
  }

  // ------------------------------------------------------------ motor

  /** Arranque: motor de arranque unos instantes y después el ralentí. */
  engineStart(): void {
    if (!this.ready || !this.ctx || this.engine) return;
    const t = this.now;
    // Motor de arranque: zumbido con golpes de compresión
    const crank = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    crank.type = 'sawtooth';
    crank.frequency.value = 150;
    lfo.frequency.value = 9;
    lg.gain.value = 0.05;
    cg.gain.value = 0.06;
    lfo.connect(lg).connect(cg.gain);
    crank.connect(cg).connect(this.sfxBus!);
    crank.start(t);
    lfo.start(t);
    crank.stop(t + 1.1);
    lfo.stop(t + 1.1);
    this.noise(t + 1.05, 0.35, 0.18, { type: 'lowpass', freq: 400 });
    this.engineLoop(t + 1.05);
  }

  private engineLoop(at: number): void {
    if (!this.ctx) return;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(0.16, at + 0.3);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    filter.Q.value = 2;
    // Pulsos de combustión: la ganancia oscila a la frecuencia de encendido
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'square';
    lfoGain.gain.value = 0.06;
    lfo.connect(lfoGain).connect(out.gain);
    const osc = [this.ctx.createOscillator(), this.ctx.createOscillator()];
    osc[0]!.type = 'sawtooth';
    osc[1]!.type = 'square';
    osc.forEach((o) => o.connect(filter));
    filter.connect(out).connect(this.sfxBus!);
    osc.forEach((o) => o.start(at));
    lfo.start(at);
    this.engine = { osc, filter, out, lfo, lfoGain };
    this.setEngineRpm(600, at, 0.01);
  }

  /** Régimen del motor según la velocidad, con «cambios de marcha» cada 15 km/h. */
  private rpmFor(kmh: number): number {
    if (kmh <= 0) return 600;
    const gear = Math.min(5, Math.floor(kmh / 18));
    const within = (kmh - gear * 18) / 18;
    return 1000 + Math.min(1, within) * 700 - gear * 20;
  }

  private setEngineRpm(rpm: number, at = this.now, tc = 0.35): void {
    if (!this.engine) return;
    const fire = rpm / 20; // 6 cilindros, 4 tiempos
    this.engine.osc[0]!.frequency.setTargetAtTime(fire, at, tc);
    this.engine.osc[1]!.frequency.setTargetAtTime(fire * 0.502, at, tc);
    this.engine.lfo.frequency.setTargetAtTime(fire / 2, at, tc);
    this.engine.filter.frequency.setTargetAtTime(220 + rpm * 0.35, at, tc);
  }

  /** Velocidad del camión: sube el régimen; al acelerar se oye el turbo y al frenar el aire. */
  engineSpeed(kmh: number): void {
    if (!this.ready) return;
    const prev = this.lastKmh;
    this.lastKmh = kmh;
    if (!this.engine) return;
    this.setEngineRpm(this.rpmFor(kmh));
    const t = this.now;
    if (kmh > prev + 4) {
      this.engine.out.gain.setTargetAtTime(0.22, t, 0.1);
      this.engine.out.gain.setTargetAtTime(0.16, t + 0.9, 0.4);
      this.noise(t + 0.1, 1.1, 0.04, { type: 'bandpass', freq: 2200, q: 6 }); // turbo
    }
    if (prev > 0 && kmh === 0) this.airBrake();
  }

  airBrake(): void {
    if (!this.ready) return;
    this.noise(this.now + 0.2, 0.7, 0.12, { type: 'highpass', freq: 2500 });
  }

  engineStop(): void {
    if (!this.engine || !this.ctx) return;
    const e = this.engine;
    this.engine = null;
    const t = this.now;
    this.setEngineRpmOn(e, 200, t);
    e.out.gain.cancelScheduledValues(t);
    e.out.gain.setTargetAtTime(0, t, 0.25);
    e.osc.forEach((o) => o.stop(t + 1.5));
    e.lfo.stop(t + 1.5);
    this.lastKmh = 0;
  }

  private setEngineRpmOn(e: NonNullable<typeof this.engine>, rpm: number, at: number): void {
    e.osc[0]!.frequency.setTargetAtTime(rpm / 20, at, 0.3);
    e.osc[1]!.frequency.setTargetAtTime(rpm / 40, at, 0.3);
  }

  get engineRunning(): boolean {
    return this.engine !== null;
  }

  // ------------------------------------------------------------ música

  private startMusic(): void {
    if (!this.ctx || this.music) return;
    const notes = songNotes();
    this.music = { timer: 0, startAt: this.now + 0.15, nextIndex: 0, loop: 0, notes };
    const tick = () => this.scheduleMusic();
    tick();
    this.music.timer = window.setInterval(tick, 50);
  }

  private stopMusic(): void {
    if (!this.music) return;
    window.clearInterval(this.music.timer);
    this.music = null;
  }

  /** Programa las notas de los próximos 200 ms (planificador con margen). */
  private scheduleMusic(): void {
    const m = this.music;
    if (!m || !this.ctx) return;
    const spb = 60 / SONG_BPM;
    const horizon = this.now + 0.2;
    for (;;) {
      if (m.nextIndex >= m.notes.length) {
        m.nextIndex = 0;
        m.loop += 1;
      }
      const n = m.notes[m.nextIndex]!;
      // Ligero swing en las corcheas a contratiempo
      const swing = n.beat % 1 === 0.5 ? 0.06 * spb : 0;
      const at = m.startAt + (m.loop * SONG_BEATS + n.beat) * spb + swing;
      if (at > horizon) break;
      if (at >= this.now - 0.05) this.playNote(n, at, n.dur * spb);
      m.nextIndex += 1;
    }
  }

  private playNote(n: SongNote, at: number, dur: number): void {
    if (!this.ctx || !this.musicBus) return;
    const f = midiToHz(n.midi);
    if (n.voice === 'bass') {
      this.tone(f, at, Math.min(dur, 0.5), 0.35, 'triangle', this.musicBus);
      return;
    }
    if (n.voice === 'chord') {
      // Rasgueo: cuerdas escalonadas, cortas y apagadas
      const stagger = (n.midi % 3) * 0.012;
      this.pluck(f, at + stagger, 0.18, 0.06, 2400);
      return;
    }
    // Melodía tipo banjo: ataque brillante y caída rápida
    this.pluck(f, at, Math.min(0.5, dur + 0.15), 0.11, 4200);
    this.pluck(f * 2, at, 0.12, 0.025, 6000);
  }

  private pluck(freq: number, at: number, dur: number, gain: number, bright: number): void {
    if (!this.ctx || !this.musicBus) return;
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(bright, at);
    f.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.5), at + dur);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(f).connect(g).connect(this.musicBus);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  get musicPlaying(): boolean {
    return this.music !== null;
  }
}

export const sound = new SoundEngine();
