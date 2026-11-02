/**
 * "Midnight Detour": an original generative noir-jazz track, synthesised live with the Web Audio API
 * (no audio files, nothing to license). Walking bass, Rhodes-style comping, brushed ride/snare, a muted lead
 * that enters on the second pass, and vinyl crackle. Also provides a bell phone ring.
 * Must be created from a user gesture (browser autoplay rules).
 */

type Chord = { root: number; third: number; voicing: number[] };
const C = (root: number, third: number, voicing: number[]): Chord => ({ root, third, voicing });

// One entry per bar; a bar with two chords lists both (first half, second half).
const BARS: Chord[][] = [
  [C(38, 3, [53, 57, 60, 64])],                       // Dm9
  [C(43, 4, [53, 59, 64])],                           // G13
  [C(48, 4, [52, 55, 59, 62])],                       // Cmaj9
  [C(45, 4, [55, 61, 65, 58])],                       // A7b9
  [C(38, 3, [53, 57, 60, 64])],                       // Dm9
  [C(46, 4, [56, 62, 64])],                           // Bb7#11
  [C(40, 3, [50, 55, 58]), C(45, 4, [55, 61, 65])],   // Em7b5 | A7
  [C(38, 3, [53, 57, 60, 64])],                       // Dm9
];

// Lead motif: [beat within the 32-beat loop, midi, length in beats]
const LEAD: [number, number, number][] = [
  [0, 69, 1.5], [2, 72, 0.5], [2.5, 71, 0.5], [3, 69, 1],
  [4, 67, 1.5], [6, 71, 1], [7, 69, 1],
  [8, 72, 2], [10, 76, 1], [11, 74, 1],
  [12, 73, 1.5], [13.5, 69, 0.5], [14, 65, 2],
  [16, 69, 1], [17, 74, 2], [19, 72, 1],
  [20, 70, 1.5], [21.5, 69, 0.5], [22, 67, 1.5],
  [24, 67, 1], [25, 70, 1], [26, 69, 1], [27, 73, 1],
  [28, 74, 3],
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const BPM = 82;
const BEAT = 60 / BPM;
const SWING = 0.665;

export class NoirAudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private music: GainNode;
  private noise: AudioBuffer;
  private timer: number | null = null;
  private ringTimer: number | null = null;
  private startTime = 0;
  private nextEighth = 0;
  private playing = false;
  private crackle: AudioBufferSourceNode | null = null;
  private musicLevel = 0.9;

  constructor() {
    this.ctx = new AudioContext();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.music = this.ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(comp);
    comp.connect(this.master);
    this.master.connect(this.ctx.destination);

    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  /* ---------- music ---------- */

  startMusic() {
    if (this.playing) return;
    this.playing = true;
    this.startTime = this.ctx.currentTime + 0.15;
    this.nextEighth = 0;
    this.music.gain.cancelScheduledValues(this.ctx.currentTime);
    this.music.gain.setValueAtTime(this.music.gain.value, this.ctx.currentTime);
    this.music.gain.linearRampToValueAtTime(this.musicLevel, this.ctx.currentTime + 2.5);
    this.startCrackle();
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  stopMusic() {
    if (!this.playing) return;
    this.playing = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setValueAtTime(this.music.gain.value, t);
    this.music.gain.linearRampToValueAtTime(0, t + 0.8);
    const c = this.crackle;
    this.crackle = null;
    window.setTimeout(() => { try { c?.stop(); } catch {} }, 900);
  }

  /** Lower the music under speech (and bring it back). */
  duck(on: boolean) {
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setValueAtTime(this.music.gain.value, t);
    this.music.gain.linearRampToValueAtTime(this.playing ? (on ? this.musicLevel * 0.3 : this.musicLevel) : 0, t + 0.35);
  }

  private startCrackle() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 3, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * (0.4 + Math.random() * 0.6) : (Math.random() * 2 - 1) * 0.015;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    src.connect(hp); hp.connect(g); g.connect(this.music);
    src.start();
    this.crackle = src;
  }

  private schedule() {
    const ahead = this.ctx.currentTime + 0.18;
    for (;;) {
      const n = this.nextEighth;
      const q = Math.floor(n / 2);
      const off = n % 2 === 1;
      const t = this.startTime + (q + (off ? SWING : 0)) * BEAT;
      if (t > ahead) break;
      this.eighth(n, t);
      this.nextEighth++;
    }
  }

  private chordAt(q: number): Chord {
    const bar = Math.floor(q / 4) % BARS.length;
    const b = BARS[bar];
    return b.length === 2 && q % 4 >= 2 ? b[1] : b[0];
  }

  private eighth(n: number, t: number) {
    const q = Math.floor(n / 2);
    const inBar = n % 8;
    const loop = Math.floor(n / 64);

    // bass: walking quarter notes
    if (n % 2 === 0) {
      const ch = this.chordAt(q);
      const next = this.chordAt(q + 1);
      const k = q % 4;
      let note = ch.root;
      if (k === 1) note = ch.root + 7;
      else if (k === 2) note = ch.root + ch.third;
      else if (k === 3) note = next.root === ch.root ? ch.root + 12 : next.root + (next.root > ch.root ? -1 : 1);
      while (note > 52) note -= 12;
      this.bass(note, t);
    }
    // Rhodes comping (syncopated)
    if (inBar === 0 || inBar === 3 || inBar === 6) {
      this.rhodes(this.chordAt(q).voicing, t, inBar === 0 ? 0.5 : 0.8);
    }
    // ride + brush
    if (n % 2 === 0 || inBar === 3 || inBar === 7) this.tick(t, n % 2 === 0 ? 0.05 : 0.035);
    if (inBar === 2 || inBar === 6) this.swish(t);
    // lead from the second pass
    if (loop >= 1) {
      const beat = q + (n % 2 === 1 ? SWING : 0);
      const b32 = beat % 32;
      for (const [pos, midi, len] of LEAD) {
        if (n % 2 === 0 ? Math.abs(pos - (q % 32)) < 0.01 : Math.abs(pos - (q % 32) - 0.5) < 0.01) {
          this.lead(midi, t, len * BEAT * 0.9);
        }
      }
      void b32;
    }
  }

  private bass(midi: number, t: number) {
    const f = mtof(midi);
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    const o2 = this.ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = f / 2;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 0.95);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.music);
    o.start(t); o2.start(t); o.stop(t + BEAT); o2.stop(t + BEAT);
  }

  private rhodes(notes: number[], t: number, level: number) {
    notes.forEach((m, i) => {
      const tt = t + i * 0.012;
      const f = mtof(m);
      const car = this.ctx.createOscillator();
      car.type = "sine";
      car.frequency.value = f;
      const mod = this.ctx.createOscillator();
      mod.type = "sine";
      mod.frequency.value = f * 2;
      const mg = this.ctx.createGain();
      mg.gain.setValueAtTime(f * 1.4, tt);
      mg.gain.exponentialRampToValueAtTime(f * 0.02, tt + 0.6);
      mod.connect(mg); mg.connect(car.frequency);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.07 * level, tt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.5);
      car.connect(g); g.connect(this.music);
      car.start(tt); mod.start(tt); car.stop(tt + 1.6); mod.stop(tt + 1.6);
    });
  }

  private noiseBurst(t: number, dur: number, freq: number, q: number, level: number, hp = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = freq;
    bp.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp);
    let tail: AudioNode = bp;
    if (hp) {
      const h = this.ctx.createBiquadFilter();
      h.type = "highpass";
      h.frequency.value = hp;
      bp.connect(h);
      tail = h;
    }
    tail.connect(g); g.connect(this.music);
    s.start(t, Math.random() * 1.5, dur + 0.05);
  }

  private tick(t: number, level: number) { this.noiseBurst(t, 0.09, 7500, 1.2, level, 4000); }
  private swish(t: number) { this.noiseBurst(t, 0.22, 3200, 0.8, 0.05); }

  private lead(midi: number, t: number, dur: number) {
    const f = mtof(midi);
    const o = this.ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const vib = this.ctx.createOscillator();
    vib.frequency.value = 5.2;
    const vg = this.ctx.createGain();
    vg.gain.setValueAtTime(0, t);
    vg.gain.linearRampToValueAtTime(f * 0.01, t + 0.4);
    vib.connect(vg); vg.connect(o.frequency);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1300;
    bp.Q.value = 1.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
    g.gain.setValueAtTime(0.05, t + Math.max(0.1, dur - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    o.connect(bp); bp.connect(g); g.connect(this.music);
    o.start(t); vib.start(t); o.stop(t + dur + 0.15); vib.stop(t + dur + 0.15);
  }

  /* ---------- phone ---------- */

  private ringOnce(t: number) {
    for (const off of [0, 0.5]) {
      for (const f of [1400, 1480]) {
        const o = this.ctx.createOscillator();
        o.type = "square";
        o.frequency.value = f;
        const am = this.ctx.createOscillator();
        am.frequency.value = 22;
        const ag = this.ctx.createGain();
        ag.gain.value = 0.5;
        const g = this.ctx.createGain();
        g.gain.value = 0;
        am.connect(ag); ag.connect(g.gain);
        const lp = this.ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3200;
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, t + off);
        env.gain.exponentialRampToValueAtTime(0.05, t + off + 0.02);
        env.gain.setValueAtTime(0.05, t + off + 0.36);
        env.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.42);
        o.connect(g); g.connect(lp); lp.connect(env); env.connect(this.master);
        o.start(t + off); am.start(t + off); o.stop(t + off + 0.45); am.stop(t + off + 0.45);
      }
    }
  }

  startRinging() {
    this.stopRinging();
    this.ringOnce(this.ctx.currentTime + 0.05);
    this.ringTimer = window.setInterval(() => this.ringOnce(this.ctx.currentTime + 0.05), 2200);
  }
  stopRinging() {
    if (this.ringTimer) window.clearInterval(this.ringTimer);
    this.ringTimer = null;
  }

  /** Short "click" for connect/hang-up. */
  click() { this.noiseBurst(this.ctx.currentTime + 0.01, 0.05, 1800, 2, 0.12); }

  dispose() {
    this.stopRinging();
    this.stopMusic();
    window.setTimeout(() => { try { void this.ctx.close(); } catch {} }, 1000);
  }
}
