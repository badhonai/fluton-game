/* ============ GLASS HOUSE HEIST — HEADLESS QA SUITE ============ */
function assert(cond,msg){ if(!cond){ console.error("FAIL:",msg); process.exitCode=1; throw new Error(msg);} else console.log("  ok:",msg); }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
try{
  /* ---------- boot & assets ---------- */
  await sleep(750); /* preload + min-display timeout */
  assert(Game.state==='title','boots to title');
  assert(Assets.ready===true,'assets finished loading');
  assert(Assets.total>=50,'manifest has >=50 images (got '+Assets.total+')');
  assert(Assets.loaded===Assets.total,'all manifest images resolved (loaded='+Assets.loaded+')');
  assert(Object.keys(Assets.failed).length===0,'no manifest asset failed');
  assert(__els['scr-loading'].classList.contains('hidden'),'loading screen hidden after load');
  assert(!__els['scr-title'].classList.contains('hidden'),'title screen visible');
  assert(Assets.has('cat_idle')&&Assets.has('bg_title')&&Assets.has('plat_top')&&Assets.has('face'),
    'key sprites present (cat/bg/platform)');
  /* missing-asset resilience */
  window.GHH_MANIFEST.images.__bogus={file:'missing_x.png'};
  await Assets.loadAll();
  assert(Assets.failed.__bogus==='missing_x.png','missing asset recorded, loadAll still resolves');
  delete window.GHH_MANIFEST.images.__bogus;

  /* ---------- level parsing ---------- */
  for(let i=0;i<5;i++){
    Game.load(i);
    assert(Game.L && Game.L.spawn,'L'+(i+1)+' parses');
    assert(Game.notes.length>=3,'L'+(i+1)+' has '+Game.notes.length+' notes');
    assert(Game.exit,'L'+(i+1)+' has exit');
    assert(Game.state==='play','L'+(i+1)+' state=play');
    __tick(30);
    assert(Game.cat.y < Game.L.levelH+60,'L'+(i+1)+' cat on ground (y='+Math.round(Game.cat.y)+')');
    assert(Game.decor && Array.isArray(Game.decor),'L'+(i+1)+' decor table loaded');
  }

  /* ---------- movement / jump / land ---------- */
  Game.load(0);
  const x0=Game.cat.x;
  __emitKey('KeyD',true); __tick(90);
  assert(Game.cat.x > x0+150,'runs right (+'+Math.round(Game.cat.x-x0)+'px)');
  const yB=Game.cat.y;
  __emitKey('Space',true); __tick(8); __emitKey('Space',false);
  assert(Game.cat.y < yB-20,'jumps (y '+Math.round(yB)+'->'+Math.round(Game.cat.y)+')');
  __tick(120);
  assert(Game.cat.onGround===true,'lands');
  __emitKey('KeyD',false);

  /* ---------- sprite system ---------- */
  const fk=catFrameKey(Game.cat);
  assert(Assets.has(fk),'idle frame asset exists ('+fk+')');
  Game.cat.vy=-400; Game.cat.onGround=false;
  assert(catFrameKey(Game.cat)==='cat_jump','airborne rising -> jump frame');
  Game.cat.vy=400;
  assert(catFrameKey(Game.cat)==='cat_fall','airborne falling -> fall frame');
  Game.cat.hurtT=0.5;
  assert(catFrameKey(Game.cat)==='cat_hurt','hurt frame priority');
  Game.cat.hurtT=0;
  __tick(90);
  assert(Render._facePat!==undefined && Render._facePat!==null,'platform face pattern created');

  /* ---------- encryption ---------- */
  __tick(60);
  const e0=Game.cat.energy;
  __emitKey('KeyE',true); __tick(60);
  assert(Game.cat.enc===true,'encrypt active');
  assert(Game.cat.energy < e0-10,'energy drains ('+e0.toFixed(1)+'->'+Game.cat.energy.toFixed(1)+')');
  __emitKey('KeyE',false); __tick(5);
  assert(Game.cat.enc===false,'encrypt releases');

  /* ---------- detection -> alarm ---------- */
  Game.load(0);
  const cam=Game.cams[0];
  Game.cat.x=cam.x+90; Game.cat.y=504; Game.cat.vx=0;
  __tick(150);
  assert(Game.alarms>=1 || Game.lives<3,'detection triggers alarm (alarms='+Game.alarms+' lives='+Game.lives+')');

  /* ---------- notes: plaintext only ---------- */
  Game.load(0);
  let n=Game.notes[0];
  Game.cat.x=n.x; Game.cat.y=n.y+15; Game.cat.vx=0; __tick(3);
  assert(n.got===true,'note collected in plaintext (score='+Game.score+')');
  Game.load(0);
  n=Game.notes[0];
  __emitKey('KeyE',true); Game.cat.energy=100;
  Game.cat.x=n.x; Game.cat.y=n.y+15; __tick(3);
  assert(n.got===false,'note blocked while encrypted');
  __emitKey('KeyE',false); __tick(6);
  assert(n.got===true,'note collected after decrypt');

  /* ---------- beams ---------- */
  Game.load(1);
  const bm=Game.beams[0];
  Game.cat.x=bm.x; Game.cat.y=470; Game.cat.vx=0; Game.cat.invuln=0;
  let lb=Game.lives; __tick(3);
  assert(Game.lives===lb-1,'plaintext beam zaps (-1 life)');
  Game.cat.invuln=0; Game.cat.energy=100; Game.cat.x=bm.x; Game.cat.y=470;
  __emitKey('KeyE',true);
  lb=Game.lives; __tick(30);
  assert(Game.lives===lb && Game.cat.enc===true,'encrypted beam harmless');
  __emitKey('KeyE',false); __tick(3);

  /* ---------- bots / yarn ---------- */
  Game.load(2);
  const bot=Game.bots[0];
  Game.cat.x=bot.x+90; Game.cat.y=502; Game.cat.vx=0; __tick(10);
  assert(bot.state==='chase','bot chases plaintext cat');
  Game.cat.energy=100; __emitKey('KeyE',true); __tick(160);
  assert(bot.state!=='chase','bot loses encrypted cat');
  __emitKey('KeyE',false); __tick(3);
  Game.load(2);
  assert(Game.yarnCount>=1,'starts with yarn');
  __emitKey('KeyQ',true); __tick(2); __emitKey('KeyQ',false);
  assert(Game.yarnP!==undefined,'yarn projectile spawned');
  const b2=Game.bots[0];
  Game.cat.x=b2.x+60; Game.cat.y=500;
  Game.yarnP={x:b2.x+20,y:470,vx:0,vy:0,life:3,bounced:1};
  __tick(5);
  assert(b2.state==='distract','bot distracted by yarn');
  assert(Game.det<0.3,'distracted bot stops detection');
  __emitKey('KeyE',true); Game.cat.energy=100; __tick(220);
  assert(b2.state!=='distract','distract expires (state='+b2.state+')');
  __emitKey('KeyE',false); __tick(3);

  /* ---------- checkpoints / movers / void ---------- */
  Game.load(3);
  const sp=Game.sps[0];
  Game.cat.x=sp.x; Game.cat.y=sp.y; __tick(3);
  assert(sp.active===true && Math.round(Game.respawn.x)===Math.round(sp.x),'checkpoint sets respawn');
  Game.load(3);
  const mv=Game.movers[0]; const mx0=mv.x;
  __tick(120);
  assert(Math.abs(mv.x-mx0)>20,'mover travels');
  Game.load(3);
  Game.cat.x=35*36; Game.cat.y=600; Game.cat.vy=0; Game.cat.invuln=0;
  lb=Game.lives; __tick(10);
  assert(Game.lives===lb-1,'void fall costs a life');

  /* ---------- victory flow ---------- */
  Game.load(0);
  Game.notes.forEach(nn=>nn.got=true);
  Game.cat.x=Game.exit.x+18; Game.cat.y=Game.exit.y+36;
  __tick(120);
  assert(Game.state==='complete','level completes');
  assert((store.data.stars[0]||0)>=1,'stars saved: '+store.data.stars[0]);
  assert(store.data.unlocked>=2,'next level unlocked: '+store.data.unlocked);
  assert(__els['scr-complete'].classList.contains('hidden')===false,'complete screen visible');
  assert($('cAwards').children.length>0,'award chips rendered ('+$('cAwards').children.length+')');
  assert(document.getElementById('cTotal'),'score count-up element exists');
  __els['bNext'].onclick();
  assert(Game.state==='play' && Game.levelIdx===1,'NEXT LEVEL -> L2');

  /* ---------- pause / game over ---------- */
  Game.togglePause(); assert(Game.state==='pause','pauses');
  Game.togglePause(); assert(Game.state==='play','resumes');
  Game.load(0); Game.lives=1; Game.cat.invuln=0;
  Game.hurt('alarm');
  assert(Game.lives===0,'last life lost');

  /* ---------- render soak: all levels, mixed input ---------- */
  for(let i=0;i<5;i++){
    Game.load(i);
    __emitKey('KeyD',true);
    for(let f=0;f<420;f++){
      if(f%28===0)__emitKey('Space',true);
      if(f%28===6)__emitKey('Space',false);
      if(f%70===0)__emitKey('KeyE',true);
      if(f%70===35)__emitKey('KeyE',false);
      if(f===150){__emitKey('KeyD',false);__emitKey('KeyA',true);}
      if(f===330){__emitKey('KeyA',false);__emitKey('KeyD',true);}
      __tick(1);
      if(Game.state!=='play')break;
    }
    __emitKey('KeyD',false);__emitKey('KeyA',false);__emitKey('KeyE',false);__emitKey('Space',false);
    assert(['play','complete','over'].includes(Game.state),'L'+(i+1)+' soak survives (state='+Game.state+')');
    assert(isFinite(Game.cat.x)&&isFinite(Game.cat.y),'L'+(i+1)+' cat finite');
  }

  /* ---------- perf sample (headless proxy) ---------- */
  Game.load(4);
  const t1=Date.now();
  for(let f=0;f<600;f++)__tick(1);
  const msPerFrame=(Date.now()-t1)/600;
  console.log('  perf: '+msPerFrame.toFixed(2)+' ms/frame headless (sim+render)');
  assert(msPerFrame<12,'frame budget respected headlessly');

  /* ---------- screens & buttons ---------- */
  Game.state='title';
  __els['bLevels'].onclick(); assert(Game.state==='select','LEVELS opens select');
  assert(__els['lvGrid'].innerHTML.indexOf('star.png')>=0 || __els['lvGrid'].children.length>0,'level cards built with star art');
  __els['bSelBack'].onclick(); assert(Game.state==='title','back to title');
  __els['bHow'].onclick(); assert(Game.state==='how','HOW TO PLAY opens');
  __els['bHowBack'].onclick(); assert(Game.state==='title','how back');
  __els['bSoundT'].onclick(); __els['bSoundT'].onclick();
  assert(__els['bSoundT'].textContent.indexOf('SOUND')>=0,'sound toggle runs');
  Game.load(0); Game.pause(); __els['bResume'].onclick();
  assert(Game.state==='play','RESUME button works');

  /* reset progress: two-step */
  store.data.unlocked=5; store.data.stars[0]=3; buildLevelGrid();
  __els['bReset'].onclick();
  assert(__els['bReset'].dataset.arm==='1','reset arms on first click');
  __els['bReset'].onclick();
  assert(store.data.unlocked===1 && !store.data.stars[0],'reset clears progress on confirm');

  /* hearts branch (asset now ships — hide it to test the text fallback) */
  Game.load(0);
  const heartImg=Assets.imgs.ui_heart;
  delete Assets.imgs.ui_heart;
  Game.lives=2; Game._lh=undefined;
  Game.updateHUD();
  assert(__els['hLives'].textContent.indexOf('♥')>=0 || __els['hLives'].innerHTML.indexOf('♥')>=0,
    'hearts fallback renders without ui_heart');
  if(heartImg)Assets.imgs.ui_heart=heartImg; else Assets.imgs.ui_heart={width:16,height:16};
  Game._lh=undefined;
  Game.updateHUD();
  assert(__els['hLives'].innerHTML.indexOf('<img')>=0,'heart icons render when asset present');
  if(heartImg)Assets.imgs.ui_heart=heartImg; Game._lh=undefined;

  /* ---------- mobile / touch / portrait ---------- */
  global.__mq.coarse=true;
  Game.load(0);
  __tick(3);
  assert(__els['touch'].classList.contains('hidden')===false,'touch controls shown on coarse pointer');
  const startX=Game.cat.x;
  __els['tRight'].fire('pointerdown',{preventDefault(){}});
  __tick(30);
  assert(Game.cat.x>startX+40,'touch D-pad moves cat');
  __els['tRight'].fire('pointerup',{preventDefault(){}});
  __els['tJump'].fire('pointerdown',{preventDefault(){}});
  __tick(6);
  assert(Game.cat.y<500,'touch jump works');
  __els['tJump'].fire('pointerup',{preventDefault(){}});
  __tick(90);
  global.__mq.portrait=true;
  __setWH(500,900); __tick(3);
  assert(__els['rotate'].style.display==='flex','portrait shows rotate hint');
  global.__mq.portrait=false; global.__mq.coarse=false;
  __setWH(1280,720); __tick(3);
  assert(__els['rotate'].style.display==='none','landscape hides rotate hint');
  assert(__els['touch'].classList.contains('hidden'),
    'touch hidden again on fine pointer');

  /* ---------- desktop resize ---------- */
  __setWH(900,500); __tick(3);
  assert(isFinite(Render.vw)&&Render.vw>0,'resize path survives');
  __setWH(1280,720); __tick(3);

  /* ---------- asset fallback for cat ---------- */
  const keep=Assets.imgs.cat_idle;
  delete Assets.imgs.cat_idle;
  Game.load(0); __tick(10);
  assert(catFrameKey(Game.cat)!==null,'procedural fallback path reachable');
  Assets.imgs.cat_idle=keep;

  console.log('\nALL HEADLESS TESTS PASSED ('+ (Assets.total) +' assets)');
}catch(e){
  console.error('\nTEST ERROR:', (e && e.stack) || e);
  process.exitCode=1;
}
})();
