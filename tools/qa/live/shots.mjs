import { chromium } from 'playwright';
import fs from 'fs';
const OUT = '/home/user/live-shots';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'file:///home/user/glass-house-heist/dist/standalone.html';
const errors = [];
async function ready(page){
  await page.waitForFunction(() => window.__ARCADE && window.__ARCADE.get().ready, null, { timeout: 20000 });
  await page.waitForTimeout(350);
}
async function shot(page, name){
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
}
const browser = await chromium.launch();
try {
  /* ---- phone landscape (their failing case) ---- */
  let ctx = await browser.newContext({ viewport:{width:780,height:360}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
  let page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e));
  page.on('console', m => { if(m.type()==='error') errors.push('CONSOLE: ' + m.text()); });
  await page.goto(URL);
  await ready(page);
  await shot(page, '01-home-780x360');
  await page.evaluate(() => window.__ARCADE.enter('ghh'));
  await page.waitForFunction(() => window.__GAME.UI.get().screen === 'title', null, { timeout: 20000 });
  await page.waitForTimeout(300);
  await shot(page, '02-title-780x360');
  await page.evaluate(() => window.__GAME.actions.levels()); await page.waitForTimeout(250);
  await shot(page, '03-select-780x360');
  await page.evaluate(() => window.__GAME.actions.back());
  await page.evaluate(() => window.__GAME.actions.how()); await page.waitForTimeout(250);
  await shot(page, '04-how-780x360');
  await page.evaluate(() => window.__GAME.actions.back());
  await page.evaluate(() => window.__GAME.actions.settings()); await page.waitForTimeout(250);
  await shot(page, '05-settings-780x360');
  await page.evaluate(() => window.__GAME.actions.back());
  await page.evaluate(() => window.__GAME.Game.load(0));
  await page.waitForFunction(() => window.__GAME.Game.state === 'play');
  await page.waitForTimeout(900);   /* toast visible — real gameplay moment */
  await shot(page, '06-gameplay-780x360');
  await page.evaluate(() => window.__GAME.Game.togglePause()); await page.waitForTimeout(350);
  await shot(page, '07-pause-780x360');
  await page.evaluate(() => { window.__GAME.Game.resume();
    window.__GAME.Game.notes.forEach(n => n.got = true);
    window.__GAME.Game.cat.x = window.__GAME.Game.exit.x + 18;
    window.__GAME.Game.cat.y = window.__GAME.Game.exit.y + 36; });
  await page.waitForFunction(() => window.__GAME.UI.get().screen === 'complete', null, { timeout: 10000 });
  await page.waitForTimeout(900);
  await shot(page, '08-complete-780x360');
  await page.evaluate(() => window.__ARCADE.enter('dash'));
  await page.waitForFunction(() => !document.querySelector('.dash-loading'), null, { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.keyboard.press('Space'); await page.waitForTimeout(400);
  await shot(page, '09-dash-780x360');
  await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  await shot(page, '10-dash-pause-780x360');
  await ctx.close();

  /* ---- phone portrait ---- */
  ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:true, hasTouch:true });
  page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(portrait): ' + e));
  await page.goto(URL); await ready(page);
  await shot(page, '11-home-portrait');
  await page.evaluate(() => window.__ARCADE.enter('ghh'));
  await page.waitForFunction(() => window.__GAME.UI.get().screen === 'title');
  await page.waitForTimeout(300);
  await shot(page, '12-title-portrait');
  await ctx.close();

  /* ---- desktop ---- */
  ctx = await browser.newContext({ viewport:{width:1280,height:800}, deviceScaleFactor:1 });
  page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR(desktop): ' + e));
  await page.goto(URL); await ready(page);
  await shot(page, '13-home-desktop');
  await page.evaluate(() => window.__ARCADE.enter('ghh'));
  await page.waitForFunction(() => window.__GAME.UI.get().screen === 'title');
  await page.evaluate(() => window.__GAME.actions.settings()); await page.waitForTimeout(250);
  await shot(page, '14-settings-desktop');
  await page.evaluate(() => { window.__GAME.actions.back();
    window.__GAME.Game.load(0); });
  await page.waitForFunction(() => window.__GAME.Game.state === 'play');
  await page.waitForTimeout(700);
  await shot(page, '15-gameplay-desktop');
  await ctx.close();
} finally { await browser.close(); }
console.log('ERRORS(' + errors.length + '):');
errors.slice(0, 10).forEach(e => console.log(' ', e.slice(0, 200)));
