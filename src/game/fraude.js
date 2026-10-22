import { AudioSys } from '../audio/audio.js';
import { IMG, URLS } from '../core/assets.js';
import { prefs } from '../core/prefs.js';
import { G, persist, state } from '../core/save.js';
import { $, TEST, clamp, esc, fmt, frSpace, lerp, rand, randi, reduceMotion, wait } from '../core/utils.js';
import { FRAUDE_SONG as SONG } from '../data/fraude-song.js';
import { FRAUDE } from '../data/fraude.js';
import { Donjon } from '../scenes/donjon.js';
import { drawChar } from '../render/sprites.js';
import { Room } from '../scenes/room.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { refreshGuide } from '../ui/guide.js';
import { hideToast, toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';
import { book } from './month.js';

/* ================= Mini-jeu « Fraude à la sécu » : un QTE musical =================
   Le joueur appuie en rythme sur les 4 flèches quand la lumière arrive sur les boutons.
   Chaque note réussie = une séance fictive facturée… et la jauge de risque monte avec la musique. */
const W = 1920, H = 1080;
const LANES = [
  { x: 585, col: '#ff3fb4', rgb: '255,63,180', key: '←' },
  { x: 835, col: '#2f9bff', rgb: '47,155,255', key: '↓' },
  { x: 1085, col: '#ffa41f', rgb: '255,164,31', key: '↑' },
  { x: 1335, col: '#2fe36b', rgb: '47,227,107', key: '→' }
];
const LANE_S = 1.12, LANE_BASE = 1068, BTN_Y = 958, LANE_TOP = 520, APPROACH = 1.35;
const WIN = { perfect: 0.075, great: 0.135, ok: 0.2 };
const KEYS = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, d: 0, f: 1, j: 2, k: 3, D: 0, F: 1, J: 2, K: 3, q: 0, s: 1, Q: 0, S: 1 };
/* The four dancers: atlas, position of the feet on the stage, scale. */
const DANCERS = [
  { key: 'qd_goblin', x: 600, y: 505, s: 0.62, back: true, phase: 0.5 },
  { key: 'qd_marvin', x: 1330, y: 505, s: 0.62, back: true, flip: true, phase: 1.5 },
  { key: 'qd_kine', x: 300, y: 1060, s: 1.02, hero: true },
  { key: 'qd_menton', x: 1640, y: 1060, s: 1.0, flip: true, phase: 1 }
];
const TIERS = [0, 8, 20, 40];
const tierOf = (c) => (c >= TIERS[3] ? 3 : c >= TIERS[2] ? 2 : c >= TIERS[1] ? 1 : 0);
const META = () => FRAUDE.atlas;

