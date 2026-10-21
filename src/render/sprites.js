import { IMG } from '../core/assets.js';
import { META } from '../data/sprites.js';

/* ================= Sprite helpers (atlases rendered offline in the game's dimetric style) ================= */
export const depthK = (y) => 0.82 + 0.30 * (y - 250) / 600;      // perspective inside the cabinet
const EQ_PPU = 115;                                          // room pixels per metre for the 3D props
export const PATIENT_FPS = { walk: 7, squat: 4.2, plank: 2.6, pushup: 3.6, march: 5, squat_march: 4.6 };
export function drawShadow(c, x, y, rx, ry, a = 0.2) {
  c.save(); c.globalAlpha *= a; c.fillStyle = '#1b1406'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); c.fill(); c.restore();
}
export function drawPatient(c, sheet, row, frame, x, y, s, flip, alpha = 1) {
  const m = META.p[sheet], img = IMG['p_' + sheet]; if (!img || alpha <= 0) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(img, (frame % 4) * m.cw, row * m.ch, m.cw, m.ch, -m.ax * s, -m.ay * s, m.cw * s, m.ch * s);
  c.restore();
}
/* Choose a walk view from the velocity: profile for mostly horizontal moves, front or back otherwise. */
export function walkView(vx, vy) {
  if (Math.abs(vx) >= 1.4 * Math.abs(vy)) return ['walk_side', vx < 0];
  return [vy > 0 ? 'walk_front' : 'walk_back', false];
}
/* Exercises loop back and forth through their 4 frames. */
export const pingPong = (t, fps) => { const k = Math.floor(t * fps) % 6; return k < 4 ? k : 6 - k; };
export function drawCar(c, colorIdx, view, flip, x, y, s, alpha = 1) {
  const m = META.cars, img = IMG.cars; if (!img || alpha <= 0) return;
  c.save(); c.globalAlpha = alpha; c.translate(x, y); if (flip) c.scale(-1, 1);
  c.drawImage(img, view * m.cw, colorIdx * m.ch, m.cw, m.ch, -m.ax * s, -m.ay * s, m.cw * s, m.ch * s);
  c.restore();
}
function eqScale(name, y) { return (EQ_PPU / META.eq[name].ppu) * depthK(y); }
export function drawEq(c, name, x, y, k = 1, alpha = 1) {
  const m = META.eq[name], img = IMG['eq_' + name]; if (!img || alpha <= 0) return;
  const s = eqScale(name, y) * k;
  c.save(); c.globalAlpha = alpha; c.drawImage(img, x - m.ax * s, y - m.ay * s, m.w * s, m.h * s); c.restore();
}

/* ================= Named characters (small sprites cut from the provided sheets) =================
   Each pose row holds 4 frames; walk sheets give side / front / back rows. */
