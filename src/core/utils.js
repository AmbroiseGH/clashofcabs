/* ================= Core: constants, helpers, preferences, save ================= */
export const SW = 1920, SH = 1080, AW = 1672, AH = 941, KX = SW / AW, KY = SH / AH;
export const MENTOR = 'Pascale Matué';
/* « de Thomas », « d'Ambroise », « d'Étienne » */
export const deName = (n) => (/^[AEIOUYÀÂÉÈÊÎÔÛaeiouy]/.test(n) ? 'd’' : 'de ') + n;
export const TEST = window.__COC_TEST || null;
export const $ = (id) => document.getElementById(id);
export const wait = (ms) => new Promise((r) => setTimeout(r, TEST && TEST.fastWait ? Math.min(ms, 60) : ms));
export const raf2 = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const frSpace = (s) => String(s).replace(/ ([!?:;»%€])/g, ' $1').replace(/« /g, '« ').replace(/(\d) (\d{3})\b/g, '$1 $2');
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => { const r = Math.round(n); return (r < 0 ? '−' : '') + String(Math.abs(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
/* Money with cents when needed (for the 2035 and the ledger): 1 234,56 */
export const fmt2 = (n) => {
  const c = Math.round(Math.abs(n) * 100), int = Math.floor(c / 100), dec = c % 100;
  return (n < 0 && c ? '−' : '') + String(int).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (dec ? ',' + String(dec).padStart(2, '0') : '');
};
export const eur = (n) => fmt(n) + ' €';
export const eur2 = (n) => fmt2(n) + ' €';
export const signed = (n) => (n > 0 ? '+' : '') + fmt(n) + ' €';
export const pct = (k, d = 0) => (k * 100).toFixed(d).replace('.', ',') + ' %';
export const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MONTHS_S = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const monthName = (d) => `${cap1(MONTHS[d.m - 1])} ${d.y}`;
export const monthShort = (d) => `${MONTHS_S[d.m - 1]} ${d.y}`;

export const nextMonth = (d) => (d.m === 12 ? { y: d.y + 1, m: 1 } : { y: d.y, m: d.m + 1 });
export const deMois = (m) => (/^[aeiouy]/.test(MONTHS[m - 1]) ? 'd’' : 'de ') + MONTHS[m - 1];