export const Fraude = {
  active: false, phase: 'idle', buffer: null, loading: null, src: null, gain: null, filt: null,
  notes: [], cursor: 0, parts: [], flyers: [], beams: [], spots: [], texts: [], press: [0, 0, 0, 0], flash: [0, 0, 0, 0],
  combo: 0, best: 0, hits: 0, misses: 0, cash: 0, risk: 0, riskShown: 0, lineIdx: -1, t: 0, lastNow: 0, shake: 0, redFlash: 0, beatI: -1,
  sim: null, damien: null,
  /* ---------- availability (button in the cabinet) ---------- */
  canOffer() {
    const f = G.fraud || {};
    return Room.cab && G.sess.state === 'run' && G.sess.where === Room.cab && f.m !== G.months && !this.active;
  },
  /* ---------- the ready screen ---------- */
  /* free = launched from the settings: same mini-game, but nothing counts for the save */
  open(free = false) {
    if (blocked() || this.active) return;
    AudioSys.tap(); hideToast();
    this.active = true; this.phase = 'ready'; this.free = !!free;
    const root = $('fraude'); root.hidden = false; root.classList.remove('caught', 'playing', 'ended');
    $('frReady').hidden = false; $('frEnd').hidden = true; $('frCount').textContent = '';
    $('frGo').disabled = false; $('frGo').querySelector('span').textContent = 'Lancer la fraude';
    $('frRules').innerHTML = frSpace(FRAUDE.rules.replace('{acte}', fmt(FRAUDE.acte)) + (this.free ? `<br><span class="fr-free">${FRAUDE.freeNote}</span>` : ''));
    $('frHonest').textContent = this.free ? 'Retour' : 'Rester honnête';
    this.resetPlay(); this.renderHud(); this.drawStatic();
    this.load();
  },
  load() {
    if (this.buffer || this.loading || !AudioSys.ctx || (TEST && TEST.fraude)) return this.loading;
    this.loading = fetch(SONG.src).then((r) => r.arrayBuffer()).then((ab) => AudioSys.decodeAB(ab)).then((b) => { this.buffer = b; }).catch(() => {});
    return this.loading;
  },
  honest() {
    AudioSys.tap(); this.close();
    if (!this.free) toast(frSpace(FRAUDE.honestToast), 3600);
  },
  close() {
    $('fraude').hidden = true; this.active = false; this.phase = 'idle'; this.stopAudio(0.3);
    if (AudioSys.playing && !AudioSys.src) AudioSys.play(AudioSys.theme, 1.5);
    Room.syncUi(); refreshGuide();
  },
  resetPlay() {
    this.notes = SONG.notes.map(([t, l]) => ({ t: t + (SONG.offset || 0), l, st: 0 }));
    this.cursor = 0; this.parts = []; this.flyers = []; this.texts = []; this.combo = 0; this.best = 0; this.hits = 0; this.misses = 0; this.ghosts = 0;
    this.cash = 0; this.risk = 0; this.riskShown = 0; this.lineIdx = -1; this.shake = 0; this.redFlash = 0; this.beatI = -1; this.damien = null;
    this.press = [0, 0, 0, 0]; this.flash = [0, 0, 0, 0]; this.dance = DANCERS.map((d, i) => ({ f: i, hold: 0, stumble: 0, flip: !!d.flip, spin: 0 }));
    this.beams = [0, 1, 2, 3].map((i) => ({ x: [250, 760, 1160, 1670][i], a: rand(-0.5, 0.5), sp: rand(0.35, 0.7) * (i % 2 ? 1 : -1), hue: i * 90 }));
    this.spots = Array.from({ length: 7 }, (_, i) => ({ x: rand(500, 1420), y: rand(640, 980), vx: rand(-120, 120), vy: rand(-50, 50), hue: i * 51, r: rand(90, 160) }));
    $('frL1').innerHTML = ''; $('frL2').innerHTML = '';
  },
  /* ---------- start: countdown then music ---------- */
  async start() {
    if (this.phase !== 'ready') return;
    AudioSys.unlock();
    const go = $('frGo'); go.disabled = true;
    if (!this.buffer && !(TEST && TEST.fraude)) { go.querySelector('span').textContent = 'Chargement…'; await Promise.race([this.load(), wait(9000)]); }
    if (!this.free) { G.fraud = Object.assign(G.fraud || {}, { m: G.months, tries: ((G.fraud && G.fraud.tries) || 0) + 1 }); persist(); }
    $('frReady').hidden = true; $('fraude').classList.add('playing');
    AudioSys.stopCurrent(0.4);
    this.resetPlay();
    const lead = 1.6;
    if (this.buffer && AudioSys.ctx && !(TEST && TEST.fraude)) {
      const ctx = AudioSys.ctx;
      this.gain = ctx.createGain(); this.gain.gain.value = prefs.music ? Math.max(0.15, prefs.volume) : 0;
      this.filt = ctx.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 20000;
      this.src = ctx.createBufferSource(); this.src.buffer = this.buffer;
      this.src.connect(this.filt); this.filt.connect(this.gain); this.gain.connect(ctx.destination);
      this.startAt = ctx.currentTime + lead; this.src.start(this.startAt); this.sim = null;
    } else this.sim = { t0: performance.now() + lead * 1000, speed: (TEST && TEST.fraude) || 1 };
    this.phase = 'count';
    const c = $('frCount');
    for (const s of ['3', '2', '1']) { c.textContent = s; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); AudioSys.tick(); await wait(lead * 1000 / 4); }
    c.textContent = 'FRAUDE !'; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); AudioSys.fanfare();
    this.phase = 'play';
    setTimeout(() => { if (c.textContent === 'FRAUDE !') c.textContent = ''; }, 900);
  },
  now() {
    if (this.sim) return ((performance.now() - this.sim.t0) / 1000) * this.sim.speed;
    const ctx = AudioSys.ctx; if (!ctx || this.startAt == null) return 0;
    return ctx.currentTime - this.startAt - (ctx.outputLatency || 0) - (ctx.baseLatency || 0) * 0.5;
  },
  stopAudio(fade = 0.4) {
    const s = this.src, g = this.gain; this.src = null; if (!s) return;
    const ctx = AudioSys.ctx, t = ctx.currentTime;
    try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + fade); s.stop(t + fade + 0.05); } catch (e) {}
  },
  /* ---------- input ---------- */
  hit(lane) {
    if (this.phase !== 'play') return;
    const now = this.now();
    this.press[lane] = 1;
    let best = null, bd = 1e9;
    for (let k = this.cursor; k < this.notes.length; k++) {
      const n = this.notes[k]; if (n.t - now > WIN.ok) break;
      if (n.st || n.l !== lane) continue;
      const d = Math.abs(n.t - now); if (d < bd) { bd = d; best = n; }
    }
    if (best && bd <= WIN.ok) this.judge(best, bd);
    else { this.ghosts++; AudioSys.note('triangle', 160, 0, 0.08, 0.12, 90); }
  },
  judge(n, d) {
    n.st = 1; this.hits++; this.combo++; this.best = Math.max(this.best, this.combo);
    const q = d <= WIN.perfect ? 0 : d <= WIN.great ? 1 : 2;
    this.cash += FRAUDE.acte;
    const L = LANES[n.l];
    this.flash[n.l] = 1;
    this.judgeText(n.l, ['PARFAIT !', 'SUPER !', 'OK'][q], ['#fff27a', '#9ff06b', '#cfe1ff'][q], q === 0 ? 1.1 : 1);
    this.burst(L.x, BTN_Y, L.rgb, q === 0 ? 26 : 16, q === 0);
    if (q === 0 && Math.random() < 0.35) this.spawnFlyer(true, L.x);
    this.addText(L.x + rand(-30, 30), BTN_Y - 230, `+${FRAUDE.acte} €`, '#ffd43a', 0.8, 'cash');
    const m = this.combo;
    if (m > 0 && m % 10 === 0) this.milestone(m);
    this.renderHud();
  },
  miss(n) {
    n.st = 2; this.misses++;
    if (this.combo >= 10) this.addText(960, 640, 'Combo perdu…', '#ff8b7b', 1.1);
    this.combo = 0;
    this.judgeText(n.l, 'RATÉ', '#ff6b5b', 1);
    this.redFlash = Math.min(1, this.redFlash + 0.35);
    for (const d of this.dance) d.stumble = 0.45;
    AudioSys.note('square', 180, 0, 0.12, 0.08, 110);
    this.renderHud();
  },
  milestone(m) {
    const tag = FRAUDE.combos[Math.min(FRAUDE.combos.length - 1, m / 10 - 1)];
    this.addText(960, 600, `${m} COMBO !`, '#ffe27a', 1.6, 'big');
    if (tag) this.addText(960, 690, tag, '#ffffff', 0.95, 'tag');
    this.shake = 0.5; AudioSys.success();
    for (let i = 0; i < 4; i++) this.burst(rand(500, 1420), rand(560, 900), LANES[i].rgb, 30, true);
    for (let i = 0; i < 6 + m / 5; i++) this.spawnFlyer(Math.random() < 0.6);
    for (const d of this.dance) { d.spin = 0.6; d.f = randi(0, 20); }
  },
  /* ---------- update & draw (called by the main loop) ---------- */
  update(dt) {
    if (!this.active) return;
    this.t += dt;
    if (this.phase === 'ready' || this.phase === 'ended') { this.drawStatic(dt); return; }
    const now = this.phase === 'caught' ? this.lastNow : this.now(); this.lastNow = now;
    if (this.phase === 'play') {
      while (this.cursor < this.notes.length) {
        const n = this.notes[this.cursor];
        if (n.st) { this.cursor++; continue; }
        if (now - n.t > WIN.ok) { this.miss(n); this.cursor++; continue; }
        break;
      }
      if (TEST && TEST.fraudeBot) for (let k = this.cursor; k < this.notes.length && this.notes[k].t <= now; k++) if (!this.notes[k].st && Math.random() < TEST.fraudeBot) this.judge(this.notes[k], 0.02);
      /* the gauge fills with the music; misses push it up, but Damien only shows up when the song is over */
      const base = clamp(now / SONG.riskEnd, 0, 1);
      this.risk = now >= SONG.riskEnd ? 1 : Math.min(FRAUDE.riskCap, base + this.misses * FRAUDE.missRisk + this.ghosts * FRAUDE.ghostRisk);
      if (this.risk >= 1) this.caught();
    }
    this.riskShown += (this.risk - this.riskShown) * Math.min(1, dt * 6);
    /* beat clock */
    const q = SONG.e8 * 2, bt = (now - SONG.t0) / q, bi = Math.floor(bt), ph = bt - bi;
    this.pulse = Math.exp(-ph * 5.5);
    if (bi !== this.beatI && now > 0 && this.phase !== 'caught') { this.beatI = bi; this.onBeat(bi); }
    for (let i = 0; i < 4; i++) { this.press[i] = Math.max(0, this.press[i] - dt * 6); this.flash[i] = Math.max(0, this.flash[i] - dt * 3.5); }
    this.shake = Math.max(0, this.shake - dt); this.redFlash = Math.max(0, this.redFlash - dt * 1.4);
    this.updateLyrics(now);
    this.renderGauge();
    this.draw(now, dt);
  },
  inChorus(now) { let k = 'verse'; for (const [t, s] of SONG.sections) if (now >= t) k = s; return k === 'chorus'; },
  onBeat(bi) {
    const tier = tierOf(this.combo), chorus = this.inChorus(this.lastNow);
    this.dance.forEach((d, i) => {
      if (d.stumble > 0) return;
      const every = tier >= 2 ? 1 : 2;
      if ((bi + i) % every === 0) d.f++;
      if (tier >= 2 && bi % 4 === 0) d.flip = !d.flip;
    });
    const n = (chorus ? 2 : 0) + tier + (Math.random() < 0.5 ? 1 : 0);
    for (let k = 0; k < n; k++) this.spawnFlyer(Math.random() < 0.55);
    if (chorus && bi % 2 === 0) this.burst(rand(200, 1720), rand(150, 380), `${randi(150, 255)},${randi(80, 255)},${randi(150, 255)}`, 10, false, true);
  },
  spawnFlyer(bill, x) {
    if (this.flyers.length > 90 || reduceMotion) return;
    const m = META()[bill ? 'qte_bills' : 'qte_cards'];
    this.flyers.push({ bill, f: randi(0, m.n - 1), x: x != null ? x + rand(-60, 60) : rand(60, 1860), y: x != null ? BTN_Y - 60 : rand(-160, -60), vx: rand(-40, 40), vy: x != null ? rand(-700, -450) : rand(90, 200), rot: rand(0, 6.28), vr: rand(-3, 3), sway: rand(0, 6.28), s: rand(0.55, 0.95), g: x != null ? 900 : 120 });
  },
  burst(x, y, rgb, n, star, soft) {
    if (reduceMotion) n = Math.min(n, 6);
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(soft ? 60 : 180, soft ? 200 : 620);
      this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (soft ? 0 : 160), life: 0, dur: rand(0.45, soft ? 1.4 : 0.9), r: rand(3, 8), rgb: Math.random() < 0.3 ? '255,255,255' : rgb, star: star && Math.random() < 0.5 });
    }
  },
  /* one judgment label per lane (replaces the previous one), lanes staggered so neighbours never overlap */
  judgeText(l, txt, col, k) {
    this.texts = this.texts.filter((t) => !(t.cls === 'judge' && t.lane === l));
    this.addText(LANES[l].x, BTN_Y - 150 - (l % 2) * 46, txt, col, k, 'judge');
    this.texts[this.texts.length - 1].lane = l;
  },
  addText(x, y, txt, col, k = 1, cls = '') { this.texts.push({ x, y, txt, col, k, cls, life: 0, dur: cls === 'big' ? 1.2 : 0.8 }); },
  /* ---------- lyrics (karaoke) ---------- */
  updateLyrics(now) {
    const L = SONG.lines;
    let i = -1; for (let k = 0; k < L.length; k++) if (L[k].t - 0.25 <= now) i = k; else break;
    if (i !== this.lineIdx) {
      this.lineIdx = i;
      const cur = L[i], nxt = L[i + 1];
      const len = cur ? cur.w.map((x) => x[1]).join(' ').length : 0;
      $('frL1').className = 'fr-l1' + (cur && (cur.k === 'chorus' || cur.k === 'final') ? ' chorus' : '') + (len > 52 ? ' xl' : len > 36 ? ' l' : '');
      $('frL1').innerHTML = cur ? cur.w.map(([t, w], j) => `<span data-j="${j}">${esc(w)}</span>`).join(' ') : '';
      $('frL2').textContent = nxt ? nxt.w.map((x) => x[1]).join(' ') : '';
      if (cur) { const el = $('frL1'); el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
    }
    const cur = L[i]; if (!cur) return;
    const spans = $('frL1').children;
    cur.w.forEach(([t], j) => { const on = now >= t - 0.04; const s = spans[j]; if (s && s.classList.contains('on') !== on) s.classList.toggle('on', on); });
  },
  renderGauge() {
    const r = this.riskShown, el = $('frGFill');
    el.style.height = (r * 100).toFixed(2) + '%';
    $('frGTxt').textContent = Math.round(r * 100) + ' %';
    $('fraude').classList.toggle('alarm', r > 0.72 && this.phase === 'play');
  },
  renderHud() {
    $('frCash').textContent = `${fmt(this.cash)} €`;
    $('frSub').textContent = frSpace(`${this.hits} séance${this.hits > 1 ? 's' : ''} fictive${this.hits > 1 ? 's' : ''}`);
    const c = $('frCombo');
    c.hidden = this.combo < 3;
    if (!c.hidden) { c.innerHTML = `<b>×${this.combo}</b><small>combo</small>`; c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop'); c.dataset.tier = tierOf(this.combo); }
  },
  /* ---------- drawing ---------- */
  drawStatic(dt = 0) { this.pulse = 0.25 + 0.25 * Math.sin(this.t * 3); this.draw(-5, dt, true); },
  draw(now, dt, idle) {
    const bc = $('frBack').getContext('2d'), fc = $('frFront').getContext('2d');
    bc.clearRect(0, 0, W, H); fc.clearRect(0, 0, W, H);
    const pulse = this.pulse || 0, tier = tierOf(this.combo);
    const root = $('frRoot');
    if (this.shake > 0 && !reduceMotion) root.style.transform = `translate(${rand(-1, 1) * this.shake * 16}px,${rand(-1, 1) * this.shake * 12}px)`;
    else if (root.style.transform) root.style.transform = '';
    /* --- back: light beams, floor spots, beat glow --- */
    bc.save(); bc.globalCompositeOperation = 'lighter';
    const hueT = this.t * 40;
    for (const b of this.beams) {
      b.a = Math.sin(this.t * b.sp + b.hue) * 0.55;
      const len = 1300, wdt = 170 + 80 * pulse, x = b.x, y = -40, ang = Math.PI / 2 + b.a;
      const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      const nx = -Math.sin(ang) * wdt, ny = Math.cos(ang) * wdt;
      const g = bc.createLinearGradient(x, y, ex, ey), col = `hsla(${(b.hue + hueT) % 360},100%,62%,`;
      g.addColorStop(0, col + (0.32 + 0.25 * pulse) + ')'); g.addColorStop(1, col + '0)');
      bc.fillStyle = g; bc.beginPath(); bc.moveTo(x - 8, y); bc.lineTo(ex + nx, ey + ny); bc.lineTo(ex - nx, ey - ny); bc.lineTo(x + 8, y); bc.closePath(); bc.fill();
    }
    for (const s of this.spots) {
      s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < 450 || s.x > 1470) s.vx *= -1; if (s.y < 600 || s.y > 1000) s.vy *= -1;
      const g = bc.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * (1 + 0.3 * pulse));
      g.addColorStop(0, `hsla(${(s.hue + hueT * 1.5) % 360},100%,60%,${0.28 + 0.2 * pulse})`); g.addColorStop(1, 'hsla(0,0%,0%,0)');
      bc.fillStyle = g; bc.beginPath(); bc.ellipse(s.x, s.y, s.r * 1.6, s.r * 0.55, 0, 0, Math.PI * 2); bc.fill();
    }
    const gg = bc.createRadialGradient(960, 720, 50, 960, 720, 900); gg.addColorStop(0, `rgba(255,120,220,${0.10 + 0.16 * pulse * (1 + tier * 0.3)})`); gg.addColorStop(1, 'rgba(0,0,0,0)');
    bc.fillStyle = gg; bc.fillRect(0, 0, W, H);
    /* disco ball glints */
    for (let i = 0; i < 6; i++) { const a = this.t * 1.7 + i * 1.05, r = 60 + 30 * Math.sin(this.t * 3 + i); this.star(bc, 960 + Math.cos(a) * r * 1.6, 95 + Math.sin(a) * r * 0.6, 10 + 10 * pulse, `hsla(${(i * 60 + hueT) % 360},100%,80%,0.9)`); }
    bc.restore();
    /* --- dancers --- */
    for (let i = 0; i < DANCERS.length; i++) this.drawDancer(bc, i, pulse, tier, dt);
    /* --- lanes, notes, buttons --- */
    this.drawLanes(fc, now, pulse, dt, idle);
    /* --- flyers (bills & cards) --- */
    for (const f of this.flyers) {
      f.vy += f.g * dt; if (f.g > 200 && f.vy > 160) { f.g = 120; f.vy = Math.min(f.vy, 200); }
      f.sway += dt * 3; f.x += (f.vx + Math.sin(f.sway) * 60) * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      const m = META()[f.bill ? 'qte_bills' : 'qte_cards'], img = IMG[f.bill ? 'qte_bills' : 'qte_cards']; if (!img) continue;
      const sx = (f.f % m.cols) * m.cw, sy = Math.floor(f.f / m.cols) * m.ch;
      fc.save(); fc.translate(f.x, f.y); fc.rotate(f.rot * 0.25); fc.scale(f.s * Math.cos(f.sway * 0.7), f.s);
      fc.drawImage(img, sx, sy, m.cw, m.ch, -m.ax, -m.ay, m.cw, m.ch); fc.restore();
    }
    this.flyers = this.flyers.filter((f) => f.y < H + 160);
    /* --- particles --- */
    fc.save(); fc.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      p.life += dt; p.vy += 700 * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = 1 - p.life / p.dur; if (k <= 0) continue;
      if (p.star) this.star(fc, p.x, p.y, p.r * 2.2 * k + 2, `rgba(${p.rgb},${k})`);
      else { fc.fillStyle = `rgba(${p.rgb},${k})`; fc.beginPath(); fc.arc(p.x, p.y, p.r * (0.4 + k * 0.6), 0, Math.PI * 2); fc.fill(); }
    }
    fc.restore();
    this.parts = this.parts.filter((p) => p.life < p.dur);
    /* --- floating texts --- */
    for (const t of this.texts) {
      t.life += dt; const k = t.life / t.dur; if (k >= 1) continue;
      const sc = (t.cls === 'big' ? 1.6 : 1) * t.k * (k < 0.15 ? lerp(0.4, 1.15, k / 0.15) : lerp(1.15, 1, Math.min(1, (k - 0.15) * 4)));
      fc.save(); fc.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1; fc.translate(t.x, t.y - (t.cls === 'cash' ? 90 * k : 30 * k)); fc.scale(sc, sc);
      fc.font = `${t.cls === 'tag' ? 40 : t.cls === 'cash' ? 34 : t.cls === 'judge' ? 38 : 46}px "Lilita One", sans-serif`; fc.textAlign = 'center'; fc.textBaseline = 'middle';
      fc.lineWidth = 9; fc.strokeStyle = '#140a26'; fc.lineJoin = 'round'; fc.strokeText(t.txt, 0, 0); fc.fillStyle = t.col; fc.fillText(t.txt, 0, 0); fc.restore();
    }
    this.texts = this.texts.filter((t) => t.life < t.dur);
    /* red alarm vignette */
    const alarm = (this.riskShown > 0.72 && !idle ? (this.riskShown - 0.72) / 0.28 * (0.5 + 0.5 * Math.sin(this.t * 9)) : 0) + this.redFlash * 0.6 + (this.phase === 'caught' ? 0.5 + 0.5 * Math.sin(this.t * 10) : 0);
    if (alarm > 0.01) {
      const vg = fc.createRadialGradient(960, 540, 380, 960, 540, 1150); vg.addColorStop(0, 'rgba(255,0,0,0)'); vg.addColorStop(1, `rgba(255,20,20,${Math.min(0.7, alarm * 0.55)})`);
      fc.fillStyle = vg; fc.fillRect(0, 0, W, H);
    }
    if (this.damien) this.drawDamien(fc, dt);
  },
  star(c, x, y, r, col) {
    c.fillStyle = col; c.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r * 0.28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
  },
  drawDancer(c, i, pulse, tier, dt) {
    const D = DANCERS[i], st = this.dance[i], m = META()[D.key], img = IMG[D.key]; if (!m || !img) return;
    st.stumble = Math.max(0, st.stumble - dt); st.spin = Math.max(0, st.spin - dt);
    const f = ((st.f % m.n) + m.n) % m.n, sx = (f % m.cols) * m.cw, sy = Math.floor(f / m.cols) * m.ch;
    const amp = [10, 18, 28, 40][tier] * (D.back ? 0.6 : 1), bounce = this.phase === 'caught' ? 0 : pulse * amp;
    const sqY = 1 - 0.05 * pulse, sqX = 1 + 0.035 * pulse;
    let s = D.s, x = D.x, y = D.y - bounce;
    if (st.stumble > 0) x += Math.sin(st.stumble * 60) * 10;
    if (this.phase === 'caught') x += Math.sin(this.t * 40 + i) * 4;
    /* shadow */
    c.save(); c.globalAlpha = 0.45; c.fillStyle = '#12001f'; c.beginPath(); c.ellipse(D.x, D.y + 4, 120 * s * (1 - 0.15 * pulse), 26 * s, 0, 0, Math.PI * 2); c.fill(); c.restore();
    /* aura with big combos */
    if (tier >= 2 && !D.back) {
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y - 220 * s, 20, x, y - 220 * s, 300 * s);
      g.addColorStop(0, `hsla(${(this.t * 120 + i * 90) % 360},100%,65%,${0.25 + 0.25 * pulse})`); g.addColorStop(1, 'hsla(0,0%,0%,0)');
      c.fillStyle = g; c.fillRect(x - 320 * s, y - 560 * s, 640 * s, 640 * s); c.restore();
    }
    c.save(); c.translate(x, y);
    const flip = st.flip !== !!D.flip ? -1 : 1, spin = st.spin > 0 ? Math.cos((0.6 - st.spin) / 0.6 * Math.PI * 2) : 1;
    c.scale(s * sqX * flip * spin, s * sqY);
    if (this.phase === 'caught') c.filter = 'saturate(.6) brightness(.85)';
    c.drawImage(img, sx, sy, m.cw, m.ch, -m.ax, -m.ay, m.cw, m.ch);
    c.restore();
  },
  drawLanes(c, now, pulse, dt, idle) {
    const lm = META().qte_lanes, li = IMG.qte_lanes, bm = META().qte_btns, bi = IMG.qte_btns;
    for (let l = 0; l < 4; l++) {
      const L = LANES[l];
      if (li) {
        c.save(); c.globalAlpha = 0.92; c.translate(L.x, LANE_BASE); c.scale(LANE_S, LANE_S);
        c.drawImage(li, l * lm.cw, 0, lm.cw, lm.ch, -lm.ax, -lm.ay, lm.cw, lm.ch); c.restore();
      }
      const fl = this.flash[l] + this.press[l] * 0.4 + pulse * 0.12;
      if (fl > 0.02) {
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, LANE_TOP, 0, BTN_Y); g.addColorStop(0, `rgba(${L.rgb},0)`); g.addColorStop(1, `rgba(${L.rgb},${Math.min(0.75, fl * 0.6)})`);
        c.fillStyle = g; c.beginPath(); c.moveTo(L.x - 34, LANE_TOP); c.lineTo(L.x + 34, LANE_TOP); c.lineTo(L.x + 104, BTN_Y); c.lineTo(L.x - 104, BTN_Y); c.closePath(); c.fill(); c.restore();
      }
    }
    /* notes = balls of multicolour light rolling down the lanes */
    if (!idle) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let k = this.cursor; k < this.notes.length; k++) {
        const n = this.notes[k]; const dtn = n.t - now; if (dtn > APPROACH) break;
        if (n.st === 1) continue;
        const p = 1 - dtn / APPROACH; if (p < 0) continue;
        const L = LANES[n.l], y = lerp(LANE_TOP, BTN_Y, p * p * 0.35 + p * 0.65), sc = lerp(0.42, 1.05, p), a = n.st === 2 ? Math.max(0, 1 - (now - n.t) * 3) : Math.min(1, p * 4);
        if (a <= 0) continue;
        const hue = (now * 220 + n.t * 90 + n.l * 70) % 360;
        for (let tr = 1; tr <= 4; tr++) { const tp = p - tr * 0.035; if (tp < 0) break; const ty = lerp(LANE_TOP, BTN_Y, tp * tp * 0.35 + tp * 0.65); c.fillStyle = `hsla(${(hue + tr * 30) % 360},100%,65%,${a * 0.18 * (5 - tr) / 4})`; c.beginPath(); c.arc(L.x, ty, 30 * sc * (1 - tr * 0.12), 0, Math.PI * 2); c.fill(); }
        const g = c.createRadialGradient(L.x, y, 0, L.x, y, 62 * sc);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.25, `hsla(${hue},100%,72%,${a})`); g.addColorStop(0.6, `rgba(${L.rgb},${a * 0.55})`); g.addColorStop(1, `rgba(${L.rgb},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(L.x, y, 62 * sc, 0, Math.PI * 2); c.fill();
        c.strokeStyle = `hsla(${(hue + 180) % 360},100%,80%,${a * 0.9})`; c.lineWidth = 4 * sc; c.beginPath(); c.arc(L.x, y, 34 * sc, now * 6, now * 6 + 4.2); c.stroke();
      }
      c.restore();
    }
    /* buttons */
    if (bi) for (let l = 0; l < 4; l++) {
      const L = LANES[l], pr = this.press[l], sc = 0.86 * (1 - pr * 0.12 + this.flash[l] * 0.1);
      c.save(); c.translate(L.x, BTN_Y + pr * 8); c.scale(sc, sc * 0.96);
      c.drawImage(bi, l * bm.cw, 0, bm.cw, bm.ch, -bm.ax, -bm.ay, bm.cw, bm.ch);
      if (this.flash[l] > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = this.flash[l] * 0.8; c.drawImage(bi, l * bm.cw, 0, bm.cw, bm.ch, -bm.ax, -bm.ay, bm.cw, bm.ch); }
      c.restore();
      if (this.flash[l] > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(${L.rgb},${this.flash[l]})`; c.lineWidth = 10 * this.flash[l]; c.beginPath(); c.ellipse(L.x, BTN_Y, 110 + (1 - this.flash[l]) * 70, (110 + (1 - this.flash[l]) * 70) * 0.62, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
    }
  },
  /* ---------- stopping in time ---------- */
  async stop() {
    if (this.phase !== 'play' && this.phase !== 'count') return;
    AudioSys.tap();
    this.phase = 'ended'; $('fraude').classList.remove('playing', 'alarm'); $('fraude').classList.add('ended');
    if (this.src) { const ctx = AudioSys.ctx, t = ctx.currentTime; try { this.src.playbackRate.setValueAtTime(1, t); this.src.playbackRate.linearRampToValueAtTime(0.25, t + 0.5); } catch (e) {} this.stopAudio(0.55); }
    const loot = this.cash, risk = Math.round(this.risk * 100);
    if (loot > 0 && !this.free) {
      G.money += loot; book('Séances fictives facturées (fraude, à rembourser)', loot, 'hors', 'fraude');
      G.fraud.pending = { loot, risk: this.risk, m: G.months }; persist(); HUD.tweenMoney();
    }
    $('frEndTitle').textContent = loot ? 'Tu t’arrêtes à temps… ?' : 'Fraude annulée';
    $('frEndBody').innerHTML = frSpace(loot
      ? `Tu empoches <b>${fmt(loot)} €</b> de séances fictives (${this.hits} séance${this.hits > 1 ? 's' : ''} jamais faite${this.hits > 1 ? 's' : ''}). Risque d'être repéré : <b>${risk} %</b>.<br><small>${esc(this.free ? FRAUDE.freeEnd : FRAUDE.escapeNote)}</small>`
      : `Aucune séance fictive facturée. ${esc(FRAUDE.honestToast)}`);
    $('frEnd').hidden = false;
  },
  endOk() { AudioSys.tap(); this.close(); },
  /* ---------- caught! Damien, chevalier de la Sécu ---------- */
  async caught() {
    if (this.phase === 'caught') return;
    this.phase = 'caught'; $('fraude').classList.remove('playing', 'alarm'); $('fraude').classList.add('caught');
    const ctx = AudioSys.ctx;
    if (this.src && ctx) { const t = ctx.currentTime; try { this.src.playbackRate.setValueAtTime(1, t); this.src.playbackRate.exponentialRampToValueAtTime(0.08, t + 0.9); this.filt.frequency.exponentialRampToValueAtTime(400, t + 0.9); } catch (e) {} this.stopAudio(1.0); }
    this.scratch(); this.siren(2.4);
    this.shake = 1.2; this.redFlash = 1;
    await wait(900);
    this.damien = { x: 2150, y: BTN_Y + 60, tx: 1250, t: 0, pose: 'dash', s: 1.75 };
    await new Promise((res) => { this.damien.arrive = res; setTimeout(res, 2500); });
    this.damien.pose = 'point';
    state.busy = true;
    await Talk.open(); await SCRIPTS.fraudeCaught(this.cash); await Talk.close(true);
    state.busy = false;
    const loot = this.cash, hits = this.hits;
    $('fraude').hidden = true; this.active = false; this.phase = 'idle';
    await Donjon.jail({ loot, hits, buffer: this.buffer, free: this.free });
  },
  drawDamien(c, dt) {
    const d = this.damien; d.t += dt;
    if (d.pose === 'dash') {
      d.x += (d.tx - d.x) * Math.min(1, dt * 5);
      if (Math.abs(d.x - d.tx) < 8) { d.x = d.tx; d.pose = 'point'; this.shake = 0.6; for (let i = 0; i < 14; i++) this.burst(d.x + rand(-80, 80), d.y, '230,210,190', 1, false, true); if (d.arrive) { const f = d.arrive; d.arrive = null; f(); } }
      if (Math.random() < 0.6) this.burst(d.x + 60, d.y - 10, '220,200,180', 1, false, true);
    }
    c.save(); c.globalAlpha = 0.5; c.fillStyle = '#000'; c.beginPath(); c.ellipse(d.x, d.y + 4, 110, 26, 0, 0, Math.PI * 2); c.fill(); c.restore();
    drawCharSafe(c, 'damien', d.pose, d.t, d.x, d.y, d.s);
  },
  scratch() {
    const ctx = AudioSys.ctx; if (!ctx || !prefs.sfx) return;
    const t = ctx.currentTime, len = 0.5, b = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.22); f.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
    const g = ctx.createGain(); g.gain.value = 0.9; s.connect(f); f.connect(g); g.connect(AudioSys.sfxGain); s.start(t);
  },
  siren(dur) {
    const ctx = AudioSys.ctx; if (!ctx || !prefs.sfx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; for (let k = 0; k < dur / 0.45; k++) { o.frequency.setValueAtTime(k % 2 ? 640 : 860, t + k * 0.45); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.05); g.gain.setValueAtTime(0.09, t + dur - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AudioSys.sfxGain); o.start(t); o.stop(t + dur + 0.05);
  },
  /* ---------- a month later, if you got away with it ---------- */
  async monthCheck() {
    const p = G.fraud && G.fraud.pending; if (!p || p.m >= G.months) return;
    G.fraud.pending = null; persist();
    if (Math.random() < p.risk) {
      const fine = FRAUDE.controlFine;
      await Talk.open(); await SCRIPTS.fraudeControl(p.loot, fine); await Talk.close();
      G.money -= p.loot + fine;
      book('Remboursement des séances fictives (indu)', -p.loot, 'hors', 'fraude');
      book('Pénalité pour fraude (contrôle CPAM)', -fine, 'hors', 'penalite');
      G.fraud.convictions = (G.fraud.convictions || 0) + 1; persist(); HUD.tweenMoney();
    } else toast(frSpace(FRAUDE.luckyToast), 4200);
  }
};
function drawCharSafe(c, who, pose, t, x, y, s) { drawChar(c, who, pose, t, x, y, s, { fps: 10 }); }

$('frGo').addEventListener('click', () => Fraude.start());
$('frHonest').addEventListener('click', () => Fraude.honest());
$('frStop').addEventListener('click', () => Fraude.stop());
$('frEndOk').addEventListener('click', () => Fraude.endOk());
$('setFraude').addEventListener('click', () => {
  if (state.busy || Fraude.active) return;
  $('settings').hidden = true;
  Fraude.open(true);
});
$('frPads').addEventListener('pointerdown', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; e.preventDefault(); Fraude.hit(+b.dataset.l); });
addEventListener('keydown', (e) => {
  if (!Fraude.active || Fraude.phase !== 'play' || e.repeat) return;
  const l = KEYS[e.key]; if (l == null) return;
  e.preventDefault(); Fraude.hit(l);
});
