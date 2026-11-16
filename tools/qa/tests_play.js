/* ============ AUTOMATED PLAYTEST — scripted fuzz on every level ============
   Deterministic PRNG inputs (move/jump/encrypt/yarn) for10s per level;
   asserts: no crash, finite state, real progress, no soft-locks. */
function assert(cond,msg){ if(!cond){ console.error("FAIL:",msg); process.exitCode=1; throw new Error(msg);} else console.log("  ok:",msg); }
const {Game,UI,actions,store}=window.__GAME;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
(async()=>{ try{
  window.__GAME.boot();
  await new Promise(r=>setTimeout(r,700));
  let totalDeaths=0, totalCompletes=0;
  for(let lv=0;lv<5;lv++){
    Game.load(lv);
    const rand=mulberry32(1234+lv*777);
    const startX=Game.cat.x;
    let maxX=startX, acts={left:false,right:false,jump:false,enc:false,yarn:false};
    let hold=0, cur={};
    for(let f=0;f<600;f++){
      if(hold<=0){
        hold=8+Math.floor(rand()*40);
        cur={ left:rand()<.3, right:rand()<.75, jump:rand()<.4,
              enc:rand()<.3, yarn:rand()<.06 };
        for(const k in acts){ if(acts[k]!==cur[k]){ acts[k]=cur[k];
          window.__GAME.Input.setTouch(k,cur[k]); } }
      }
      hold--;
      __tick(1);
      maxX=Math.max(maxX,Game.cat.x);
      if(Game.state!=='play')break;
    }
    for(const k in acts) window.__GAME.Input.setTouch(k,false);
    const st=Game.state, okState=(st==='play'||st==='complete'||st==='over');
    assert(okState,'L'+(lv+1)+' fuzz: legal end state ('+st+')');
    assert(isFinite(Game.cat.x)&&isFinite(Game.cat.y)&&isFinite(Game.det),
      'L'+(lv+1)+' fuzz: state finite (no NaN)');
    const progressed = st!=='play' || maxX>startX+150 || Game.lives===0;
    assert(progressed,'L'+(lv+1)+' fuzz: real progress or run ended (maxX+'+
      Math.round(maxX-startX)+', lives='+Game.lives+')');
    if(st==='complete')totalCompletes++;
    if(Game.lives===0)totalDeaths++;
    /* soft-lock probe: after inputs stop, sim keeps ticking cleanly */
    __tick(30);
    assert(isFinite(Game.cat.x),'L'+(lv+1)+' fuzz: stable after release');
  }
  console.log('  playtest summary: completes='+totalCompletes+' wipes='+totalDeaths);
  console.log('\nPLAYTEST SUITE PASSED (5 levels x 10s fuzzed input)');
}catch(e){ console.error('\nPLAYTEST ERROR:',(e&&e.stack)||e); process.exitCode=1; } })();
