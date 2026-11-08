/* React render smoke — renderToString across every screen/state.
   Bundle with esbuild (platform=node), prepend stubs, run under Node. */
import { renderToString } from 'react-dom/server';
import App from '../../react-src/App.jsx';

const g = window.__GAME;
let fails = 0;
function ok(cond, msg){
  if(cond) console.log('  ok:', msg);
  else { fails++; console.error('FAIL:', msg); }
}
function renderAt(screen, patch){
  g.UI.set(Object.assign({ screen, loading: 100 }, patch || {}));
  return renderToString(<App/>);
}

/* loading */
let html = renderAt('loading', { loading: 42 });
ok(html.includes('loading heist assets') && html.includes('42%'), 'loading screen renders progress');

/* title */
html = renderAt('title');
ok(html.includes('GLASS HOUSE') && html.includes('id="bPlay"'), 'title renders logo + play button');
ok(html.includes('assets/character/cat/wave.png'), 'title cat showcase present');
ok(html.includes('RESET PROGRESS') && html.includes('id="bSoundT"'), 'settings row present');
ok(html.includes('progress:'), 'progress line present');

/* level select */
html = renderAt('select');
const cards = (html.match(/lvcard/g) || []).length;
ok(cards >= g.LEVELS.length, 'level cards rendered (' + cards + ' of ' + g.LEVELS.length + ')');
ok(html.includes('assets/pickups/star.png'), 'star art in cards');
ok(html.includes('id="bSelBack"'), 'select back button');

/* how to play */
html = renderAt('how');
ok(html.includes('HOW TO PLAY') && html.includes('YARN'), 'briefing renders');

/* pause (HUD also renders under pause) */
html = renderAt('pause');
ok(html.includes('PAUSED') && html.includes('id="bResume"'), 'pause overlay renders');
ok(html.includes('id="hud"'), 'HUD visible beneath pause');

/* complete */
g.Game.result = {
  kicker: 'VAULT CRACKED · LEVEL 1', title: 'CLEAN GETAWAY',
  rows: [['INTENT NOTES ×3', 300], ['TOTALX', 0]], total: 700, stars: 3,
  awards: [{ src: 'assets/pickups/note.png', label: 'ALL INTENTS', cls: '' }],
  nextLabel: 'NEXT LEVEL →'
};
html = renderAt('complete');
ok(html.includes('CLEAN GETAWAY') && html.includes('ALL INTENTS'), 'complete renders result + awards');
ok(html.includes('id="cTotal"') && html.includes('id="bNext"'), 'complete total + next button');

/* game over */
html = renderAt('over');
ok(html.includes('BUSTED') && html.includes('id="bRetryO"'), 'game over renders');

/* play + HUD + touch + toast + rotate */
g.UI.set({ hud: { level: 'L1 · THE ATRIUM', notes: '1/3', lives: 2,
  score: 100, time: '0:42', yarn: 1 }, coarse: true });
html = renderAt('play');
ok(html.includes('id="hud"') && html.includes('id="engBar"'), 'HUD renders in play');
ok(html.includes('1/3') && html.includes('id="hScore"'), 'HUD data present');
ok(html.includes('♥') || html.includes('♡'), 'hearts render (fallback text without assets)');
ok(html.includes('id="touch"') && html.includes('ENCRYPT'), 'touch controls render on coarse');
ok(html.includes('id="btnPause"'), 'pause button in HUD');

html = renderAt('play', { toast: '<b>hello</b> toast' });
ok(html.includes('hello') && /id="toast"[^>]*class="on"/.test(html), 'toast renders html + on class');

html = renderAt('play', { portrait: true, coarse: true });
ok(html.includes('id="rotate"'), 'rotate hint renders in portrait');

/* hearts with asset present */
g.Assets.imgs.ui_heart = { width: 16, height: 16 };
html = renderAt('play', { coarse: false });
ok(html.includes('assets/ui/heart.png'), 'heart icons render when asset present');
delete g.Assets.imgs.ui_heart;

console.log(fails ? '\nSMOKE FAILED (' + fails + ')' : '\nRENDER SMOKE PASSED');
if(fails) process.exitCode = 1;
