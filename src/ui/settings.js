import { AudioSys } from '../audio/audio.js';
import { prefs, savePrefs } from '../core/prefs.js';
import { state } from '../core/save.js';
import { $ } from '../core/utils.js';
import { Clouds } from '../fx/transitions.js';
import { restartGame } from '../main.js';
import { showTitle } from '../scenes/scenes.js';
import { toast } from './helpers.js';
import { Shop } from './shop.js';

/* ================= Settings ================= */
let restartArmed = 0;
export function syncSettings() {
  const set = (id, on) => { const b = $(id); b.setAttribute('aria-pressed', on); b.textContent = on ? 'Oui' : 'Non'; };
  set('musicToggle', prefs.music); set('sfxToggle', prefs.sfx); set('voiceToggle', prefs.voice); set('fastToggle', prefs.fast);
  $('musicVol').value = Math.round(prefs.volume * 100);
  const sb = $('soundBtn'); sb.classList.toggle('muted', !prefs.music); sb.setAttribute('aria-label', prefs.music ? 'Couper la musique' : 'Activer la musique');
  $('restartBtn').textContent = 'Recommencer la partie'; restartArmed = 0;
}
function setMusic(on) { prefs.music = on; savePrefs(); syncSettings(); if (on) { AudioSys.unlock(); AudioSys.startMusic(); } else AudioSys.stopMusic(); }
$('musicToggle').addEventListener('click', () => { AudioSys.tap(); setMusic(!prefs.music); });
$('sfxToggle').addEventListener('click', () => { prefs.sfx = !prefs.sfx; savePrefs(); syncSettings(); AudioSys.tap(); });
$('voiceToggle').addEventListener('click', () => { prefs.voice = !prefs.voice; savePrefs(); syncSettings(); AudioSys.tap(); if (prefs.voice) AudioSys.voice('mentor', 'a', { mul: 1.1, glide: 1.2 }); });
$('fastToggle').addEventListener('click', () => { prefs.fast = !prefs.fast; savePrefs(); syncSettings(); AudioSys.tap(); toast(prefs.fast ? 'Mode démo : séances de <b>5 s</b>, chantiers et Ordre 3 fois plus rapides.' : 'Retour aux durées normales : une séance dure <b>15 secondes</b>.'); });
$('musicVol').addEventListener('input', (e) => { prefs.volume = e.target.value / 100; savePrefs(); AudioSys.setVolume(); });
$('soundBtn').addEventListener('click', () => setMusic(!prefs.music));
$('restartBtn').addEventListener('click', () => {
  if (state.busy) return;
  if (Date.now() - restartArmed > 4000) { restartArmed = Date.now(); $('restartBtn').textContent = 'Sûr ? Tout sera effacé'; AudioSys.wrong(); return; }
  restartGame();
});
$('toTitle').addEventListener('click', async () => {
  if (state.busy) return;
  $('settings').hidden = true; Shop.close(true); state.busy = true; AudioSys.tap();
  await Clouds.transition(async () => { showTitle(); });
  state.busy = false;
});
