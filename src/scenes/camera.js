import { stage } from '../core/layout.js';
import { state } from '../core/save.js';
import { $, clamp } from '../core/utils.js';
import { blocked } from '../ui/modals.js';

/* ================= Town camera: drag (or scroll) to move the top view a little ================= */
export const Cam = {
  z: 1.13, x: 0, y: 0, drag: null, justDragged: false, vx: 0, vy: 0,
  lim() { return { minX: 1920 * (1 - this.z), minY: 1080 * (1 - this.z) }; },
  clampXY() { const L = this.lim(); this.x = clamp(this.x, L.minX, 0); this.y = clamp(this.y, L.minY, 0); },
  base() { return { tx: this.x, ty: this.y, sx: 1.148325 * this.z, sy: 1.147715 * this.z }; },
  apply() { this.clampXY(); const b = this.base(); $('townArt').style.transform = `translate(${b.tx.toFixed(1)}px,${b.ty.toFixed(1)}px) scale(${b.sx},${b.sy})`; },
  center() { const L = this.lim(); this.x = L.minX * 0.5; this.y = L.minY * 0.55; this.apply(); },
  /* Look at an art point (e.g. the player's cabinet), as far as the limits allow. */
  look(ax, ay) { const b = this.base(); this.x = 960 - ax * b.sx; this.y = 560 - ay * b.sy; this.apply(); },
  toStage(ax, ay) { const b = this.base(); return { x: b.tx + ax * b.sx, y: b.ty + ay * b.sy }; },
  scale() { return stage.getBoundingClientRect().width / 1920 || 1; },
  init() {
    const sc = $('townScene');
    sc.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || blocked() || state.screen !== 'town') return;
      this.drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: this.x, y0: this.y, on: false, lx: e.clientX, ly: e.clientY, lt: performance.now() };
      this.vx = this.vy = 0;
    });
    sc.addEventListener('pointermove', (e) => {
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      const k = this.scale(), dx = (e.clientX - d.sx) / k, dy = (e.clientY - d.sy) / k;
      if (!d.on && Math.hypot(dx, dy) > 9) { d.on = true; sc.classList.add('dragging'); try { sc.setPointerCapture(e.pointerId); } catch (err) {} }
      if (d.on) {
        this.x = d.x0 + dx; this.y = d.y0 + dy; this.apply();
        const now = performance.now(), dt = Math.max(1, now - d.lt);
        this.vx = ((e.clientX - d.lx) / k) / dt * 16; this.vy = ((e.clientY - d.ly) / k) / dt * 16; d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
      }
    });
    const end = (e) => {
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      if (d.on) { this.justDragged = true; setTimeout(() => { this.justDragged = false; }, 60); sc.classList.remove('dragging'); }
      else this.vx = this.vy = 0;
      this.drag = null;
    };
    sc.addEventListener('pointerup', end); sc.addEventListener('pointercancel', end);
    /* a drag must not count as a click on a building or a bubble */
    sc.addEventListener('click', (e) => { if (this.justDragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    sc.addEventListener('wheel', (e) => {
      if (state.screen !== 'town' || blocked()) return;
      e.preventDefault();
      this.x -= (e.shiftKey ? e.deltaY : e.deltaX) * 0.6; this.y -= (e.shiftKey ? 0 : e.deltaY) * 0.6; this.vx = this.vy = 0; this.apply();
    }, { passive: false });
    addEventListener('keydown', (e) => {
      if (state.screen !== 'town' || blocked()) return;
      const m = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key];
      if (m && !/INPUT|TEXTAREA/.test(document.activeElement && document.activeElement.tagName)) { this.x += m[0]; this.y += m[1]; this.apply(); }
    });
    this.center();
  },
  /* inertia after a quick drag */
  update(dt) {
    if (this.drag || (Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.05)) return;
    this.x += this.vx * dt * 60; this.y += this.vy * dt * 60; this.apply();
    const f = Math.pow(0.0025, dt); this.vx *= f; this.vy *= f;
  }
};
