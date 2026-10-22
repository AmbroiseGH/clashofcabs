import { URLS } from '../core/assets.js';
import { $, reduceMotion } from '../core/utils.js';

/* ================= Animated PLAY button of the title screen =================
   4 frames in assets/play_anim.webp (normal, sparkle, bounce, burst), all anchored on the bottom-centre of the button. */
const P = { cw: 986, ch: 628, ax: 461, ay: 597, bw: 784 };   // atlas cell and button width, in atlas pixels
const BTN = { x: 585, y: 664, w: 500, h: 214 };            // the clickable button, in art coordinates
const K = BTN.w / P.bw;
const SEQ = [0, 0, 1, 0, 2, 0];
export const PlayAnim = {
  t: 0, f: -1, hover: false,
  init() {
    const b = $('playBtn'), sp = $('playSprite');
    Object.assign(b.style, { left: BTN.x + 'px', top: BTN.y + 'px', width: BTN.w + 'px', height: BTN.h + 'px' });
    Object.assign(sp.style, {
      left: -(P.ax * K - BTN.w / 2) + 'px', top: BTN.h - P.ay * K + 'px', width: P.cw * K + 'px', height: P.ch * K + 'px',
      backgroundImage: `url("${URLS.play_anim}")`, backgroundSize: `${P.cw * K * 4}px ${P.ch * K}px`
    });
    b.addEventListener('pointerenter', () => { this.hover = true; });
    b.addEventListener('pointerleave', () => { this.hover = false; });
    b.addEventListener('focus', () => { this.hover = true; });
    b.addEventListener('blur', () => { this.hover = false; });
    this.set(0);
  },
  set(f) { if (f === this.f) return; this.f = f; $('playSprite').style.backgroundPosition = `${-f * P.cw * K}px 0`; },
  update(dt) {
    this.t += dt;
    if ($('playBtn').classList.contains('pressed') || this.hover) { this.set(3); return; }
    this.set(reduceMotion ? 0 : SEQ[Math.floor(this.t * 3.2) % SEQ.length]);
  }
};
