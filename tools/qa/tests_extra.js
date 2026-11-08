function assert(c,m){ if(!c){console.error("FAIL:",m);process.exitCode=1;throw new Error(m);} else console.log("  ok:",m); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ try{
  await sleep(750);
  /* ---- every button handler, from sensible states ---- */
  let n=0,fail=0;
  const tryClick=id=>{ const el=__els[id]; if(!el||typeof el.onclick!=='function')return;
    try{ el.onclick(); n++; }catch(e){ fail++; console.error('BUTTON FAIL:',id,e.message); } };
  Game.load(0);
  tryClick('btnPause');
  tryClick('bRestart');
  tryClick('btnPause');
  tryClick('bPauseLevels');
  tryClick('bCompLevels');
  tryClick('bRetryC');
  tryClick('bRetryO');
  tryClick('bOverLevels');
  tryClick('bOverTitle');
  Game.load(0);
  Game.notes.forEach(x=>x.got=true);
  Game.cat.x=Game.exit.x+18; Game.cat.y=Game.exit.y+36;
  __tick(130);
  assert(Game.state==='complete','complete reachable for mash');
  tryClick('bNext');
  assert(Game.state==='play','bNext from complete works');
  /* ---- game over timer actually fires ---- */
  Game.load(0);
  Game.lives=1; Game.cat.invuln=0;
  Game.hurt('alarm');
  assert(Game.lives===0,'life drained');
  await sleep(900);
  assert(Game.state==='over','gameOver fires after delay (state='+Game.state+')');
  assert(__els['scr-over'].classList.contains('hidden')===false,'game-over screen visible');
  assert(document.getElementById('ovMsg')!==null,'game-over message element present');
  tryClick('bRetryO');
  assert(Game.state==='play' && Game.lives===3,'RETRY restarts with fresh lives');
  console.log('  buttons clicked OK: '+n+', failures: '+fail);
  assert(fail===0,'all button handlers throw-free');
  Game.state='title';
  for(let i=0;i<120;i++)__tick(1);
  assert(true,'title idle stable');
  console.log('\nEXTRA QA PASSED');
}catch(e){ console.error('\nEXTRA FAIL:',e.stack||e); process.exitCode=1; }})();
