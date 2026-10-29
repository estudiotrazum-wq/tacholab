import { midiToHz, SONG_BEATS, SONG_BPM, songNotes, type SongNote } from './song';

/** Nivel del motor al ralentí (antes del volumen del motor). */
const ENGINE_BASE_GAIN = 0.07;

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
  private engineBus: GainNode | null = null;
  private engine: { osc: OscillatorNode[]; filter: BiquadFilterNode; out: GainNode; lfo: OscillatorNode; lfoGain: GainNode; rumble: AudioBufferSourceNode } | null = null;
  private lastKmh = 0;
  private music: { timer: number; startAt: number; nextIndex: number; loop: number; notes: SongNote[] } | null = null;
  private settings = { sfx: true, music: false, volume: 0.7, musicVolume: 0.45, engineVolume: 0.5 };
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
        this.engineBus = this.ctx.createGain();
        this.engineBus.connect(this.sfxBus);
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
    this.engineBus?.gain.setTargetAtTime(this.settings.engineVolume, t, 0.1);
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

  /**
   * Arranque suave: un motor de arranque discreto y grave unos instantes y después el ralentí,
   * que entra en fundido.
   */
  engineStart(): void {
    if (!this.ready || !this.ctx || this.engine || !this.engineBus) return;
    const t = this.now;
    const crank = this.ctx.createOscillator();
    const cf = this.ctx.createBiquadFilter();
    const cg = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    crank.type = 'triangle';
    crank.frequency.value = 95;
    cf.type = 'lowpass';
    cf.frequency.value = 500;
    lfo.frequency.value = 6.5;
    lg.gain.value = 0.018;
    cg.gain.setValueAtTime(0, t);
    cg.gain.linearRampToValueAtTime(0.03, t + 0.08);
    cg.gain.setValueAtTime(0.03, t + 0.85);
    cg.gain.linearRampToValueAtTime(0, t + 1.05);
    lfo.connect(lg).connect(cg.gain);
    crank.connect(cf).connect(cg).connect(this.engineBus);
    crank.start(t);
    lfo.start(t);
    crank.stop(t + 1.1);
    lfo.stop(t + 1.1);
    this.engineLoop(t + 0.9);
  }

  /**
   * Ralentí y marcha: fundamental senoidal a la frecuencia de encendido, armónico suave y subgrave,
   * más un rumor de ruido muy filtrado. Todo pasa por un paso bajo sin resonancia, de modo que suena
   * como el motor oído desde la cabina, sin zumbidos agudos.
   */
  private engineLoop(at: number): void {
    if (!this.ctx || !this.engineBus || !this.noiseBuf) return;
    const out = this.ctx.createGain();
    out.gain.setValueAtTime(0, at);
    out.gain.linearRampToValueAtTime(ENGINE_BASE_GAIN, at + 0.8);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.4;
    filter.frequency.value = 220;
    const mk = (type: OscillatorType, gain: number) => {
      const o = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      o.type = type;
      g.gain.value = gain;
      o.connect(g).connect(filter);
      return o;
    };
    const osc = [mk('sine', 0.9), mk('triangle', 0.22), mk('sine', 0.55)];
    // Rumor: ruido muy grave
    const rumble = this.ctx.createBufferSource();
    rumble.buffer = this.noiseBuf;
    rumble.loop = true;
    const rf = this.ctx.createBiquadFilter();
    rf.type = 'lowpass';
    rf.frequency.value = 140;
    const rg = this.ctx.createGain();
    rg.gain.value = 0.25;
    rumble.connect(rf).connect(rg).connect(filter);
    // Leve pulsación de combustión (muy poca profundidad)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfoGain.gain.value = ENGINE_BASE_GAIN * 0.12;
    lfo.connect(lfoGain).connect(out.gain);
    filter.connect(out).connect(this.engineBus);
    osc.forEach((o) => o.start(at));
    rumble.start(at);
    lfo.start(at);
    this.engine = { osc, filter, out, lfo, lfoGain, rumble };
    this.setEngineRpm(600, at, 0.01);
  }

  /** Régimen del motor según la velocidad, con «cambios de marcha» suaves. */
  private rpmFor(kmh: number): number {
    if (kmh <= 0) return 600;
    const gear = Math.min(5, Math.floor(kmh / 18));
    const within = Math.min(1, (kmh - gear * 18) / 18);
    return 950 + within * 500 - gear * 15;
  }

  private setEngineRpm(rpm: number, at = this.now, tc = 0.6): void {
    if (!this.engine) return;
    const fire = rpm / 20; // 6 cilindros, 4 tiempos
    this.engine.osc[0]!.frequency.setTargetAtTime(fire, at, tc);
    this.engine.osc[1]!.frequency.setTargetAtTime(fire * 2, at, tc);
    this.engine.osc[2]!.frequency.setTargetAtTime(fire / 2, at, tc);
    this.engine.lfo.frequency.setTargetAtTime(fire / 4, at, tc);
    this.engine.filter.frequency.setTargetAtTime(160 + rpm * 0.16, at, tc);
  }

  /** Velocidad del camión: sube el régimen; al acelerar, un ligero empuje y soplido del turbo; al parar, el aire. */
  engineSpeed(kmh: number): void {
    if (!this.ready) return;
    const prev = this.lastKmh;
    this.lastKmh = kmh;
    if (!this.engine) return;
    this.setEngineRpm(this.rpmFor(kmh));
    const t = this.now;
    if (kmh > prev + 4) {
      const g = this.engine.out.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(ENGINE_BASE_GAIN * 1.35, t, 0.25);
      g.setTargetAtTime(ENGINE_BASE_GAIN, t + 1.2, 0.6);
      this.noise(t + 0.2, 1.4, 0.008, { type: 'bandpass', freq: 1600, q: 2 }, this.engineBus);
    }
    if (prev > 0 && kmh === 0) this.airBrake();
  }

  airBrake(): void {
    if (!this.ready || !this.ctx || !this.noiseBuf || !this.engineBus) return;
    // Soplido del freno de aire: entra y sale en fundido, sin chasquido
    const t = this.now + 0.3;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 4500;
    f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    src.connect(f).connect(g).connect(this.engineBus);
    src.start(t);
    src.stop(t + 0.65);
  }

  engineStop(): void {
    if (!this.engine || !this.ctx) return;
    const e = this.engine;
    this.engine = null;
    const t = this.now;
    e.osc[0]!.frequency.setTargetAtTime(8, t, 0.5);
    e.osc[1]!.frequency.setTargetAtTime(16, t, 0.5);
    e.osc[2]!.frequency.setTargetAtTime(4, t, 0.5);
    e.out.gain.cancelScheduledValues(t);
    e.out.gain.setTargetAtTime(0, t, 0.3);
    e.osc.forEach((o) => o.stop(t + 1.8));
    e.rumble.stop(t + 1.8);
    e.lfo.stop(t + 1.8);
    this.lastKmh = 0;
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
