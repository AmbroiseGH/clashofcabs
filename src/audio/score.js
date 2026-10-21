import { AudioSys } from './audio.js';
import { prefs } from '../core/prefs.js';

/* ================= Procedural score of the opening cinematic =================
   A minor and calm while he studies, it grows slide after slide (bass, then drums),
   builds up on the dominant… and bursts into A major, with brass and timpani, on the diploma. */
export const Score = {
  ctx: null, out: null, rev: null, noiseBuf: null, timer: 0, sec: 0, pending: null, step: 0, next: 0, bar: 0, on: false, beat: 0.6,
  m2f: (m) => 440 * Math.pow(2, (m - 69) / 12),
  CH: { Am: [57, 60, 64], F: [53, 57, 60], C: [55, 60, 64], G: [55, 59, 62], E: [52, 56, 59], A: [57, 61, 64, 69], D: [57, 62, 66], E2: [56, 59, 64, 68], Dm: [57, 62, 65] },
  BASS: { Am: 45, F: 41, C: 48, G: 43, E: 40, A: 45, D: 38, E2: 40, Dm: 38 },
  SEC: [
    { prog: ['Am', 'F', 'C', 'G'], pad: 0.05, arp: 4, arpV: 0.05 },
    { prog: ['Am', 'F', 'C', 'G'], pad: 0.06, arp: 2, arpV: 0.05, bass: 8, bassV: 0.14 },
    { prog: ['Am', 'F', 'C', 'G'], pad: 0.06, arp: 2, arpV: 0.055, bass: 8, bassV: 0.15, hat: 2, kick: [0] },
    { prog: ['Am', 'F', 'C', 'G'], pad: 0.07, arp: 2, arpV: 0.06, bass: 2, bassV: 0.13, hat: 2, kick: [0, 8], snare: [4, 12] },
    { prog: ['Dm', 'F', 'E', 'E'], pad: 0.08, arp: 1, arpV: 0.05, bass: 2, bassV: 0.15, hat: 1, kick: [0, 4, 8, 12], snare: [4, 12], build: true },
    { prog: ['A', 'D', 'E2', 'A'], pad: 0.08, brass: true, bass: 4, bassV: 0.17, kick: [0, 8], snare: [4, 12], hat: 2, timp: true, fanfare: true }
  ],
  FANFARE: [[69, 0, 2], [73, 2, 2], [76, 4, 2], [81, 6, 8], [81, 16, 2], [78, 18, 2], [74, 20, 4], [78, 24, 6], [76, 32, 2], [80, 34, 2], [83, 36, 4], [80, 40, 6], [81, 48, 14]],
  ensure() {
    if (this.ctx) return true;
    const c = AudioSys.ctx; if (!c) return false;
    this.ctx = c;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.connect(c.destination);
    this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(comp);
    const len = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = 0.32; this.rev.connect(rg); rg.connect(this.out);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    return true;
  },
  vol() { return prefs.music ? prefs.volume * 0.85 : 0; },
  start() {
    if (!this.ensure() || this.on) return;
    this.on = true; this.sec = 0; this.pending = null; this.step = 0; this.bar = 0; this.fanStep = -1;
    const t = this.ctx.currentTime; this.next = t + 0.15;
    this.out.gain.cancelScheduledValues(t); this.out.gain.setValueAtTime(0.0001, t); this.out.gain.linearRampToValueAtTime(this.vol(), t + 1.2);
    this.timer = setInterval(() => this.schedule(), 40);
  },
  go(i) { if (this.on) this.pending = Math.min(i, this.SEC.length - 1); },
  stop(fade = 1.6) {
    if (!this.on) return; this.on = false; clearInterval(this.timer);
    const t = this.ctx.currentTime, g = this.out.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + fade);
  },
  /* ----- instruments ----- */
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  send(node, dry = 1, wet = 0.5) { const g1 = this.ctx.createGain(); g1.gain.value = dry; node.connect(g1); g1.connect(this.out); if (wet) { const g2 = this.ctx.createGain(); g2.gain.value = wet; node.connect(g2); g2.connect(this.rev); } },
  osc(type, f, t, dur, det = 0) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = det; o.start(t); o.stop(t + dur + 0.05); return o; },
  pad(ch, t, dur, v, bright) {
    const c = this.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(bright ? 2400 : 1100, t); f.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.5); g.gain.setValueAtTime(v, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    for (const m of ch) for (const det of [-9, 8]) this.osc('sawtooth', this.m2f(m), t, dur + 0.7, det).connect(f);
    f.connect(g); this.send(g, 0.7, 0.6);
  },
  pluck(m, t, v) {
    const c = this.ctx, g = c.createGain(); this.env(g, t, 0.005, v, 0.55);
    this.osc('triangle', this.m2f(m), t, 0.6).connect(g); const g2 = c.createGain(); g2.gain.value = 0.35; this.osc('sine', this.m2f(m + 12), t, 0.4).connect(g2); g2.connect(g);
    this.send(g, 0.8, 0.5);
  },
  bassN(m, t, dur, v) {
    const c = this.ctx, g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(v * 0.5, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
    this.osc('sawtooth', this.m2f(m), t, dur).connect(f); this.osc('sine', this.m2f(m - 12), t, dur).connect(g); f.connect(g); this.send(g, 1, 0.08);
  },
  noise(t, dur, type, freq, v, q = 1) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); this.env(g, t, 0.003, v, dur); s.connect(f); f.connect(g); s.start(t); s.stop(t + dur + 0.05); return g;
  },
  kick(t, v = 0.55) { const c = this.ctx, g = c.createGain(); this.env(g, t, 0.003, v, 0.32); const o = this.osc('sine', 150, t, 0.35); o.frequency.exponentialRampToValueAtTime(42, t + 0.25); o.connect(g); this.send(g, 1, 0.05); },
  snare(t, v = 0.2) { this.send(this.noise(t, 0.18, 'bandpass', 1900, v, 0.8), 1, 0.35); const g = this.ctx.createGain(); this.env(g, t, 0.002, v * 0.6, 0.1); this.osc('triangle', 190, t, 0.12).connect(g); this.send(g, 1, 0.2); },
  hat(t, v = 0.04) { this.send(this.noise(t, 0.05, 'highpass', 8000, v), 1, 0.1); },
  crash(t, v = 0.22) { this.send(this.noise(t, 2.2, 'highpass', 4500, v, 0.5), 1, 0.6); },
  timp(t, m, v = 0.5) { const c = this.ctx, g = c.createGain(); this.env(g, t, 0.004, v, 1.3); const o = this.osc('sine', this.m2f(m), t, 1.4); o.frequency.exponentialRampToValueAtTime(this.m2f(m) * 0.94, t + 1.2); o.connect(g); this.send(g, 1, 0.5); this.send(this.noise(t, 0.12, 'lowpass', 600, v * 0.4), 1, 0.3); },
  brass(ch, t, dur, v) {
    const c = this.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(350, t); f.frequency.linearRampToValueAtTime(2600, t + 0.12); f.frequency.linearRampToValueAtTime(1500, t + 0.5);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.06); g.gain.setValueAtTime(v * 0.8, t + dur - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
    for (const m of ch) for (const det of [-7, 6]) this.osc('sawtooth', this.m2f(m), t, dur + 0.3, det).connect(f);
    f.connect(g); this.send(g, 0.8, 0.55);
  },
  lead(m, t, dur, v) {
    const c = this.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.setValueAtTime(v * 0.85, t + Math.max(0.05, dur - 0.08)); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    const o1 = this.osc('sawtooth', this.m2f(m), t, dur + 0.25, -5), o2 = this.osc('square', this.m2f(m), t, dur + 0.25, 6);
    const lfo = this.osc('sine', 5.5, t, dur + 0.25), lg = c.createGain(); lg.gain.value = 9; lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
    o1.connect(f); o2.connect(f); f.connect(g); this.send(g, 0.9, 0.6);
  },
  riser(t, dur, v) { const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05); s.connect(f); f.connect(g); s.start(t); s.stop(t + dur + 0.1); this.send(g, 1, 0.4); },
  /* ----- sequencer: 16 steps per bar, 100 bpm ----- */
  schedule() {
    if (!this.on) return;
    const c = this.ctx, sixteenth = this.beat / 4;
    while (this.next < c.currentTime + 0.18) {
      const t = this.next, s = this.step % 16;
      if (this.pending != null && s % 4 === 0) {
        const p = this.pending; this.pending = null;
        if (p !== this.sec) {
          this.sec = p; this.step = 0; this.bar = 0;
          if (p === 4) this.riser(t, this.beat * 16, 0.14);
          if (p === 5) { this.crash(t, 0.28); this.timp(t, 33, 0.6); this.kick(t, 0.6); this.fanStep = 0; }
        }
      }
      const S = this.SEC[this.sec], st = this.step % 16, name = S.build ? S.prog[Math.min(this.bar, 3)] : S.prog[this.bar % S.prog.length], ch = this.CH[name];
      if (st === 0 && S.pad) { S.brass ? this.brass(ch, t, this.beat * 4 - 0.05, 0.05) : this.pad(ch, t, this.beat * 4, S.pad, this.sec >= 3); }
      if (S.brass && (st === 6 || st === 10)) this.brass(ch, t, this.beat * 0.45, 0.035);
      if (S.arp && st % S.arp === 0) { const tones = ch.concat(ch.map((m) => m + 12)); const k = Math.floor(st / S.arp); this.pluck(tones[[0, 1, 2, 3, 4, 3, 2, 1][k % 8] % tones.length] + 12, t, S.arpV); }
      if (S.bass && st % S.bass === 0) this.bassN(this.BASS[name], t, sixteenth * S.bass * 0.95, S.bassV * (st === 0 ? 1.2 : 1));
      if (S.kick && S.kick.includes(st)) this.kick(t, 0.5);
      if (S.snare && S.snare.includes(st)) this.snare(t, 0.17);
      if (S.hat && st % S.hat === 0) this.hat(t, st % 4 === 2 ? 0.05 : 0.025);
      if (S.build) { const k = Math.min(1, (this.bar * 16 + st) / 64); if (this.bar >= 2 && st % 2 === 0) this.snare(t, 0.06 + 0.12 * k); if (this.bar >= 3) this.snare(t + sixteenth / 2, 0.05 + 0.1 * k); }
      if (S.timp && st === 0) this.timp(t, this.BASS[name] - 12 + 12, 0.42);
      if (S.fanfare && this.fanStep >= 0) {
        for (const [m, at, len] of this.FANFARE) if (at === this.fanStep) this.lead(m, t, sixteenth * len * 0.95, 0.055);
        this.fanStep++; if (this.fanStep >= 64) this.fanStep = 0;
      }
      this.next += sixteenth; this.step++;
      if (this.step % 16 === 0) this.bar++;
    }
  }
};
