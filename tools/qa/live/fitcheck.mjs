import { chromium } from 'playwright';
const URL = 'file:///home/user/glass-house-heist/dist/standalone.html';
const TOL = 2;
const violations = [];
async function check(page, label, sel, vw, vh){
  const boxes = await page.$$eval(sel, els => els.map(e => {
    const r = e.getBoundingClientRect();
    return { cls: (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || e.id || e.tagName,
             x: r.x, y: r.y, w: r.width, h: r.height };
  }));
  for (const b of boxes){
    if (b.w === 0 && b.h === 0) continue;
    if (b.x < -TOL || b.y < -TOL || b.x + b.w > vw + TOL || b.y + b.h > vh + TOL)
      violations.push(`${label}: "${String(b.cls).slice(0,42)}" box(${b.x.toFixed(0)},${b.y.toFixed(0)},${b.w.toFixed(0)}x${b.h.toFixed(0)}) outside ${vw}x${vh}`);
  }
}
const b = await chromium.launch();
async function session(vw, vh, mobile, fn, tag){
  const ctx = await b.newContext({ viewport:{width:vw,height:vh}, deviceScaleFactor:1, isMobile:mobile, hasTouch:mobile });
  const page = await ctx.newPage();
  page.on('pageerror', e => violations.push(`${tag}: PAGEERROR ${String(e).slice(0,160)}`));
  await page.goto(URL);
  await page.waitForFunction(() => window.__ARCADE && window.__ARCADE.get().ready, null, {timeout:20000});
  await page.waitForTimeout(300);
  await fn(page, vw, vh);
  await ctx.close();
}
const nav = async (page, fn) => { await page.evaluate(fn); await page.waitForTimeout(320); };

await session(780,360, true, async (page,vw,vh) => {
  await check(page,'home','.arcade-bar,.featured,.game-grid,.arcade-foot,.arcade-chip,.arcade-bar .btn',vw,vh);
  await nav(page,()=>window.__ARCADE.enter('ghh'));
  await page.waitForFunction(()=>window.__GAME.UI.get().screen==='title');
  await check(page,'title','.logo,.title-stage,.btnrow,.settings-row',vw,vh);
  await nav(page,()=>window.__GAME.actions.levels());
  await check(page,'select','.lvgrid,.lvgrid .lvcard,#scr-select .btnrow',vw,vh);
  await nav(page,()=>window.__GAME.actions.back());
  await nav(page,()=>window.__GAME.actions.how());
  await check(page,'how','.acc-wrap,.acc-item,#scr-how .btnrow',vw,vh);
  await nav(page,()=>window.__GAME.actions.back());
  await nav(page,()=>window.__GAME.actions.settings());
  await check(page,'settings','.settings-panel,.set-row,#scr-settings .btnrow',vw,vh);
  await nav(page,()=>window.__GAME.actions.back());
  await nav(page,()=>window.__GAME.Game.load(0));
  await page.waitForFunction(()=>window.__GAME.Game.state==='play');
  await page.waitForTimeout(500);
  await check(page,'play','.hud-tl,.hud-tr,.hud-bl,#hEnc,#touch .tbtn',vw,vh);
  await nav(page,()=>window.__GAME.Game.togglePause());
  await check(page,'pause','.pausecard,.pausecard .btn',vw,vh);
  await nav(page,()=>window.__GAME.Game.resume());
  await nav(page,()=>{ window.__GAME.Game.notes.forEach(n=>n.got=true);
    window.__GAME.Game.cat.x=window.__GAME.Game.exit.x+18;
    window.__GAME.Game.cat.y=window.__GAME.Game.exit.y+36; });
  await page.waitForFunction(()=>window.__GAME.UI.get().screen==='complete',{timeout:8000}).catch(()=>{});
  await page.waitForTimeout(700);
  await check(page,'complete','.ov-inner,.stars,.awards,.breakdown,#scr-complete .btnrow',vw,vh);
  await nav(page,()=>window.__ARCADE.enter('dash'));
  await page.waitForFunction(()=>!document.querySelector('.dash-loading'),{timeout:15000}).catch(()=>{});
  await page.waitForTimeout(400);
  await check(page,'dash','.dash-hud,.dash-score,.dash-notes,.dash-best,.dash-pause',vw,vh);
}, 'phone-land');

await session(390,844, true, async (page,vw,vh) => {
  await check(page,'home-P','.arcade-bar,.featured,.game-grid,.arcade-foot',vw,vh);
  await nav(page,()=>window.__ARCADE.enter('ghh'));
  await page.waitForFunction(()=>window.__GAME.UI.get().screen==='title');
  await check(page,'title-P','.logo,.title-stage,.btnrow,.settings-row,.tiny',vw,vh);
  await nav(page,()=>window.__GAME.actions.settings());
  await check(page,'settings-P','.settings-panel,#scr-settings .btnrow',vw,vh);
}, 'phone-portrait');

await session(1280,800, false, async (page,vw,vh) => {
  await check(page,'home-D','.arcade-bar,.featured,.game-grid,.arcade-foot',vw,vh);
  await nav(page,()=>window.__ARCADE.enter('ghh'));
  await page.waitForFunction(()=>window.__GAME.UI.get().screen==='title');
  await check(page,'title-D','.logo,.title-stage,.btnrow,.settings-row',vw,vh);
  await nav(page,()=>window.__GAME.actions.how());
  await check(page,'how-D','.acc-wrap,#scr-how .btnrow',vw,vh);
}, 'desktop');

await b.close();
if (violations.length){
  console.log('FIT VIOLATIONS (' + violations.length + '):');
  violations.forEach(v => console.log('  ✗', v));
  process.exit(1);
} else {
  console.log('FIT CHECK PASSED — every audited element fits inside the viewport (3 devices,13 states)');
}
