function assert(c,m){ if(!c){console.error("FAIL:",m);process.exitCode=1;throw new Error(m);} else console.log("  ok:",m); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const {Game,store,actions,UI}=window.__GAME;
(async()=>{ try{
  window.__GAME.boot();
  await sleep(750);
  /* ---- every action handler, from sensible states ---- */
  let n=0,fail=0;
  const tryAct=(name,fn)=>{ try{ fn(); n++; }catch(e){ fail++; console.error('ACTION FAIL:',name,e.message); } };
  Game.load(0);
  tryAct('pause',()=>actions.pause());
  tryAct('restart',()=>actions.restart());
  tryAct('pause',()=>actions.pause());
  tryAct('pauseLevels',()=>actions.pauseLevels());
  tryAct('levels',()=>actions.levels());
  tryAct('how',()=>actions.how());
  tryAct('back',()=>actions.back());
  tryAct('sound',()=>actions.sound());
  tryAct('sound',()=>actions.sound());
  tryAct('level',()=>actions.level(2));
  assert(Game.levelIdx===2,'actions.level(2) loads L3');
  tryAct('overTitle',()=>actions.overTitle());
  assert(UI.get().screen==='title','overTitle -> title');
  tryAct('play',()=>actions.play());
  tryAct('retry',()=>actions.retry());
  tryAct('overLevels',()=>actions.overLevels());
  assert(UI.get().screen==='select','overLevels -> select');
  /* complete flow through actions */
  Game.load(0);
  Game.notes.forEach(x=>x.got=true);
  Game.cat.x=Game.exit.x+18; Game.cat.y=Game.exit.y+36;
  __tick(130);
  assert(Game.state==='complete','complete reachable via actions');
  tryAct('next',()=>actions.next());
  assert(Game.state==='play','actions.next continues');
  /* game over timer */
  Game.load(0);
  Game.lives=1; Game.cat.invuln=0;
  Game.hurt('alarm');
  assert(Game.lives===0,'life drained');
  await sleep(900);
  assert(Game.state==='over','gameOver fires after delay');
  tryAct('retry',()=>actions.retry());
  assert(Game.state==='play' && Game.lives===3,'RETRY fresh lives');
  console.log('  actions exercised OK: '+n+', failures: '+fail);
  assert(fail===0,'all action handlers throw-free');
  Game.state='title'; UI.set({screen:'title'});
  for(let i=0;i<120;i++)__tick(1);
  assert(true,'title idle stable');
  console.log('\nEXTRA QA PASSED');
}catch(e){ console.error('\nEXTRA FAIL:',e.stack||e); process.exitCode=1; }})();
