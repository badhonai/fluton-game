/* ============ FLUTON ARCADE — HEADLESS ARCADE SUITE ============ */
function assert(cond,msg){ if(!cond){ console.error("FAIL:",msg); process.exitCode=1; throw new Error(msg);} else console.log("  ok:",msg); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const G=window.__GAME, UIA=window.__ARCADE;
const {Game,UI,store,actions,Assets,SFX}=G;
(async()=>{
try{
  /* ---------- preload ---------- */
  await UIA.start();
  assert(UIA.get().ready===true,'arcade ready after preload');
  assert(Assets.ready===true && Assets.total>=50,'shared asset pool loaded ('+Assets.total+')');
  assert(UIA.get().loading===100,'loading reached 100');

  /* ---------- catalog ---------- */
  const GAMES=window.__GAMES;
  assert(GAMES && GAMES.length===4,'catalog has 4 games');
  assert(GAMES.filter(g=>g.status==='playable').length===2,'2 playable games');
  assert(GAMES.every(g=>g.icon && (g.icon.indexOf('assets/')===0||g.icon.indexOf('data:image/')===0)),'every game has an icon path');
  assert(GAMES.filter(g=>g.status==='playable').every(g=>g.Component),'playables have components');

  /* ---------- home state ---------- */
  assert(UIA.get().screen==='home','boots to arcade home');

  /* ---------- enter GHH as arcade module ---------- */
  UIA.enter('ghh');
  assert(UIA.get().screen==='game' && UIA.get().gameId==='ghh','enter(ghh) hosts the game');
  G.enterArcade(()=>UIA.exit());
  assert(G.isActive()===true,'engine loop active while hosted');
  assert(UI.get().arcade===true,'GHH knows it is in arcade mode');
  Game.load(0); __tick(60);
  assert(Game.state==='play','GHH playable inside arcade');

  /* ---------- exit via pause-menu action ---------- */
  actions.arcadeExit();
  assert(UIA.get().screen==='home','arcadeExit returns home');
  assert(G.isActive()===false,'engine loop parked after exit');
  assert(Game.state==='pause','mid-run exit pauses the run');
  assert(UI.get().arcade===false && UI.get().onExit===null,'arcade flags cleared');

  /* ---------- re-enter (second mount cycle) ---------- */
  UIA.enter('ghh');
  G.enterArcade(()=>UIA.exit());
  assert(G.isActive()===true,'re-entry reactivates engine');
  assert(UI.get().screen==='pause','resume shows the pause overlay where you left');
  actions.resume();
  assert(Game.state==='play','resume continues the run');
  G.leaveArcade();

  /* ---------- metadata ---------- */
  assert(UIA.get().meta.last.ghh>0,'lastPlayed recorded for ghh');
  assert((localStorage.getItem('arcade-meta')||'').indexOf('ghh')>=0,'meta persisted namespaced');

  /* ---------- Glass Dash engine (headless sim) ---------- */
  const Dash=window.__DASH, KEY=window.__DASH_KEY;
  assert(!!Dash && !!KEY,'dash engine exposed');
  const e=new Dash({});
  e.layout(960,540);
  assert(e.groundY===432,'ground layout (80% of 540)');
  for(let i=0;i<90;i++)e.update(1/60);
  assert(e.state==='run' && e.score>0,'dash runs and scores ('+e.score+')');
  /* jump + variable height */
  e.jump(); e.update(1/60);
  assert(e.cat.h>0 || e.cat.vy>0,'dash jump leaves ground');
  e.release(); e.update(1/60);
  for(let i=0;i<120;i++)e.update(1/60);
  assert(e.cat.onGround===true,'dash cat lands (coyote/buffer cycle)');
  /* block obstacle kills (after a real run so score > 0) */
  e.reset();
  for(let i=0;i<90;i++)e.update(1/60);
  assert(e.score>0,'dash accumulated score before crash ('+e.score+')');
  e.obstacles.push({x:e.dist+960*0.28, w:40, h:60, type:'block', ph:0, on:true});
  e.update(1/60);
  assert(e.state==='dead','block collision ends the run');
  const evs=e.drain();
  assert(evs.some(x=>x.type==='die'),'death event emitted');
  assert(e.best===e.score && (localStorage.getItem(KEY)||'0')===String(e.score),'best score persisted namespaced');
  /* gate: off phase is passable */
  e.reset();
  e.obstacles.push({x:960*0.28, w:20, h:150, type:'gate', ph:1.5, on:false});
  e.t=0;
  e.update(1/60);
  assert(e.state==='run','open gate is passable');
  /* gate: on phase kills */
  e.reset();
  e.obstacles.push({x:960*0.28, w:20, h:150, type:'gate', ph:0, on:true});
  e.t=0;
  e.update(1/60);
  assert(e.state==='dead','closed gate kills');
  /* score/best carry into reset */
  e.reset();
  assert(e.state==='run' && e.best>0,'reset restarts, best retained');

  /* ---------- shared sound system ---------- */
  const before=SFX.isMuted();
  actions.sound();
  assert(SFX.isMuted()!==before,'arcade sound toggle drives engine SFX');
  actions.sound();

  /* ---------- all arcade-facing actions throw-free ---------- */
  let fail=0;
  for(const fn of ['levels','how','back','sound','pause','resume']){
    try{ actions[fn](); }catch(err){ fail++; console.error('action fail',fn,err.message); }
  }
  assert(fail===0,'arcade-reachable actions are throw-free');
  G.leaveArcade();

  console.log('\nARCADE SUITE PASSED');
}catch(e){
  console.error('\nARCADE TEST ERROR:',(e&&e.stack)||e);
  process.exitCode=1;
}
})();
