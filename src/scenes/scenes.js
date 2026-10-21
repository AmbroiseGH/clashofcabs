import { AudioSys } from '../audio/audio.js';
import { Decl } from '../compta/declaration.js';
import { URLS } from '../core/assets.js';
import { backdrop } from '../core/layout.js';
import { G, hadOldSave, persist, state } from '../core/save.js';
import { $, esc, reduceMotion, wait } from '../core/utils.js';
import { PLOTS } from '../data/town-map.js';
import { TitleFX } from '../fx/effects.js';
import { Fade } from '../fx/transitions.js';
import { Career } from '../game/career.js';
import { Month } from '../game/month.js';
import { Hire } from '../game/staff.js';
import { Room } from './room.js';
import { Town } from './town.js';
import { SCRIPTS } from '../story/scripts.js';
import { Talk } from '../story/talk.js';
import { Guide, refreshGuide } from '../ui/guide.js';
import { toast } from '../ui/helpers.js';
import { HUD } from '../ui/hud.js';
import { blocked } from '../ui/modals.js';

/* ================= Scenes ================= */
export const titleScene = $('titleScene'), townScene = $('townScene'), cabScene = $('cabScene');
export function setBackdrop(key) { backdrop.style.backgroundImage = `url("${URLS[key]}")`; backdrop.classList.add('on'); }
export function showTitle() {
  state.screen = 'title'; Guide.hide();
  townScene.hidden = true; cabScene.hidden = true; $('ordreScene').hidden = true; $('hudLayer').hidden = true; titleScene.hidden = false; setBackdrop('title');
  TitleFX.alpha = 0; TitleFX.setup();
  titleScene.classList.remove('idle', 'intro'); void titleScene.offsetWidth; titleScene.classList.add('intro');
  const cam = titleScene.querySelector('.cam');
  const onEnd = (e) => { if (e.target !== cam) return; cam.removeEventListener('animationend', onEnd); titleScene.classList.replace('intro', 'idle'); };
  cam.addEventListener('animationend', onEnd);
  if (reduceMotion) titleScene.classList.replace('intro', 'idle');

}
export function showTown() {
  state.screen = 'town'; state.roomCab = null;
  titleScene.hidden = true; cabScene.hidden = true; $('ordreScene').hidden = true; townScene.hidden = false; $('hudLayer').hidden = false; setBackdrop('town2');
  Town.reset(); HUD.render(); Hire.check();

}
function showCabinet(cab) {
  state.screen = 'cabinet'; state.roomCab = cab;
  titleScene.hidden = true; townScene.hidden = true; $('ordreScene').hidden = true; cabScene.hidden = false; $('hudLayer').hidden = false; setBackdrop('cab_in');
  Town.offerCar = null; Town.cars = Town.cars.filter((c) => !c.offer);
  Room.enter(cab); HUD.render();

}
export const Scenes = {
  async enterCabinet(cab) {
    if (state.busy) return;
    state.busy = true;
    const p = PLOTS[cab];
    await Fade.transition(async () => { showCabinet(cab); }, p ? { el: $('townArt'), x: p.cx, y: p.cy - 60 } : null);
    state.busy = false;
    if (cab === 'C' && !G.flags.cabFirstOwn) { G.flags.cabFirstOwn = true; persist(); toast('Bienvenue chez toi ! Les <b>+</b> lumineux montrent où installer ton matériel.', 4200); }
    Room.syncUi(); refreshGuide();
  },
  async exitCabinet() {
    if (blocked()) return;
    state.busy = true; AudioSys.tap();
    await Fade.transition(async () => { showTown(); });
    state.busy = false; refreshGuide();
  }
};
export async function onTownEnter() {
  state.busy = true;
  HUD.shown = G.money; HUD.render();
  await wait(350);
  if (G.phase === 'demarches' && !G.tutoDone) { await Talk.open(); await SCRIPTS.welcome(); await Talk.close(); G.tutoDone = true; persist(); }
  else if (G.pseudo) toast(`Content de te revoir, <b>${esc(G.pseudo)}</b> !`);
  if (hadOldSave && !G.flags.v4note) { G.flags.v4note = true; persist(); await wait(1000); toast('Nouvelle version : ta carrière commence maintenant <b>dès le diplôme</b> !', 4800); }
  state.busy = false;
  if (G.pendingDecl) { state.busy = true; await Decl.run(G.pendingDecl); await Month.annual(); state.busy = false; }
  if (G.phase === 'rempl' && G.assistOffer && !G.contract) Career.offerAssist();
  Career.onTownEnter();
  refreshGuide();
}
