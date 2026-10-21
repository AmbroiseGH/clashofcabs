import { $, SH, SW } from './utils.js';

/* ================= Layout: fixed 1920×1080 everywhere ================= */
export const stage = $('stage'), app = $('app'), backdrop = $('backdrop');
export const coarse = matchMedia('(pointer: coarse)').matches;
let rotated = false, hintShown = false, freezeLayout = false, stageScale = 1; export function setFreezeLayout(v) { freezeLayout = v; }
export function layout() {
  if (freezeLayout) return;
  const cs = getComputedStyle($('probe'));
  const it = parseFloat(cs.paddingTop) || 0, ir = parseFloat(cs.paddingRight) || 0, ib = parseFloat(cs.paddingBottom) || 0, il = parseFloat(cs.paddingLeft) || 0;
  const vw = app.clientWidth, vh = app.clientHeight, aw = vw - il - ir, ah = vh - it - ib;
  rotated = coarse && ah > aw * 1.1;
  const cx = il + aw / 2, cy = it + ah / 2;
  const s = rotated ? Math.min(aw / SH, ah / SW) : Math.min(aw / SW, ah / SH);
  stageScale = s;
  stage.style.transform = `translate(${cx}px, ${cy}px) ${rotated ? 'rotate(90deg) ' : ''}scale(${s}) translate(${-SW / 2}px, ${-SH / 2}px)`;
  const hint = $('rotHint');
  if (rotated && !hintShown) { hintShown = true; hint.hidden = false; setTimeout(() => { hint.hidden = true; }, 4500); }
  if (!rotated) hint.hidden = true;
}
addEventListener('resize', layout);
/* nothing inside the fixed stage should ever scroll the page */
for (const el of [app, stage]) el.addEventListener('scroll', () => { el.scrollTop = 0; el.scrollLeft = 0; });
addEventListener('orientationchange', () => setTimeout(layout, 250));