const CHARS = {
  player: { walk: { sheet: 'c15', right: 0, front: 1, left: 2, back: 3 }, idle: ['c16', 0], talk: ['c16', 2], happy: ['c16', 3], kneel: ['c17', 2, 3] },
  ambroise: { walk: { sheet: 'c24', left: 0, front: 2, back: 3 }, idle: ['c25', 3, 3], talk: ['c25', 3], coach: ['c25', 0], tablet: ['c25', 2, 1], happy: ['c25', 3, 0], massage: ['c25', 1, 0] },
  mathieu: { walk: { sheet: 'c18', right: 0, front: 1, left: 2, back: 3 }, idle: ['c19', 0], think: ['c19', 1], talk: ['c19', 2], kneel: ['c20', 3] },
  marvin: { walk: { sheet: 'c23', right: 0, left: 1, front: 2, back: 3 }, idle: ['c21', 0], angry: ['c21', 1], scared: ['c21', 2], happy: ['c21', 3], read: ['c22', 0], write: ['c22', 1], point: ['c22', 2], stamp: ['c22', 3] },
  menton: { walk: { sheet: 'c12', right: 0, front: 1, left: 2, back: 3 }, idle: ['c13', 0], think: ['c13', 1], talk: ['c13', 2], scared: ['c13', 3], clip: ['c14', 0], point: ['c14', 2], happy: ['c14', 3] },
  /* the confrères of the town and the president of the Ordre */
  thomas: { walk: { sheet: 'c27', right: 0, left: 1, back: 2, fps: 11 }, idle: ['c27', 3], talk: ['c27', 4, 0], happy: ['c27', 4, 1], think: ['c27', 4, 2], wave: ['c27', 4, 3], coach: ['c27', 3] },
  julien: { walk: { sheet: 'c28', right: 0, left: 1, back: 2, fps: 11 }, idle: ['c28', 4, 0], talk: ['c28', 4, 4], wave: ['c28', 4, 5], think: ['c28', 4, 6], happy: ['c28', 4, 8], point: ['c28', 4, 10], read: ['c28', 4, 11], scared: ['c28', 4, 12], coach: ['c28', 4, 3] },
  etienne: { walk: { sheet: 'c29', right: 0, left: 1, back: 2, fps: 8 }, idle: ['c29', 3], wave: ['c29', 4, 1], happy: ['c29', 4, 2], talk: ['c29', 4, 3], think: ['c29', 4, 4], tablet: ['c29', 4, 5], massage: ['c29', 4, 6, 3], coach: ['c29', 4, 3], cheer: ['c29', 4, 9] },
  pascale: { walk: { sheet: 'c30', right: 0, left: 1, back: 2, front: 3, fps: 9 }, idle: ['c30', 4, 0], wave: ['c30', 4, 1], think: ['c30', 4, 2], happy: ['c30', 4, 3], point: ['c30', 4, 4], talk: ['c30', 4, 4], clip: ['c30', 4, 5], throne: ['c30', 4, 6] }
};
const rowLen = (sheet, row) => { const m = META.c[sheet]; return (m && m.rn && m.rn[row]) || 4; };
/* Which walk row and mirror to use for a velocity. */
export function charWalk(who, vx, vy) {
  const w = CHARS[who].walk;
  if (Math.abs(vx) >= 1.2 * Math.abs(vy)) {
    if (vx > 0) return w.right != null ? [w.right, false] : [w.left, true];
    return w.left != null ? [w.left, false] : [w.right, true];
  }
  if (vy > 0 && w.front == null) return vx >= 0 ? (w.right != null ? [w.right, false] : [w.left, true]) : (w.left != null ? [w.left, false] : [w.right, true]);
  return vy > 0 ? [w.front, false] : [w.back, false];
}
/* Draw a character. anim: 'walk' (row from charWalk) or a pose name; t: animation clock in seconds. */
export function drawChar(c, who, anim, t, x, y, s, opt = {}) {
  const def = CHARS[who]; if (!def) return;
  let sheet, row, frame;
  if (anim === 'walk') { sheet = def.walk.sheet; row = opt.row; const n = rowLen(sheet, row); frame = opt.moving === false ? Math.min(1, n - 1) : Math.floor(t * (def.walk.fps || 7)) % n; }
  else {
    const p = def[anim] || def.idle; sheet = p[0]; row = p[1];
    frame = p[2] != null ? (p[3] ? p[2] + Math.floor(t * (opt.fps || 0.9)) % p[3] : p[2]) : Math.floor(t * (opt.fps || 0.9)) % rowLen(sheet, row);
  }
  const m = META.c[sheet], img = IMG[sheet]; if (!m || !img) return;
  c.save(); c.globalAlpha = opt.alpha == null ? 1 : opt.alpha; c.translate(x, y); if (opt.flip) c.scale(-1, 1);
  c.drawImage(img, frame * m.cw, row * m.ch, m.cw, m.ch, -m.ax * s, -m.ay * s, m.cw * s, m.ch * s);
  c.restore();
}
