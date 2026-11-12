"use strict";
/* ============================================================
   GLASS HOUSE HEIST
   A stealth-platformer teaching how Fluton works:
   plaintext = visible · encrypted = ghost · notes need plaintext
   ============================================================ */

/* ================= 1 · CONFIG & UTIL ================= */
const CFG = {
  TILE:36, VIEW_W:960, VIEW_H:540,
  GRAV:2100, MAX_FALL:900,
  RUN:245, ACC:2000, AIR_ACC:1350, FRIC:2400,
  JUMP:-800, JUMP_CUT:0.45, COYOTE:0.10, BUFFER:0.12,
  ENC_DRAIN:22, ENC_REGEN:13, REGEN_DELAY:0.6,
  DET_FILL:1.30, DET_DECAY:0.42,
  CAM_RANGE:4.6*36, CAM_HALF:0.66, CAM_SWEEP:0.72, CAM_SPEED:1.9,
  BOT_RANGE:3.4*36, BOT_HALF:0.78,
  BOT_PATROL:66, BOT_CHASE:168,
  YARN_VX:420, YARN_VY:-200, YARN_LIFE:4.2, YARN_DISTRACT:2.6, YARN_R:155,
  LIVES:3, INVULN:1.6
};
const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
function mulberry(seed){let a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function fmtTime(s){const m=Math.floor(s/60),ss=Math.floor(s%60);return m+":"+(ss<10?"0":"")+ss;}

/* persistence (sandbox-safe) */
const store={data:{unlocked:1,stars:{},scores:{}},
  load(){try{const j=localStorage.getItem('ghh-save');if(j)this.data=Object.assign(this.data,JSON.parse(j));}catch(e){}},
  save(){try{localStorage.setItem('ghh-save',JSON.stringify(this.data));}catch(e){}}};
store.load();

/* ================= 1b · ASSETS ================= */
const MANIFEST = window.GHH_MANIFEST || {images:{},cat:{drawH:54}};
const Assets = {
  imgs:{}, failed:{}, loaded:0, total:0, ready:false,
  loadAll(onProgress){
    const entries = Object.entries(MANIFEST.images||{});
    this.total = entries.length;
    if(!entries.length){ this.ready = true; return Promise.resolve(); }
    return Promise.all(entries.map(([k,v]) => new Promise(res => {
      const im = new Image();
      im.onload  = () => { this.imgs[k]=im; this.loaded++; onProgress&&onProgress(this.loaded,this.total); res(); };
      im.onerror = () => { this.failed[k]=v.file; this.loaded++; if(window.console)console.warn('[asset missing]',v.file); onProgress&&onProgress(this.loaded,this.total); res(); };
      im.src = v.file;
    }))).then(()=>{ this.ready = true; });
  },
  get(k){ return this.imgs[k]||null; },
  has(k){ return !!this.imgs[k]; }
};
function assetMeta(k){ return (MANIFEST.images||{})[k] || null; }
function drawAsset(c,k,x,y,opt){
  opt = opt || {};
  const im = Assets.get(k); if(!im) return false;
  const m = assetMeta(k) || {};
  const ax = opt.ax!=null ? opt.ax : (m.ax!=null ? m.ax : 0.5);
  const ay = opt.ay!=null ? opt.ay : (m.ay!=null ? m.ay : 0.5);
  const sc = opt.scale || 1;
  const w = im.width*sc, h = im.height*sc;
  c.save();
  if(opt.alpha!=null) c.globalAlpha = opt.alpha;
  c.translate(x,y);
  if(opt.rot) c.rotate(opt.rot);
  if(opt.flip) c.scale(-1,1);
  if(opt.sx||opt.sy) c.scale(opt.sx||1, opt.sy||1);
  c.drawImage(im, -w*ax, -h*ay, w, h);
  c.restore();
  return true;
}
/* Cache pre-tinted sprites by source image, size and tint. Encryption can
   stay active for minutes, so rebuilding this offscreen image every frame
   needlessly burns CPU and allocates canvas work on mobile GPUs. */
const _tintCache = new WeakMap();
function drawTinted(c, im, x, y, w, h, color, alpha){
  const tw = Math.max(1, Math.ceil(w)), th = Math.max(1, Math.ceil(h));
  let variants = _tintCache.get(im);
  if(!variants){ variants = new Map(); _tintCache.set(im, variants); }
  const key = tw+'x'+th+'|'+color+'|'+alpha;
  let tinted = variants.get(key);
  if(!tinted){
    tinted = document.createElement('canvas');
    tinted.width = tw; tinted.height = th;
    const t = tinted.getContext('2d');
    t.drawImage(im, 0, 0, tw, th);
    t.globalCompositeOperation = 'source-atop';
    t.globalAlpha = alpha; t.fillStyle = color;
    t.fillRect(0,0,tw,th);
    t.globalAlpha = 1; t.globalCompositeOperation = 'source-over';
    variants.set(key, tinted);
  }
  c.drawImage(tinted, 0, 0, tw, th, x, y, w, h);
}

/* ================= 2 · AUDIO ================= */
const SFX=(()=>{let ctx=null,master=null,amb=null,muted=false;
  function ensure(){if(ctx)return;try{ctx=new(window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain();master.gain.value=.9;master.connect(ctx.destination);
    amb=ctx.createOscillator();const g=ctx.createGain();g.gain.value=0;
    amb.type='sine';amb.frequency.value=55;const lfo=ctx.createOscillator();const lg=ctx.createGain();
    lfo.frequency.value=.07;lg.gain.value=14;lfo.connect(lg);lg.connect(amb.frequency);
    const g2=ctx.createGain();g2.gain.value=0;const o2=ctx.createOscillator();o2.type='sine';o2.frequency.value=82.4;
    o2.connect(g2);g2.connect(master);amb.connect(g);g.connect(master);
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=320;
    amb.start();lfo.start();o2.start();g.gain.value=.012;g2.gain.value=.008;
  }catch(e){}}
  function resume(){ensure();if(ctx&&ctx.state==='suspended')ctx.resume();}
  function tone(f0,f1,dur,type,vol,delay){if(muted||!ctx)return;type=type||'sine';vol=vol||.14;delay=delay||0;
    const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(1,f0),t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.03);}
  function noise(dur,vol,fc){if(muted||!ctx)return;vol=vol||.2;
    const n=Math.max(1,(ctx.sampleRate*dur)|0),b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
    const s=ctx.createBufferSource();s.buffer=b;const g=ctx.createGain();g.gain.value=vol;
    let out=g;if(fc){const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=fc;s.connect(f);f.connect(g);}else s.connect(g);
    g.connect(master);s.start();}
  const api={
    resume,master:()=>master,
    click(){tone(560,320,.07,'square',.07);},
    jump(){tone(300,540,.13,'triangle',.13);},
    land(){tone(170,90,.09,'sine',.12);noise(.05,.06,900);},
    note(){tone(660,990,.14,'triangle',.15);tone(990,1320,.16,'triangle',.1,.07);},
    cell(){tone(480,920,.15,'sine',.13);},
    yarn(){tone(520,190,.16,'sine',.12);},
    distract(){tone(300,420,.12,'triangle',.12);},
    encOn(){tone(190,720,.24,'sawtooth',.1);tone(900,1500,.18,'sine',.05,.05);},
    encOff(){tone(700,210,.2,'sawtooth',.09);},
    phase(){tone(1150,1650,.09,'sine',.07);},
    tick(){tone(880,880,.05,'square',.06);},
    alarm(){tone(880,220,.55,'sawtooth',.16);noise(.3,.14,1400);},
    hurt(){noise(.28,.2,1100);tone(220,55,.3,'sawtooth',.14);},
    checkpoint(){tone(520,780,.12,'triangle',.12);tone(780,1040,.14,'triangle',.1,.09);},
    locked(){tone(200,140,.12,'square',.1);},
    win(){[523,659,784,1047].forEach((f,i)=>tone(f,f,.17,'triangle',.14,i*.11));},
    star(i){tone(700+i*220,700+i*220,.16,'triangle',.14);},
    unlock(){tone(660,660,.1,'triangle',.12);tone(880,880,.16,'triangle',.12,.1);},
    setMuted(m){muted=m;if(master)master.gain.value=m?0:.9;},
    isMuted(){return muted;}
  };return api;})();

/* ================= 3 · INPUT ================= */
const Input=(()=>{const down={},press={};
  const MAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',
    ArrowUp:'jump',KeyW:'jump',Space:'jump',
    KeyE:'enc',ShiftLeft:'enc',ShiftRight:'enc',KeyQ:'yarn',KeyJ:'yarn'};
  let anyGesture=false;
  function set(act,isDown){if(isDown&&!down[act])press[act]=true;down[act]=isDown;}
  function clear(){for(const k in down)down[k]=false;for(const k in press)press[k]=false;}
  function gesture(){if(!anyGesture){anyGesture=true;}SFX.resume();}
  window.addEventListener('keydown',e=>{
    if(e.repeat)return;gesture();
    const a=MAP[e.code];
    if(a){e.preventDefault();if(Game.state==='play'||Game.state==='title')set(a,true);}
    if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();Game.togglePause();}
    if(e.code==='KeyR'&&Game.state==='play')Game.load(Game.levelIdx,true);
    if(e.code==='KeyM'){e.preventDefault();toggleSound();}
  },{passive:false});
  window.addEventListener('keyup',e=>{const a=MAP[e.code];if(a){e.preventDefault();set(a,false);}},{passive:false});
  window.addEventListener('blur',()=>{if(Game.state==='play')Game.pause();Input.clear();});
  /* touch input arrives from React controls via setTouch */
  return {down:a=>!!down[a],pressed:a=>!!press[a],clear,
    consume(){for(const k in press)press[k]=false;},gesture,
    setTouch(act,isDown){gesture();set(act,isDown);}};
})();

/* ================= 4 · LEVELS ================= */
/* legend: # solid · C spawn · N note · E exit · P energy · Y yarn · S checkpoint
           > < ^ v cameras · | vertical beam · - horizontal beam · . empty        */
const LEVELS=[
{name:"THE ATRIUM",lesson:"Cameras read <b>plaintext</b>. Outrun the light \u2014 or the detection meter fills.",par:40,rows:[
   "................................................................................",
   "................................................................................",
   "................................................................................",
   "................................................................................",
   "................................................................................",
   "................................................................................",
   "................................................................................",
   "................................................................................",
   "................................................................................",
   "......................N.................................N.......................",
   "..............####..#####.............................#####....#####............",
   ".........N......................................................................",
   "........####....................................................................",
   ".C......####..................>.................>.............................E.",
   "################################################################################"
]},
{name:"LASER ALLEY",lesson:"Hold <b>E</b> to encrypt \u2014 beams can't read a ghost. Notes need you <b>in plaintext</b>.",par:55,rows:[
   "................................................................................................",
   "................................................................................................",
   "................................................................................................",
   "................................................................................................",
   "................|.............|.............|.............|.....................................",
   "................................................................................................",
   "................................................................................................",
   "................................................................................................",
   "................................................................................................",
   ".................................................................N..............................",
   "................................................................####............................",
   "................................................................................................",
   "................................................................................................",
   ".C..........P.........N...P.........N...P.........S...P.................>.......N.............E.",
   "################################################################################################"
]},
{name:"BOT PATROL",lesson:"MEV bots chase what they can see. <b>Q</b> throws yarn \u2014 bots love toys.",par:65,rows:[
   "..................................................................................................",
   "..................................................................................................",
   "..................................................................................................",
   "..................................................................................................",
   "..................................................................................................",
   "..................................................................................................",
   "..................................................................................................",
   "..................................................................................................",
   "..................................................................................................",
   "........................................N.........................................................",
   "......................................#####.......................................................",
   "............N...................................................................N.................",
   "...........####................................................................####...............",
   ".C....Y.............................>...S........S..Y...........N...............................E.",
   "############################################...###################################################"
]},
{name:"THE RELAY",lesson:"Ride the <b>relayer pads</b> over the void. Time the patrols on the islands.",par:75,rows:[
   "....................................................................................................",
   "....................................................................................................",
   "....................................................................................................",
   "....................................................................................................",
   "....................|.............................|.................................................",
   "....................................................................................................",
   "....................................................................................................",
   "....................................................................................................",
   "....................................................................................................",
   "....................................................................................................",
   "....................................................................................................",
   "..........N...........................................N.............................................",
   ".........####........................................####...........................................",
   ".C....Y.................>.N.S..................P.............S..............P.......>.N..........E..",
   "##############################................##################........############################"
]},
{name:"THE VAULT",lesson:"Everything you learned. One clean run. <b>Don't get read.</b>",par:95,rows:[
   "................................................................................................................",
   "................................................................................................................",
   "................................................................................................................",
   "................................................................................................................",
   "........................|......|.......................|........................................................",
   "................................................................................................................",
   "................................................................................................................",
   "................................................................................................................",
   "................................................................................................................",
   "................................................................................................................",
   "................................................................................................................",
   "..........N...............................................N.....................................................",
   ".........####............................................####..........N.............##...##....................",
   ".C....Y........>....P.......N......S..............P.........Y.....S.............P....##-..##........>...PN...E..",
   "######################################..........####################......######################################"
]}];
/* dynamic entities per level (tile coords): bots {min,max,row} · movers {x0,y0,x1,y1,w,spd} */
const LEVEL_DYN=[
  {bots:[],movers:[]},
  {bots:[],movers:[]},
  {bots:[{min:9,max:21,row:14},{min:56,max:70,row:14}],movers:[]},
  {bots:[{min:52,max:62,row:14}],movers:[{x0:31,y0:13,x1:36,y1:13,w:4,spd:2.8},{x0:39,y0:11,x1:39,y1:13,w:4,spd:3.6},{x0:43,y0:13,x1:46,y1:13,w:3,spd:2.6},{x0:65,y0:13,x1:69,y1:13,w:3,spd:3.0}]},
  {bots:[{min:52,max:62,row:14},{min:80,max:84,row:14}],movers:[{x0:39,y0:13,x1:42,y1:13,w:3,spd:3.0},{x0:44,y0:13,x1:45,y1:13,w:3,spd:3.4},{x0:69,y0:13,x1:71,y1:13,w:3,spd:2.8}]}
];

/* hand-placed set dressing (tile coords; bottom-anchored on surface of row ty) */
const LEVEL_DECOR=[
  [ {img:'plant',tx:6,ty:14,h:1.35},{img:'glass',tx:22,ty:10,h:1.05},
    {img:'rack',tx:40,ty:14,h:1.7},{img:'cone',tx:52,ty:14,h:0.95},
    {img:'sign',tx:70,ty:14,h:1.5} ],
  [ {img:'plant',tx:2,ty:14,h:1.35},{img:'glass',tx:66,ty:10,h:1.05},
    {img:'rack',tx:47,ty:14,h:1.7},{img:'cone',tx:57,ty:14,h:0.95},
    {img:'sign',tx:86,ty:14,h:1.5} ],
  [ {img:'plant',tx:3,ty:14,h:1.35},{img:'glass',tx:12,ty:12,h:1.05},
    {img:'sign',tx:33,ty:14,h:1.5},{img:'cone',tx:60,ty:14,h:0.95},
    {img:'rack',tx:75,ty:14,h:1.7} ],
  [ {img:'plant',tx:4,ty:14,h:1.35},{img:'glass',tx:10,ty:12,h:1.05},
    {img:'cone',tx:27,ty:14,h:0.95},{img:'glass',tx:54,ty:12,h:1.05},
    {img:'rack',tx:48,ty:14,h:1.7},{img:'sign',tx:90,ty:14,h:1.5} ],
  [ {img:'plant',tx:4,ty:14,h:1.35},{img:'glass',tx:11,ty:12,h:1.05},
    {img:'cone',tx:18,ty:14,h:0.95},{img:'rack',tx:63,ty:14,h:1.7},
    {img:'glass',tx:58,ty:12,h:1.05},{img:'sign',tx:96,ty:14,h:1.5},
    {img:'plant',tx:107,ty:14,h:1.35} ]
];

/* ================= 5 · LEVEL PARSER ================= */
function parseLevel(idx){
  const def=LEVELS[idx],dyn=LEVEL_DYN[idx];
  const rows=def.rows, H=rows.length;
  const W=Math.max.apply(null,rows.map(r=>r.length));
  const map=rows.map(r=>r.padEnd(W,'.'));
  const solid=[],notes=[],cells=[],yarns=[],cams=[],beams=[],exits=[],sps=[];
  let spawn={x:2*36,y:13*36};
  for(let y=0;y<H;y++){solid.push([]);for(let x=0;x<W;x++)solid[y].push(0);}
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const ch=map[y][x];
    if(ch==='#'){solid[y][x]=1;continue;}
    const px=x*CFG.TILE,py=y*CFG.TILE;
    if(ch==='C')spawn={x:px+18,y:py+36};
    else if(ch==='N')notes.push({x:px+18,y:py+18,got:false,ph:Math.random()*6.28});
    else if(ch==='P')cells.push({x:px+18,y:py+18,got:false,ph:Math.random()*6.28});
    else if(ch==='Y')yarns.push({x:px+18,y:py+18,got:false,ph:Math.random()*6.28});
    else if(ch==='S')sps.push({x:px+18,y:py+36,active:false});
    else if(ch==='E')exits.push({x:px,y:py});
    else if('><^v'.indexOf(ch)>=0)cams.push(makeCam(ch,px+18,py+18));
    else if(ch==='|'){
      let ey=y+1;while(ey<H&&map[ey][x]!=='#')ey++;
      beams.push({vx:true,x:px+18,y1:py+10,y2:ey*CFG.TILE,tx:x,ty:y});
    }else if(ch==='-'){
      let ex=x+1;while(ex<W&&map[y][ex]!=='#'&&ex-x<12)ex++;
      beams.push({vx:false,y:py+18,x1:px+10,x2:ex*CFG.TILE,tx:x,ty:y});
    }
  }
  const bots=dyn.bots.map((b,i)=>({row:b.row,min:b.min*36+10,max:b.max*36-10,
    x:(b.min+2)*36,y:b.row*36,facing:1,   /* feet on top of floor row */state:'patrol',mem:0,dist:0,tgt:0,
    ph:i*2.1,alert:0}));
  const movers=dyn.movers.map(m=>({x0:m.x0*36,y0:m.y0*36,x1:m.x1*36,y1:m.y1*36,
    w:m.w*36,spd:m.spd,t:Math.random()*Math.PI,dir:1,dx:0,dy:0,
    x:m.x0*36,y:m.y0*36}));
  const decorSrc=dyn.decor||(LEVEL_DECOR[idx]||[]);
  const decor=decorSrc.map(d=>({img:'prop_'+d.img,tx:d.tx,ty:d.ty,h:d.h||1.2,
    x:d.tx*36+18,y:d.ty*36,flip:!!d.flip}));
  return {def,W,H,solid,map,spawn,notes,cells,yarns,cams,beams,exits,sps,bots,movers,decor,
    levelW:W*36,levelH:H*36,idx};
}
function makeCam(ch,x,y){
  const base=ch==='>'?0:ch==='<'?Math.PI:ch==='^'?-Math.PI/2:Math.PI/2;
  return {x,y,base,sweep:CFG.CAM_SWEEP,spd:CFG.CAM_SPEED*(0.8+Math.random()*.5),
    ph:Math.random()*6.28,ang:base,seen:0,glow:0};
}

/* ================= 6 · PARTICLES & FLOATERS ================= */
const FX={parts:[],floats:[],
  spark(x,y,n,color,spd){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=(.3+Math.random()*.7)*(spd||160);
    this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.4,max:.9,
      color,size:2+Math.random()*3,drag:3,sprite:'fx_spark',rot:Math.random()*6.28});}},
  dust(x,y,n){for(let i=0;i<n;i++)this.parts.push({x:x+(Math.random()-.5)*14,y,vx:(Math.random()-.5)*60,
    vy:-Math.random()*50,life:.35+Math.random()*.25,max:.6,color:'rgba(160,190,255,.5)',size:2+Math.random()*3,drag:4,sprite:'fx_dust',rot:Math.random()*6.28});},
  ring(x,y,color){this.parts.push({x,y,vx:0,vy:0,life:.5,max:.5,color,size:8,drag:0,ring:true});},
  text(x,y,txt,color,life){this.floats.push({x,y,txt,color,life:life||1.1,max:life||1.1,vy:-44});},
  update(dt){
    for(let i=this.parts.length-1;i>=0;i--){const p=this.parts[i];p.life-=dt;
      if(p.life<=0){this.parts.splice(i,1);continue;}
      const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    for(let i=this.floats.length-1;i>=0;i--){const f=this.floats[i];f.life-=dt;
      if(f.life<=0){this.floats.splice(i,1);continue;}f.y+=f.vy*dt;f.vy*=Math.exp(-2*dt);}},
  draw(c){
    for(const p of this.parts){const a=clamp(p.life/p.max,0,1);
      if(p.ring){c.strokeStyle=p.color;c.globalAlpha=a;c.lineWidth=3*a+1;
        c.beginPath();c.arc(p.x,p.y,p.size+(1-a)*46,0,6.283);c.stroke();continue;}
      if(p.sprite && Assets.has(p.sprite)){
        const im=Assets.get(p.sprite);
        const d=Math.max(7,p.size*3.4);
        c.save();c.globalAlpha=a;c.translate(p.x,p.y);c.rotate(p.rot||0);
        c.drawImage(im,-d/2,-d/2,d,d);c.restore();continue;
      }
      c.globalAlpha=a;c.fillStyle=p.color;
      c.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}
    c.globalAlpha=1;
    for(const f of this.floats){const a=clamp(f.life/f.max,0,1);
      c.globalAlpha=a;c.font='bold 13px ui-monospace,monospace';c.textAlign='center';
      c.lineWidth=3;c.strokeStyle='rgba(0,0,0,.7)';c.strokeText(f.txt,f.x,f.y);
      c.fillStyle=f.color;c.fillText(f.txt,f.x,f.y);}
    c.globalAlpha=1;},
  clear(){this.parts.length=0;this.floats.length=0;}
};

/* ================= 7 · GAME STATE ================= */
const Game={
  state:'title',levelIdx:0,L:null,
  cat:null,cams:null,bots:null,movers:null,notes:null,cells:null,yarns:null,sps:null,beams:null,exit:null,
  lives:CFG.LIVES,score:0,time:0,alarms:0,det:0,detMax:0,
  cam:{x:0,y:0,shake:0},flash:0,frozen:false,
  regenT:0,detTick:0,exitHintT:0,encHintT:0,
  respawn:{x:0,y:0},toastT:0,queue:[],
  yarnCount:1,winT:-1,loadT:0,

  /* ---- flow ---- */
  startRun(){this.levelIdx=0;const first=store.data.unlocked-1;this.load(clamp(first,0,LEVELS.length-1));},
  load(idx,keepState){
    this.levelIdx=clamp(idx,0,LEVELS.length-1);
    this.L=parseLevel(this.levelIdx);
    const L=this.L;
    this.cat={x:L.spawn.x,y:L.spawn.y,vx:0,vy:0,dir:1,onGround:false,coyote:0,jbuf:0,
      enc:false,energy:100,squashX:1,squashY:1,invuln:0,landT:0,hurtT:0,blink:0,blinkT:1.5+Math.random()*2,
      twitch:2+Math.random()*3,anim:0,throwT:0,win:0,standing:null,look:0};
    this.cams=L.cams;this.bots=L.bots;this.movers=L.movers;
    this.notes=L.notes;this.cells=L.cells;this.yarns=L.yarns;this.sps=L.sps;
    this.beams=L.beams;this.exit=L.exits[0];
    this.decor=L.decor||[];
    this.lives=CFG.LIVES;this.score=0;this.time=0;this.alarms=0;
    this.det=0;this.flash=0;this.winT=-1;this.yarnCount=1;
    this.respawn={x:L.spawn.x,y:L.spawn.y};
    this.regenT=0;this.encHintT=0;this.exitHintT=0;this.loadT=.6;
    FX.clear();this.queue=[];this.gearScore=0;
    showScreen(null);
    this.state='play';
    Input.clear();
    this.updateHUD();
    this.toast(L.def.lesson,4.2);
  },
  pause(){if(this.state!=='play')return;this.state='pause';Input.clear();showScreen('scr-pause');},
  resume(){if(this.state!=='pause')return;this.state='play';Input.clear();showScreen(null);},
  togglePause(){if(this.state==='play')this.pause();else if(this.state==='pause')this.resume();},
  gameOver(){this.state='over';Input.clear();showScreen('scr-over');},
  complete(){
    if(this.state!=='play')return;
    this.state='complete';Input.clear();
    const L=this.L,allNotes=this.notes.every(n=>n.got);
    const timeB=Math.max(0,Math.round((L.def.par-this.time)*8));
    const cleanB=this.alarms===0?500:0;
    const rows=[['INTENT NOTES ×'+this.notes.length,this.notes.length*100],
      ['TIME BONUS '+fmtTime(this.time),timeB],
      ['NO-ALARM BONUS',cleanB],
      ['GEAR (cells & yarn)',this.gearScore||0]];
    let total=0;rows.forEach(r=>total+=r[1]);
    this.score+=total;
    const stars=(allNotes?1:0)+(this.alarms===0?1:0)+1;
    store.data.stars[this.levelIdx]=Math.max(store.data.stars[this.levelIdx]||0,stars);
    store.data.scores[this.levelIdx]=Math.max(store.data.scores[this.levelIdx]||0,this.score);
    if(this.levelIdx+1<LEVELS.length){
      if(store.data.unlocked<this.levelIdx+2){store.data.unlocked=this.levelIdx+2;SFX.unlock();}
    }
    store.save();
    /* hand a plain result object to the React complete screen */
    const chips=[];
    if(allNotes)chips.push({src:'assets/pickups/note.png',label:'ALL INTENTS',cls:''});
    if(this.alarms===0)chips.push({src:Assets.has('ui_eye')?'assets/ui/eye.png':'assets/pickups/star.png',label:'CLEAN RUN',cls:'gold'});
    if(this.time<=L.def.par)chips.push({src:Assets.has('ui_clock')?'assets/ui/clock.png':'assets/pickups/star.png',label:'UNDER PAR',cls:'violet'});
    this.result={
      kicker:'VAULT CRACKED · LEVEL '+(this.levelIdx+1),
      title:this.alarms===0?'CLEAN GETAWAY':'GOT AWAY WITH IT',
      rows,total:this.score,stars,awards:chips,
      nextLabel:this.levelIdx+1<LEVELS.length?'NEXT LEVEL →':'FINISH HEIST'};
    showScreen('scr-complete');
    SFX.win();
    for(let i=0;i<stars;i++)
      setTimeout(()=>{if(this.state==='complete')SFX.star(i);},350+i*380);
  },

  /* ---- toast queue ---- */
  toast(html,dur){this.queue.push({html,dur:dur||3});if(this.queue.length===1)this._showToast();},
  _showToast(){
    if(!this.queue.length){UI.set({toast:null});return;}
    this._cur=this.queue[0];
    UI.set({toast:this._cur.html});
    this.toastT=this._cur.dur;},
  tickToast(dt){if(this.toastT<=0)return;this.toastT-=dt;
    if(this.toastT<=0){this.queue.shift();this._cur=null;UI.set({toast:null});
      if(this.queue.length)setTimeout(()=>this._showToast(),250);}},

  /* ---- damage / alarm ---- */
  hurt(reason,srcX){
    const c=this.cat;
    if(c.invuln>0||this.state!=='play'||this.winT>=0)return;
    this.lives--;this.alarms++;
    c.invuln=CFG.INVULN;c.enc=false;
    c.hurtT=0.9;
    SFX[reason==='alarm'?'alarm':'hurt']();
    this.cam.shake=12;this.flash=.5;this.det=0;
    FX.spark(c.x,c.y-16,22,'#ff4d6a',240);FX.ring(c.x,c.y-16,'rgba(255,77,106,.9)');
    FX.text(c.x,c.y-52,reason==='alarm'?'ALARM!':reason==='zap'?'ZAPPED!':reason==='fall'?'INTO THE VOID!':'SANDWICHED!','#ff4d6a',1.2);
    if(this.lives<=0){this.lives=0;this.updateHUD();setTimeout(()=>{if(this.state==='play')this.gameOver();},650);return;}
    /* respawn */
    c.x=this.respawn.x;c.y=this.respawn.y;c.vx=0;c.vy=0;c.standing=null;
    this.det=0;
    this.updateHUD();
  },

  /* ---- HUD ---- */
  updateHUD(){
    const L=this.L;if(!L)return;
    /* discrete values -> store (React re-renders only when one changes) */
    const d={level:'L'+(this.levelIdx+1)+' · '+L.def.name,
      notes:this.notes.filter(n=>n.got).length+'/'+this.notes.length,
      lives:this.lives,score:this.score,time:fmtTime(this.time),yarn:this.yarnCount};
    const prev=UI.get().hud;
    if(!prev||prev.level!==d.level||prev.notes!==d.notes||prev.lives!==d.lives||
       prev.score!==d.score||prev.time!==d.time||prev.yarn!==d.yarn)
      UI.set({hud:d});
    /* per-frame bars/badges -> direct DOM refs (no React churn at 60fps) */
    const r=UI.refs,e=this.cat?this.cat.energy:100;
    /* Skip unchanged DOM writes: this method runs on every simulation frame. */
    if(r.engBar&&r._engValue!==e){r.engBar.style.width=e+'%';r._engValue=e;}
    const low=e<25;
    if(r.engWrap&&r._engLow!==low){r.engWrap.classList.toggle('low',low);r._engLow=low;}
    const det=this.det*100;
    if(r.detBar&&r._detValue!==det){r.detBar.style.width=det+'%';r._detValue=det;}
    const detOn=this.det>0.01;
    if(r.detBox&&r._detOn!==detOn){r.detBox.classList.toggle('on',detOn);r._detOn=detOn;}
    const enc=!!(this.cat&&this.cat.enc);
    if(r.hEnc&&r._encOn!==enc){r.hEnc.classList.toggle('on',enc);r._encOn=enc;}
  }
};

function isCoarsePortrait(){return window.matchMedia('(pointer:coarse)').matches&&window.innerHeight>window.innerWidth;}
function toggleSound(){
  const m=!SFX.isMuted();SFX.setMuted(m);
  UI.set({muted:m});
}

/* ================= 8 · WORLD SIMULATION ================= */
function solidAt(tx,ty){const L=Game.L;
  if(tx<0||tx>=L.W)return 1;if(ty<0)return 0;if(ty>=L.H)return 0;return L.solid[ty][tx];}
function boxOf(c){return{x:c.x-11,y:c.y-30,w:22,h:30};}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function tileBox(tx,ty){return{x:tx*36,y:ty*36,w:36,h:36};}

function moveCat(c,dt){
  /* X axis */
  c.x+=c.vx*dt;
  let b=boxOf(c);
  let x0=Math.floor(b.x/36),x1=Math.floor((b.x+b.w-0.001)/36);
  let y0=Math.floor(b.y/36),y1=Math.floor((b.y+b.h-0.001)/36);
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(solidAt(tx,ty)){
      if(c.vx>0)c.x=tx*36-11-.01;else if(c.vx<0)c.x=(tx+1)*36+11+.01;
      c.vx=0;b=boxOf(c);
      x0=Math.floor(b.x/36);x1=Math.floor((b.x+b.w-0.001)/36);
    }}
  /* Y axis */
  const wasAir=!c.onGround;
  c.y+=c.vy*dt;
  b=boxOf(c);
  x0=Math.floor(b.x/36);x1=Math.floor((b.x+b.w-0.001)/36);
  y0=Math.floor(b.y/36);y1=Math.floor((b.y+b.h-0.001)/36);
  c.onGround=false;
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
    if(solidAt(tx,ty)){
      if(c.vy>0){c.y=ty*36-.01;c.onGround=true;}
      else if(c.vy<0)c.y=(ty+1)*36+30+.01;
      c.vy=0;b=boxOf(c);
      y0=Math.floor(b.y/36);y1=Math.floor((b.y+b.h-0.001)/36);
    }}
  /* movers */
  c.standing=null;
  if(c.vy>=0){
    for(const m of Game.movers){
      const top=m.y, prevB=c.y-(c.vyPrev||0);
      if(c.x+11>m.x&&c.x-11<m.x+m.w&&c.y>=top-4&&c.y<=top+14){
        c.y=top;c.vy=0;c.onGround=true;c.standing=m;break;
      }}
  }
  if(wasAir&&c.onGround&&c.vyPrev>260){
    SFX.land();FX.dust(c.x,c.y,7);
    c.squashY=.68;c.squashX=1.26;c.landT=0.14;}
}

function losClear(x0,y0,x1,y1){
  const dx=x1-x0,dy=y1-y0,d=Math.hypot(dx,dy),n=Math.ceil(d/9);
  for(let i=1;i<n;i++){const t=i/n,tx=Math.floor((x0+dx*t)/36),ty=Math.floor((y0+dy*t)/36);
    if(solidAt(tx,ty))return false;}
  return true;}
function inCone(src,ang,range,half,cx,cy){
  const dx=cx-src.x,dy=cy-src.y,d=Math.hypot(dx,dy);
  if(d>range||d<6)return false;
  let da=Math.atan2(dy,dx)-ang;da=Math.atan2(Math.sin(da),Math.cos(da));
  if(Math.abs(da)>half)return false;
  return losClear(src.x,src.y,cx,cy);}

function updateGame(dt){
  const c=Game.cat,L=Game.L;
  if(Game.winT>=0){
    Game.winT+=dt;
    c.anim+=dt;
    if(Game.winT>1.15)Game.complete();
    FX.update(dt);tickCam(dt);return;
  }
  Game.time+=dt;
  Game.loadT=Math.max(0,Game.loadT-dt);

  /* ---- movers first (carry) ---- */
  for(const m of Game.movers){
    const sp=(Math.PI/m.spd)*dt;   /* spd = seconds per full sweep */
    m.t+=sp*m.dir;
    if(m.t>Math.PI){m.t=Math.PI;m.dir=-1;}if(m.t<0){m.t=0;m.dir=1;}
    const k=(1-Math.cos(m.t))/2;
    const nx=lerp(m.x0,m.x1,k),ny=lerp(m.y0,m.y1,k);
    m.dx=nx-m.x;m.dy=ny-m.y;m.x=nx;m.y=ny;
  }
  if(c.standing){c.x+=c.standing.dx;c.y+=c.standing.dy;}

  /* ---- input ---- */
  const ax=(Input.down('right')?1:0)-(Input.down('left')?1:0);
  if(Game.state==='play'){
    if(Input.pressed('jump'))c.jbuf=CFG.BUFFER;
    if(ax!==0){c.vx+=(ax*(c.onGround?CFG.ACC:CFG.AIR_ACC))*dt;
      if((ax>0&&c.vx<0)||(ax<0&&c.vx>0))c.vx+=ax*CFG.ACC*.9*dt;
      c.dir=ax;}
    else if(c.onGround){const f=CFG.FRIC*dt;c.vx=Math.abs(c.vx)<=f?0:c.vx-Math.sign(c.vx)*f;}
    if(Input.pressed('yarn')&&Game.yarnCount>0&&c.throwT<=0){
      Game.yarnCount--;c.throwT=.3;SFX.yarn();
      Game.yarnP={x:c.x+c.dir*14,y:c.y-24,vx:c.dir*CFG.YARN_VX,vy:CFG.YARN_VY,life:CFG.YARN_LIFE,bounced:0};}
    /* encryption toggle */
    const wantEnc=Input.down('enc');
    if(wantEnc&&!c.enc&&c.energy>2){c.enc=true;SFX.encOn();FX.ring(c.x,c.y-16,'rgba(176,124,255,.9)');
      FX.spark(c.x,c.y-16,10,'#b07cff',140);}
    if(!wantEnc&&c.enc){c.enc=false;SFX.encOff();}
    if(c.enc&&c.energy<=0){c.enc=false;SFX.encOff();FX.text(c.x,c.y-48,'ENERGY EMPTY','#ff4d6a',1);}
    if(c.enc){c.energy=Math.max(0,c.energy-CFG.ENC_DRAIN*dt);
      if(Math.random()<dt*26)FX.parts.push({x:c.x+(Math.random()-.5)*24,y:c.y-Math.random()*34,
        vx:(Math.random()-.5)*30,vy:-30-Math.random()*40,life:.4,max:.4,
        color:'rgba(176,124,255,.8)',size:2,drag:2});}
    else{Game.regenT-=dt;if(Game.regenT<=0)c.energy=Math.min(100,c.energy+CFG.ENC_REGEN*dt);}
    if(wantEnc)Game.regenT=CFG.REGEN_DELAY;
  }

  /* ---- physics ---- */
  c.vyPrev=c.vy;
  c.jbuf-=dt;c.coyote-=dt;
  if(c.jbuf>0&&c.coyote>0){c.vy=CFG.JUMP;c.jbuf=0;c.coyote=0;
    c.onGround=false;SFX.jump();c.squashX=.72;c.squashY=1.28;FX.dust(c.x,c.y,4);}
  if(!Input.down('jump')&&c.vy<CFG.JUMP*0.4)c.vy*=Math.pow(CFG.JUMP_CUT,dt*18);
  c.vy=Math.min(CFG.MAX_FALL,c.vy+CFG.GRAV*dt);
  const wasGround=c.onGround;
  moveCat(c,dt);
  if(c.onGround)c.coyote=CFG.COYOTE;
  if(c.onGround&&!wasGround)c.anim=0;
  /* void */
  if(c.y>L.levelH+50){Game.hurt('fall');return;}

  /* squash recovery */
  const k=1-Math.exp(-11*dt);
  c.squashX=lerp(c.squashX,1,k);c.squashY=lerp(c.squashY,1,k);
  c.invuln=Math.max(0,c.invuln-dt);c.throwT=Math.max(0,c.throwT-dt);
  c.landT=Math.max(0,(c.landT||0)-dt);c.hurtT=Math.max(0,(c.hurtT||0)-dt);
  c.blinkT-=dt;if(c.blinkT<=0){c.blink=.13;c.blinkT=1.6+Math.random()*2.6;}
  c.blink=Math.max(0,c.blink-dt);
  c.twitch-=dt;if(c.twitch<=0){c.twitch=2.5+Math.random()*3.5;c.twitchAmt=.4;}
  c.twitchAmt=Math.max(0,(c.twitchAmt||0)-dt*2.5);
  c.anim+=Math.abs(c.vx)*dt*.05;
  if(Math.abs(c.vx)>140&&c.onGround&&Math.random()<dt*10)FX.dust(c.x-Math.sign(c.vx)*8,c.y,1);

  /* ---- pickups ---- */
  const cb=boxOf(c);
  for(const n of Game.notes){
    if(n.got)continue;
    if(dist2(c.x,c.y-15,n.x,n.y)<24*24){
      if(c.enc){
        if(Game.encHintT<=0){FX.text(n.x,n.y-20,'DECRYPT TO READ','#b07cff',1);Game.encHintT=1.2;SFX.locked();}
      }else{n.got=true;Game.score+=100;SFX.note();
        FX.spark(n.x,n.y,14,'#ffd166',190);FX.ring(n.x,n.y,'rgba(255,209,102,.9)');
        FX.text(n.x,n.y-18,'+100','#ffd166');
        Game.updateHUD();
        if(Game.notes.every(x=>x.got)){SFX.unlock();Game.toast('All intents collected — <b>the vault is open</b>!',2.6);}}}
  }
  Game.encHintT=Math.max(0,Game.encHintT-dt);
  for(const p of Game.cells){
    if(p.got)continue;
    if(dist2(c.x,c.y-15,p.x,p.y)<22*22){p.got=true;c.energy=Math.min(100,c.energy+40);
      Game.score+=25;Game.gearScore=(Game.gearScore||0)+25;SFX.cell();FX.spark(p.x,p.y,10,'#5dff9a',150);FX.text(p.x,p.y-16,'+40 ⚡','#5dff9a');}}
  for(const p of Game.yarns){
    if(p.got)continue;
    if(dist2(c.x,c.y-15,p.x,p.y)<22*22){p.got=true;Game.yarnCount=Math.min(9,Game.yarnCount+1);
      Game.score+=25;Game.gearScore=(Game.gearScore||0)+25;SFX.cell();FX.spark(p.x,p.y,10,'#ff7dd6',150);FX.text(p.x,p.y-16,'+1 🧶','#ff7dd6');}}
  /* checkpoints */
  for(const s of Game.sps){
    if(!s.active&&dist2(c.x,c.y,s.x,s.y)<26*26){Game.sps.forEach(x=>x.active=false);s.active=true;
      Game.respawn={x:s.x,y:s.y};SFX.checkpoint();FX.ring(s.x,s.y-10,'rgba(61,245,224,.9)');
      Game.toast('Dead drop set — you respawn here.',2);}}
  /* exit */
  Game.exitHintT=Math.max(0,Game.exitHintT-dt);
  const e=Game.exit;
  if(e&&overlap(cb,{x:e.x+4,y:e.y-6,w:28,h:42})){
    if(Game.notes.every(n=>n.got)){
      Game.score+=300;Game.winT=0;c.win=1;c.vx=0;
      FX.spark(e.x+18,e.y+10,30,'#3df5e0',260);FX.ring(e.x+18,e.y+18,'rgba(61,245,224,.9)');
    }else if(Game.exitHintT<=0){
      const left=Game.notes.filter(n=>!n.got).length;
      FX.text(e.x+18,e.y-16,'NEED '+left+' MORE','#ff4d6a',1);SFX.locked();Game.exitHintT=1.1;}
  }

  /* ---- yarn projectile ---- */
  const Y=Game.yarnP;
  if(Y){
    Y.life-=dt;
    Y.vy+=1500*dt;Y.x+=Y.vx*dt;Y.y+=Y.vy*dt;
    const ty=Math.floor(Y.y/36);
    if(Y.vy>0&&Y.y>=0&&ty<L.H&&solidAt(Math.floor(Y.x/36),ty)){
      Y.y=ty*36;Y.vy*=-.42;Y.vx*=.7;if(Math.abs(Y.vy)<60){Y.vy=0;Y.vx*=.85;Y.bounced=1;}}
    const tx=Math.floor(Y.x/36);
    if(tx<0||tx>=L.W||(Y.bounced&&solidAt(tx,Math.floor(Y.y/36)))){Y.vx*=-.5;}
    if(Y.bounced)Y.vx*=Math.exp(-1.6*dt);
    /* distract bots */
    for(const b of Game.bots){
      if(dist2(b.x,b.y-20,Y.x,Y.y)<CFG.YARN_R*CFG.YARN_R&&b.state!=='distract'&&b.lastYarn!==Y){
        b.state='distract';b.dist=CFG.YARN_DISTRACT;b.tgt=Y.x;b.lastYarn=Y;SFX.distract();
        FX.text(b.x,b.y-54,'?','#ffd166',.9);}}
    if(Y.life<=0)Game.yarnP=null;
  }

  /* ---- cameras ---- */
  let seenNow=false,seenRate=0;
  const cx=c.x,cy=c.y-15;
  for(const cam of Game.cams){
    cam.ang=cam.base+Math.sin(Game.time*cam.spd+cam.ph)*CFG.CAM_SWEEP;
    cam.glow=Math.max(0,cam.glow-dt*3);
    if(!c.enc&&c.invuln<=0&&inCone(cam,cam.ang,CFG.CAM_RANGE,CFG.CAM_HALF,cx,cy)){
      seenNow=true;seenRate=Math.max(seenRate,1/CFG.DET_FILL);cam.glow=1;}
  }
  /* ---- bots ---- */
  for(const b of Game.bots){
    const eyeX=b.x,eyeY=b.y-24;
    const canSee=b.state!=='distract'&&!c.enc&&c.invuln<=0&&
      dist2(eyeX,eyeY,cx,cy)<CFG.BOT_RANGE*CFG.BOT_RANGE&&
      inCone({x:eyeX,y:eyeY},b.facing>0?0:Math.PI,CFG.BOT_RANGE,CFG.BOT_HALF,cx,cy);
    if(b.state==='distract'){
      b.dist-=dt;
      const dx=b.tgt-b.x;
      if(Math.abs(dx)>6){b.facing=dx>=0?1:-1;
        b.x=clamp(b.x+b.facing*CFG.BOT_PATROL*dt,b.min,b.max);}
      if(b.dist<=0){b.state='patrol';b.mem=0;}
      b.alert=0;
    }else if(canSee){
      if(b.state!=='chase'){b.state='chase';FX.text(b.x,b.y-54,'!','#ff4d6a',.9);b.alert=1;}
      b.mem=CFG.DET_FILL+1.2;b.tgt=cx;
      seenNow=true;seenRate=Math.max(seenRate,1/(CFG.DET_FILL*.8));
    }else if(b.state==='chase'){
      b.mem-=dt;
      if(b.mem<=0){b.state='patrol';FX.text(b.x,b.y-54,'?','#ffd166',.8);}
      else b.tgt=cx;
    }
    /* movement */
    if(b.state==='chase'){
      const dx=b.tgt-b.x;
      if(Math.abs(dx)>4){b.facing=dx>0?1:-1;b.x+=b.facing*CFG.BOT_CHASE*dt;}
      b.x=clamp(b.x,b.min-40,b.max+40);
      b.alert=1;
    }else if(b.state==='patrol'){
      b.x+=b.facing*CFG.BOT_PATROL*dt;
      if(b.x<=b.min){b.x=b.min;b.facing=1;}if(b.x>=b.max){b.x=b.max;b.facing=-1;}
      b.alert=Math.max(0,b.alert-dt*2);
    }
    /* touch */
    if(!c.enc&&c.invuln<=0&&overlap(boxOf(c),{x:b.x-13,y:b.y-30,w:26,h:30})){
      Game.hurt('sandwich',b.x);if(Game.state!=='play')return;
    }
  }
  /* ---- beams ---- */
  for(const bm of Game.beams){
    const r=bm.vx?{x:bm.x-5,y:bm.y1,w:10,h:bm.y2-bm.y1}
                 :{x:bm.x1,y:bm.y-5,w:bm.x2-bm.x1,h:10};
    if(overlap(cb,r)){
      if(c.enc){if(Math.random()<dt*30){FX.parts.push({x:clamp(c.x,r.x,r.x+r.w),
            y:clamp(c.y-15,r.y,r.y+r.h),vx:(Math.random()-.5)*80,vy:(Math.random()-.5)*80,
            life:.3,max:.3,color:'rgba(176,124,255,.9)',size:3,drag:3});
          if(Math.random()<dt*8)SFX.phase();}}
      else{Game.hurt('zap');if(Game.state!=='play')return;}
    }
  }
  /* ---- detection ---- */
  if(seenNow&&Game.state==='play'){
    Game.det=Math.min(1,Game.det+seenRate*dt);
    Game.detTick-=dt;
    if(Game.det>=1){Game.hurt('alarm');}
    else if(Game.det>.25&&Game.detTick<=0){SFX.tick();Game.detTick=.33;}
  }else{
    Game.det=Math.max(0,Game.det-CFG.DET_DECAY*dt);
  }
  if(seenNow)Game.detTick=Math.min(Game.detTick,.12);

  FX.update(dt);
  tickCam(dt);
  Game.flash=Math.max(0,Game.flash-dt*2);
  Game.tickToast(dt);
  Game.updateHUD();
}

function tickCam(dt){
  const c=Game.cat,L=Game.L;if(!L)return;
  const S=Render.scale,vw=Render.vw,vh=Render.vh;
  let tx=c.x-vw*(c.dir>0?.42:.58);
  let ty=-(vh-L.levelH)/2;
  if(L.levelW<=vw)tx=-(vw-L.levelW)/2;
  tx=clamp(tx,0,Math.max(0,L.levelW-vw));
  Game.cam.x=lerp(Game.cam.x,tx,1-Math.exp(-7*dt));
  Game.cam.y=lerp(Game.cam.y,ty,1-Math.exp(-7*dt));
  if(Game.cam.shake>0)Game.cam.shake=Math.max(0,Game.cam.shake-dt*30);
}

/* ================= 9 · RENDER ================= */
const Render={
  cv:null,c:null,dpr:1,scale:1,vw:960,vh:540,W:0,H:0,
  glow:null,vign:null,skyFar:null,skyMid:null,t:0,skySeed:7,
  init(){
    this.cv=$('cv');if(!this.cv)return;
    /* The canvas is fully repainted every frame; an opaque context avoids
       unnecessary alpha compositing. Keep high-quality smoothing for sprites. */
    this.c=this.cv.getContext('2d',{alpha:false});
    this.c.imageSmoothingEnabled=true;
    this.c.imageSmoothingQuality='high';
    this.resize();
    if(!this._inited){this._inited=true;window.addEventListener('resize',()=>this.resize());}
    this.makeGlow();this.makeVignette();this.makeSky();
  },
  resize(){
    if(!this.cv)return;
    const coarse=window.matchMedia('(pointer:coarse)').matches;
    /* A 1.5x backing store on touch devices cuts fill-rate and memory cost
       while preserving crisp rendering at typical phone viewing distances. */
    this.dpr=Math.min(coarse?1.5:2,window.devicePixelRatio||1);
    this.W=window.innerWidth;this.H=window.innerHeight;
    this.cv.width=Math.floor(this.W*this.dpr);this.cv.height=Math.floor(this.H*this.dpr);
    this.scale=Math.min(this.W/CFG.VIEW_W,this.H/CFG.VIEW_H);
    this.vw=this.W/this.scale;this.vh=this.H/this.scale;
    this.makeVignette();this.makeSky();
  },
  makeGlow(){
    const g=document.createElement('canvas');g.width=g.height=128;
    const c=g.getContext('2d'),gr=c.createRadialGradient(64,64,4,64,64,64);
    gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.45)');
    gr.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=gr;c.fillRect(0,0,128,128);this.glow=g;},
  makeVignette(){
    const g=document.createElement('canvas');g.width=this.W||960;g.height=this.H||540;
    const c=g.getContext('2d');
    const gr=c.createRadialGradient(g.width/2,g.height/2,Math.min(g.width,g.height)*.34,
      g.width/2,g.height/2,Math.max(g.width,g.height)*.72);
    gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.5)');
    c.fillStyle=gr;c.fillRect(0,0,g.width,g.height);this.vign=g;},
  makeSky(){
    /* far skyline */
    const W=1400,H=420,g=document.createElement('canvas');g.width=W;g.height=H;
    const c=g.getContext('2d'),rnd=mulberry(this.skySeed);
    for(let i=0;i<34;i++){
      const bw=40+rnd()*90,bh=60+rnd()*260,x=rnd()*W;
      c.fillStyle='rgba(10,17,34,.9)';c.fillRect(x,H-bh,bw,bh);
      c.fillStyle='rgba(61,245,224,.14)';
      for(let wy=H-bh+8;wy<H-10;wy+=14)for(let wx=x+6;wx<x+bw-8;wx+=12)
        if(rnd()<.28)c.fillRect(wx,wy,4,6);
    }
    this.skyFar=g;
    /* mid glass towers */
    const g2=document.createElement('canvas');g2.width=W;g2.height=H;
    const c2=g2.getContext('2d'),rnd2=mulberry(this.skySeed+99);
    for(let i=0;i<16;i++){
      const bw=60+rnd2()*80,bh=100+rnd2()*300,x=rnd2()*W;
      c2.fillStyle='rgba(18,30,58,.55)';c2.fillRect(x,H-bh,bw,bh);
      c2.strokeStyle='rgba(61,245,224,.2)';c2.lineWidth=1;c2.strokeRect(x+.5,H-bh+.5,bw-1,bh-1);
      c2.fillStyle='rgba(176,124,255,.16)';
      for(let wy=H-bh+10;wy<H-8;wy+=18)if(rnd2()<.4)c2.fillRect(x+8,wy,bw-16,3);
    }
    this.skyMid=g2;},
  glowAt(c,x,y,r,color,a){
    c.globalCompositeOperation='lighter';c.globalAlpha=a==null?1:a;
    c.drawImage(this.glow,x-r,y-r,r*2,r*2);
    c.globalAlpha=1;c.globalCompositeOperation='source-over';},

  drawSkyLayers(c, camX){
    const W=this.W, H=this.H;
    const grd=c.createLinearGradient(0,0,0,H);
    grd.addColorStop(0,'#0a1024'); grd.addColorStop(.72,'#070b18'); grd.addColorStop(1,'#06080f');
    c.fillStyle=grd; c.fillRect(0,0,W,H);
    /* Deterministic, low-cost star field adds depth without per-frame random
       allocations or image assets. Slow parallax keeps it behind the action. */
    for(let i=0;i<72;i++){
      const x=((i*97.31-camX*.035)%W+W)%W;
      const y=(i*53.17)%(H*.68);
      const twinkle=.35+.35*(.5+.5*Math.sin(this.t*1.4+i*2.17));
      c.globalAlpha=twinkle;
      c.fillStyle=i%7===0?'#9deee8':'#9aa9d2';
      c.fillRect(x,y,i%9===0?2:1,i%9===0?2:1);
    }
    c.globalAlpha=1;
    const far=Assets.get('bg_far'), mid=Assets.get('bg_mid');
    if(far){
      const dh=Math.max(220,H*0.50), dw=dh*(far.width/far.height);
      this._loopX(c,far,-camX*0.10,H-dh-H*0.05,dw,dh);
    }
    if(mid){
      const dh=Math.max(250,H*0.58), dw=dh*(mid.width/mid.height);
      c.globalAlpha=0.70;
      this._loopX(c,mid,-camX*0.26,H-dh+H*0.03,dw,dh);
      c.globalAlpha=1;
    }
    if(!far){
      c.fillStyle='rgba(13,20,40,.9)'; c.fillRect(0,H*0.66,W,H*0.34);
    }
    this.glowAt(c,W*0.5,H*0.7,W*0.42,'',0.05);
  },
  _loopX(c,img,offset,y,w,h){
    let x=offset%w; if(x>0)x-=w;
    let i=0;
    while(x<w){
      if((i%2)===1){ c.save(); c.translate(x+w,y); c.scale(-1,1); c.drawImage(img,0,0,w,h); c.restore(); }
      else c.drawImage(img,x,y,w,h);
      x+=w; i++;
      if(i>12)break;
    }
  },
  frame(dt){
    const c=this.c;
    this.t+=dt;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    c.fillStyle='#06080f';c.fillRect(0,0,this.W,this.H);
    if(Game.state==='title'||Game.state==='select'||Game.state==='how'){
      this.drawTitleScene(c);return;}
    if(!Game.L)return;
    this.drawSkyLayers(c, Game.cam.x);
    /* world transform */
    const S=this.scale;
    const ox=(this.W-this.vw*S)/2, oy=(this.H-this.vh*S)/2;
    let sx=0,sy=0;
    if(Game.cam.shake>0){sx=(Math.random()-.5)*Game.cam.shake;sy=(Math.random()-.5)*Game.cam.shake;}
    c.setTransform(S*this.dpr,0,0,S*this.dpr,(ox+Game.cam.x*S+sx*S)*this.dpr,(oy+Game.cam.y*S+sy*S)*this.dpr);
    this.drawWorld(c);
    /* screen-space overlays */
    c.setTransform(this.dpr,0,0,this.dpr,0,0);
    if(this.vign)c.drawImage(this.vign,0,0);
    if(Game.flash>0){c.globalAlpha=Game.flash*.5;c.fillStyle='#ff2038';c.fillRect(0,0,this.W,this.H);c.globalAlpha=1;}
  },

  drawTitleScene(c){
    const W=this.W,H=this.H,t=this.t;
    /* sky glows */
    this.glowAt(c,W*.75,H*.25,340,'',.10);
    const grd=c.createLinearGradient(0,0,0,H);
    grd.addColorStop(0,'#0a1024');grd.addColorStop(1,'#06080f');
    c.fillStyle=grd;c.fillRect(0,0,W,H);
    if(this.skyFar){const off=(t*6)%(this.skyFar.width);
      c.globalAlpha=.8;
      c.drawImage(this.skyFar,-off,H*.42,this.skyFar.width,H*.58);
      c.drawImage(this.skyFar,-off+this.skyFar.width,H*.42,this.skyFar.width,H*.58);
      c.globalAlpha=1;}
    if(this.skyMid){const off=(t*14)%(this.skyMid.width);
      c.drawImage(this.skyMid,-off,H*.5,this.skyMid.width,H*.5);
      c.drawImage(this.skyMid,-off+this.skyMid.width,H*.5,this.skyMid.width,H*.5);}
    /* ground */
    c.fillStyle='#0b1322';c.fillRect(0,H*.86,W,H*.14);
    c.strokeStyle='rgba(61,245,224,.35)';c.lineWidth=2;
    c.beginPath();c.moveTo(0,H*.86);c.lineTo(W,H*.86);c.stroke();
    /* cat + mug on the right */
    if(W>680){
      const cx=W*.76,cy=H*.86,sc=clamp(Math.min(W,H)/340,1.7,3.1);
      c.save();c.translate(cx,cy);c.scale(sc,sc);
      drawCat(c,{x:0,y:0,dir:-1,cat:{enc:false,squashX:1,squashY:1,anim:t*1.2,blink:0,
        twitchAmt:0,throwT:0,win:0,energy:100,onGround:true,vx:0,vy:0,invuln:0},
        t:t,title:true,look:-1,vyPrev:0});
      /* mug */
      c.save();c.translate(30,-6);
      c.fillStyle='#eef1fa';rr(c,-9,-13,17,14,3);c.fill();
      c.strokeStyle='#eef1fa';c.lineWidth=2.4;c.beginPath();c.arc(9,-6,5,-1.4,1.4);c.stroke();
      c.strokeStyle='rgba(61,245,224,.9)';c.lineWidth=1;
      drawFlutonMark(c,0,-6,4,'#0a0e1c');
      /* steam */
      c.strokeStyle='rgba(200,220,255,.5)';c.lineWidth=1.4;
      for(let i=0;i<3;i++){const ph=t*2+i*2.1;
        c.beginPath();
        for(let s=0;s<6;s++){const yy=-16-s*3,xx=Math.sin(ph+s*.9)*2.2+i*5-5;
          s===0?c.moveTo(xx,yy):c.lineTo(xx,yy);}
        c.stroke();}
      c.restore();c.restore();
      /* GM wave handled inside drawCat (title flag) */
    }
    if(this.vign)c.drawImage(this.vign,0,0);
  },

  drawWorld(c){
    const L=Game.L,S=this.scale;
    const camX=Game.cam.x,camY=Game.cam.y;
    const vw=this.vw,vh=this.vh;
    /* --- sky --- */
    const grd=c.createLinearGradient(0,camY*.2-100,0,camY*.2+vh);
    grd.addColorStop(0,'#0a1024');grd.addColorStop(.7,'#070a16');grd.addColorStop(1,'#06080f');
    c.fillStyle=grd;c.fillRect(camX,camY,vw,vh);
    /* sky layers drawn in screen space (drawSkyLayers) */

    /* camera view bounds in tiles */
    const tx0=Math.max(0,Math.floor(camX/36)-1),tx1=Math.min(L.W-1,Math.ceil((camX+vw)/36)+1);
    const ty0=Math.max(0,Math.floor(camY/36)-1),ty1=Math.min(L.H-1,Math.ceil((camY+vh)/36)+1);

    /* --- tiles: generated glass face + neon edge strip --- */
    if(this._facePat===undefined && Assets.ready){
      this._facePat = Assets.has('face') ? this.c.createPattern(Assets.get('face'),'repeat') : null;
    }
    for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){
      if(!L.solid[ty][tx])continue;
      const x=tx*36,y=ty*36;
      if(this._facePat)c.fillStyle=this._facePat;else c.fillStyle='#0d1526';
      c.fillRect(x,y,36,36);
      const above=!solidAt(tx,ty-1);
      /* A compact top-light pass replaces one gradient allocation per
         visible tile per frame. The platform sprite supplies the detailed edge. */
      c.fillStyle='rgba(61,245,224,.055)';
      c.fillRect(x,y,36,12);
      if(above){
        const strip=Assets.get('plat_top');
        if(strip){c.globalAlpha=.95;c.drawImage(strip,x,y-1,36,16);c.globalAlpha=1;}
        c.fillStyle='rgba(150,255,247,.9)';c.fillRect(x,y,36,2);
        c.fillStyle='rgba(61,245,224,.30)';c.fillRect(x,y+2,36,2);}
      c.strokeStyle='rgba(90,130,255,.10)';c.lineWidth=1;
      c.strokeRect(x+.5,y+.5,35,35);
      if(!solidAt(tx-1,ty)){c.fillStyle='rgba(90,130,255,.14)';c.fillRect(x,y,2,36);}
      if(!solidAt(tx+1,ty)){c.fillStyle='rgba(90,130,255,.14)';c.fillRect(x+34,y,2,36);}
    }
    /* --- searchlight cones (over ground, under entities) --- */
    for(const cam of Game.cams)this.drawCone(c,cam);

    /* void hatches */
    for(let tx=tx0;tx<=tx1;tx++){
      if(!solidAt(tx,L.H-1)&&!solidAt(tx,L.H-2)){
        const x=tx*36,y=(L.H-1)*36;
        c.strokeStyle='rgba(255,77,106,.3)';c.lineWidth=1.5;
        c.beginPath();c.moveTo(x,y+8);c.lineTo(x+18,y+30);c.moveTo(x+18,y+8);c.lineTo(x+36,y+30);c.stroke();}
    }

    /* --- decor props (behind gameplay) --- */
    for(const d of (Game.decor||[])){
      const im=Assets.get(d.img);
      if(!im)continue;
      drawAsset(c,d.img,d.x,d.y,{scale:(d.h*36)/im.height,flip:d.flip,alpha:.92});
    }

    /* --- checkpoints --- */
    for(const s of Game.sps){
      c.fillStyle=s.active?'rgba(61,245,224,.2)':'rgba(61,245,224,.07)';
      rr(c,s.x-11,s.y-30,22,30,5);c.fill();
      c.strokeStyle=s.active?'#3df5e0':'rgba(61,245,224,.5)';c.lineWidth=2;
      rr(c,s.x-11,s.y-30,22,30,5);c.stroke();
      c.fillStyle=s.active?'#3df5e0':'rgba(61,245,224,.7)';
      c.font='bold 12px ui-monospace,monospace';c.textAlign='center';
      c.fillText(s.active?'✓':'S',s.x,s.y-10);
      if(s.active)this.glowAt(c,s.x,s.y-16,34,'',.5);}

    /* --- movers --- */
    for(const m of Game.movers){
      c.fillStyle='rgba(176,124,255,.16)';rr(c,m.x,m.y,m.w,12,6);c.fill();
      c.strokeStyle='#b07cff';c.lineWidth=2;rr(c,m.x,m.y,m.w,12,6);c.stroke();
      c.fillStyle='rgba(176,124,255,.9)';c.font='bold 9px ui-monospace,monospace';c.textAlign='center';
      c.fillText('RELAYER',m.x+m.w/2,m.y-5);
      this.glowAt(c,m.x+m.w/2,m.y+6,m.w*.7,'',.25);}

    /* --- exit vault --- */
    if(Game.exit)this.drawExit(c,Game.exit);

    /* --- notes / cells / yarn pickups --- */
    for(const n of Game.notes)if(!n.got)this.drawNote(c,n);
    for(const p of Game.cells)if(!p.got)this.drawCell(c,p);
    for(const p of Game.yarns)if(!p.got)this.drawYarnPickup(c,p);

    /* --- beams --- */
    for(const bm of Game.beams)this.drawBeam(c,bm);

    /* --- yarn projectile --- */
    if(Game.yarnP)this.drawYarnBall(c,Game.yarnP.x,Game.yarnP.y,this.t*7);

    /* --- bots --- */
    for(const b of Game.bots)this.drawBot(c,b);

    /* --- player light and cat --- */
    if(Game.cat){
      const p=Game.cat;
      this.glowAt(c,p.x,p.y-24,68,'',p.enc?.24:.12);
    }
    drawCatGame(c);

    /* --- particles & floats --- */
    FX.draw(c);
  },

  drawCone(c,cam){
    const detect=cam.glow>.4;
    const r=CFG.CAM_RANGE,h=CFG.CAM_HALF,a=cam.ang;
    c.save();c.translate(cam.x,cam.y);c.rotate(a);
    const g=c.createRadialGradient(0,0,6,0,0,r);
    if(detect){g.addColorStop(0,'rgba(255,60,80,.5)');g.addColorStop(1,'rgba(255,60,80,0)');}
    else{g.addColorStop(0,'rgba(255,77,106,.3)');g.addColorStop(1,'rgba(255,77,106,0)');}
    c.fillStyle=g;
    c.beginPath();c.moveTo(0,0);c.arc(0,0,r,-h,h);c.closePath();c.fill();
    c.strokeStyle=detect?'rgba(255,120,140,.9)':'rgba(255,77,106,.45)';
    c.lineWidth=1.5;
    c.beginPath();c.moveTo(0,0);c.lineTo(Math.cos(-h)*r,Math.sin(-h)*r);
    c.moveTo(0,0);c.lineTo(Math.cos(h)*r,Math.sin(h)*r);c.stroke();
    c.restore();
    /* turret: generated sprite with procedural fallback */
    const tKey=detect?'turret_alert':'turret';
    const tIm=Assets.get(tKey);
    let tDrew=false;
    if(tIm){
      const tS=46/tIm.height;
      c.save();c.translate(cam.x,cam.y+18);
      if(Math.cos(cam.base)<0)c.scale(-1,1);
      c.drawImage(tIm,-tIm.width*tS/2,-tIm.height*tS,tIm.width*tS,tIm.height*tS);
      c.restore();tDrew=true;
    }
    if(!tDrew){
      c.save();c.translate(cam.x,cam.y);
      c.fillStyle='#161b2e';rr(c,-5,4,10,14,3);c.fill();
      c.fillStyle='#0f1424';c.beginPath();c.arc(0,0,9,0,6.283);c.fill();
      c.strokeStyle=detect?'#ff4d6a':'#5a6484';c.lineWidth=2;
      c.beginPath();c.arc(0,0,9,0,6.283);c.stroke();
      const ex=Math.cos(cam.ang)*4.2,ey=Math.sin(cam.ang)*4.2;
      c.fillStyle=detect?'#ff4d6a':'#ffb3c0';
      c.beginPath();c.arc(ex,ey,3.6,0,6.283);c.fill();
      c.restore();
    }
    if(detect){this.glowAt(c,cam.x,cam.y-6,26,'',.6);
      c.fillStyle='#ff4d6a';c.font='bold 15px ui-monospace,monospace';c.textAlign='center';
      c.fillText('!',cam.x,cam.y-20);}
    },

  drawBeam(c,bm){
    const pulse=.7+Math.sin(this.t*9)*.3;
    c.save();
    const dIm=Assets.get('drone');
    if(bm.vx){
      /* emitter drone */
      if(dIm){const dS=42/dIm.height;
        c.save();c.translate(bm.x,bm.y1+8);
        c.drawImage(dIm,-dIm.width*dS/2,-dIm.height*dS,dIm.width*dS,dIm.height*dS);c.restore();
      }else{
        c.fillStyle='#141a30';rr(c,bm.x-11,bm.y1-16,22,14,5);c.fill();
        c.strokeStyle='rgba(255,77,106,.7)';c.lineWidth=1.5;rr(c,bm.x-11,bm.y1-16,22,14,5);c.stroke();
      }
      c.globalCompositeOperation='lighter';
      c.fillStyle='rgba(255,40,70,'+(.32*pulse)+')';
      c.fillRect(bm.x-6,bm.y1,12,bm.y2-bm.y1);
      c.fillStyle='rgba(255,255,255,'+(.85*pulse)+')';
      c.fillRect(bm.x-1.6,bm.y1,3.2,bm.y2-bm.y1);
      c.globalCompositeOperation='source-over';
      c.fillStyle='#ff4d6a';c.beginPath();c.arc(bm.x,bm.y1-9,3.5,0,6.283);c.fill();
    }else{
      if(dIm){const dS=42/dIm.height;
        c.save();c.translate(bm.x1+6,bm.y);c.rotate(-Math.PI/2);
        c.drawImage(dIm,-dIm.width*dS/2,-dIm.height*dS,dIm.width*dS,dIm.height*dS);c.restore();
      }else{
        c.fillStyle='#141a30';rr(c,bm.x1-16,bm.y-11,14,22,5);c.fill();
        c.strokeStyle='rgba(255,77,106,.7)';c.lineWidth=1.5;rr(c,bm.x1-16,bm.y-11,14,22,5);c.stroke();
      }
      c.globalCompositeOperation='lighter';
      c.fillStyle='rgba(255,40,70,'+(.32*pulse)+')';
      c.fillRect(bm.x1,bm.y-6,bm.x2-bm.x1,12);
      c.fillStyle='rgba(255,255,255,'+(.85*pulse)+')';
      c.fillRect(bm.x1,bm.y-1.6,bm.x2-bm.x1,3.2);
      c.globalCompositeOperation='source-over';
      c.fillStyle='#ff4d6a';c.beginPath();c.arc(bm.x1-9,bm.y,3.5,0,6.283);c.fill();
    }
    c.restore();},

  drawNote(c,n){
    const bob=Math.sin(this.t*2.4+n.ph)*4;
    c.save();c.translate(n.x,n.y+bob);c.rotate(Math.sin(this.t*1.4+n.ph)*.12);
    this.glowAt(c,0,0,30,'',.55);
    if(!drawAsset(c,'note',0,0,{scale:28/Assets.get('note')?.height||0.06})){
      c.fillStyle='#101a33';rr(c,-11,-13,22,26,4);c.fill();
      c.strokeStyle='#ffd166';c.lineWidth=2;rr(c,-11,-13,22,26,4);c.stroke();
      c.fillStyle='rgba(255,209,102,.85)';
      c.fillRect(-6,-7,12,2);c.fillRect(-6,-2,12,2);c.fillRect(-6,3,8,2);
      drawFlutonMark(c,4,7,3.4,'#ffd166');
    }
    c.restore();},
  drawCell(c,p){
    const bob=Math.sin(this.t*3+p.ph)*4;
    c.save();c.translate(p.x,p.y+bob);
    this.glowAt(c,0,0,24,'',.5);
    const cIm=Assets.get('cell');
    if(!drawAsset(c,'cell',0,0,{scale:cIm?27/cIm.height:0}) ){
      c.fillStyle='#0e1a14';rr(c,-8,-11,16,22,5);c.fill();
      c.strokeStyle='#5dff9a';c.lineWidth=2;rr(c,-8,-11,16,22,5);c.stroke();
      c.fillStyle='#5dff9a';c.font='bold 13px ui-monospace,monospace';c.textAlign='center';
      c.fillText('⚡',0,5);
    }
    c.restore();},
  drawYarnPickup(c,p){
    const bob=Math.sin(this.t*3+p.ph)*4;
    c.save();c.translate(p.x,p.y+bob);
    this.glowAt(c,0,0,24,'',.5);
    const yIm=Assets.get('yarn');
    if(!drawAsset(c,'yarn',0,0,{scale:yIm?25/yIm.height:0})){
      c.fillStyle='#2a1226';c.beginPath();c.arc(0,0,10,0,6.283);c.fill();
      c.strokeStyle='#ff7dd6';c.lineWidth=2;c.beginPath();c.arc(0,0,10,0,6.283);c.stroke();
      c.strokeStyle='rgba(255,125,214,.8)';c.lineWidth=1.4;
      c.beginPath();c.arc(1,1,5.5,0,6.283);c.stroke();
      c.beginPath();c.moveTo(-6,-5);c.quadraticCurveTo(-14,-12,-8,-16);c.stroke();
    }
    c.restore();},
  drawYarnBall(c,x,y,rot){
    this.glowAt(c,x,y,20,'',.4);
    const yIm=Assets.get('yarn');
    if(!drawAsset(c,'yarn',x,y,{rot:rot*0.3,scale:yIm?16/yIm.height:0})){
      c.save();c.translate(x,y);c.rotate(rot);
      c.fillStyle='#ff7dd6';c.beginPath();c.arc(0,0,8,0,6.283);c.fill();
      c.strokeStyle='#ffd1ee';c.lineWidth=1.6;
      c.beginPath();c.arc(0,0,5,0,6.283);c.stroke();
      c.beginPath();c.moveTo(-7,-3);c.lineTo(7,2);c.stroke();
      c.restore();
    }},

  drawExit(c,e){
    const open=Game.notes.every(n=>n.got);
    const x=e.x+18,y=e.y+18;
    if(open)this.glowAt(c,x,y,54,'',.6+.2*Math.sin(this.t*4));
    const vIm=Assets.get('vault');
    if(vIm){
      const vH=64,vS=vH/vIm.height,vW=vIm.width*vS;
      c.save();
      if(!open)c.globalAlpha=.9;
      c.drawImage(vIm,x-vW/2,e.y+36-vH,vW,vH);
      c.restore();
      if(open){
        c.save();c.globalCompositeOperation='lighter';
        c.globalAlpha=.35+.2*Math.sin(this.t*4);
        c.drawImage(vIm,x-vW/2,e.y+36-vH,vW,vH);
        c.restore();
        c.fillStyle='#3df5e0';c.font='bold 16px ui-monospace,monospace';c.textAlign='center';
        c.fillText('\u25B6',x,e.y+14);
      }else{
        c.fillStyle='#ff8aa0';c.font='bold 11px ui-monospace,monospace';c.textAlign='center';
        const got=Game.notes.filter(n=>n.got).length;
        c.fillText(got+'/'+Game.notes.length,x,e.y-8);
      }
      if(open){c.fillStyle='rgba(61,245,224,.9)';c.font='bold 9px ui-monospace,monospace';
        c.textAlign='center';c.fillText('EXIT',x,e.y-20);}
      return;
    }
    c.save();c.translate(x,y);
    c.fillStyle=open?'rgba(61,245,224,.12)':'rgba(40,48,72,.85)';
    rr(c,-16,-22,32,44,7);c.fill();
    c.strokeStyle=open?'#3df5e0':'#4a5374';c.lineWidth=2.5;
    rr(c,-16,-22,32,44,7);c.stroke();
    if(open){
      c.strokeStyle='rgba(61,245,224,.8)';c.lineWidth=2;c.setLineDash([6,6]);
      c.lineDashOffset=-this.t*30;
      rr(c,-10,-16,20,32,4);c.stroke();c.setLineDash([]);
      c.fillStyle='#3df5e0';c.font='bold 16px ui-monospace,monospace';c.textAlign='center';
      c.fillText('▶',1,6);
    }else{
      c.fillStyle='#8fa0cc';c.font='bold 13px ui-monospace,monospace';c.textAlign='center';
      c.fillText('🔒',0,-2);
      c.font='bold 11px ui-monospace,monospace';c.fillStyle='#ff8aa0';
      const got=Game.notes.filter(n=>n.got).length;
      c.fillText(got+'/'+Game.notes.length,0,16);
    }
    c.restore();
    if(open){c.fillStyle='rgba(61,245,224,.9)';c.font='bold 9px ui-monospace,monospace';
      c.textAlign='center';c.fillText('EXIT',x,e.y-28);}},

  drawBot(c,b){
    const t=this.t,x=b.x,y=b.y;
    const hover=Math.sin(t*4+b.ph)*2;
    c.save();c.translate(x,y+hover);
    /* shadow */
    c.globalAlpha=.3;c.fillStyle='#000';
    c.beginPath();c.ellipse(0,3-hover,13,4,0,0,6.283);c.fill();c.globalAlpha=1;
    /* body: generated sprite with procedural fallback */
    const bKey=b.state==='chase'?'bot_alert':b.state==='distract'?'bot_distract':'bot';
    const bIm=Assets.get(bKey);
    let bDrew=false;
    if(bIm){
      const bS=36/bIm.height;
      c.save();
      if(b.facing<0)c.scale(-1,1);
      c.drawImage(bIm,-bIm.width*bS/2,-bIm.height*bS,bIm.width*bS,bIm.height*bS);
      c.restore();bDrew=true;
    }
    if(!bDrew){
    c.fillStyle='#171b2b';rr(c,-14,-30,28,26,8);c.fill();
    c.strokeStyle=b.state==='chase'?'#ff4d6a':b.state==='distract'?'#ffd166':'#4a5374';
    c.lineWidth=2;rr(c,-14,-30,28,26,8);c.stroke();
    c.fillStyle='rgba(224,163,90,.35)';c.fillRect(-10,-27,20,4);
    const ex=b.facing*5;
    c.fillStyle='#0a0d18';c.beginPath();c.arc(ex,-17,7.5,0,6.283);c.fill();
    const eyeCol=b.state==='chase'?'#ff4d6a':b.state==='distract'?'#ffd166':'#ff8aa0';
    c.fillStyle=eyeCol;c.beginPath();c.arc(ex+b.facing*2,-17,4,0,6.283);c.fill();
    c.fillStyle='#fff';c.beginPath();c.arc(ex+b.facing*2.6,-18.4,1.4,0,6.283);c.fill();
    c.fillStyle='#0d1120';rr(c,-12,-6,9,5,2);c.fill();rr(c,3,-6,9,5,2);c.fill();
    c.strokeStyle='#4a5374';c.lineWidth=1.5;
    c.beginPath();c.moveTo(0,-30);c.lineTo(0,-36);c.stroke();
    c.fillStyle=eyeCol;c.beginPath();c.arc(0,-37,2.2,0,6.283);c.fill();
    }
    /* state bubble */
    if(b.state==='chase'){
      c.fillStyle='#ff4d6a';c.font='bold 16px ui-monospace,monospace';c.textAlign='center';
      c.fillText('!',0,-46);
      this.glowAt(c,0,-17,22,'',.4);
    }else if(b.state==='distract'){
      c.fillStyle='#ffd166';c.font='bold 15px ui-monospace,monospace';c.textAlign='center';
      c.fillText('♥',0,-46);}
    c.restore();},

  /* ---- HUD in-canvas extras handled by DOM ---- */
};

/* ============ 9b · CAT SPRITE (AI art, procedural fallback) ============ */
const CAT_S = ((MANIFEST.cat && MANIFEST.cat.drawH) || 54) / 300;
function catFrameKey(cat){
  if(cat.win) return 'cat_win';
  if(cat.hurtT > 0) return 'cat_hurt';
  if(cat.throwT > 0) return 'cat_throw';
  if(!cat.onGround) return cat.vy < 0 ? 'cat_jump' : 'cat_fall';
  if(cat.landT > 0) return 'cat_land';
  if(Math.abs(cat.vx) > 40) return 'cat_run' + ((Math.floor(cat.anim) % 3) + 1);
  return 'cat_idle';
}
function drawCatGame(c){
  const cat = Game.cat, t = Render.t;
  if(!cat) return;
  const key = catFrameKey(cat);
  const im = Assets.get(key);
  if(!im){ drawCat(c, {x:cat.x, y:cat.y, dir:cat.dir, cat, t}); return; }
  const sqx = cat.squashX || 1, sqy = cat.squashY || 1;
  let alpha = 1;
  if(cat.invuln > 0 && cat.hurtT <= 0 && Math.floor(t*14) % 2 === 0) alpha = 0.3;
  const w = im.width * CAT_S, h = im.height * CAT_S;
  /* A consistent contact shadow keeps the mascot grounded across every
     sprite frame, including jump, hurt and encryption animations. */
  c.save();
  c.globalAlpha = cat.onGround ? 0.28 : 0.16;
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(cat.x, cat.y + 1, 15 + Math.min(8, Math.abs(cat.vy||0)*0.008), 4, 0, 0, 6.283);
  c.fill();
  c.restore();
  c.save();
  c.translate(cat.x, cat.y);
  c.scale(cat.dir * sqx, sqy);
  if(cat.enc){
    drawTinted(c, im, -w/2, -h, w, h, 'rgba(150,95,255,0.68)', 0.68);
    c.globalAlpha = 0.9;
    c.drawImage(im, -w/2, -h, w, h);
    c.globalAlpha = 1;
    drawTinted(c, im, -w/2, -h, w, h, 'rgba(160,110,255,0.55)', 0.55);
  }else{
    c.globalAlpha = alpha;
    c.drawImage(im, -w/2, -h, w, h);
    c.globalAlpha = 1;
  }
  c.restore();
  if(cat.enc){
    c.save();
    c.translate(cat.x, cat.y - 16);
    c.strokeStyle = 'rgba(176,124,255,.95)'; c.lineWidth = 2;
    c.setLineDash([7,6]); c.lineDashOffset = -t*40;
    c.beginPath(); c.ellipse(0, 0, 26, 32, 0, 0, 6.283); c.stroke();
    c.setLineDash([]);
    /* Time-driven glitch bands look intentional and avoid per-frame
       random-number churn and distracting flicker. */
    const glitchStep=Math.floor(t*12);
    if(glitchStep%5===0){
      c.globalAlpha=0.3;c.fillStyle='#b07cff';
      c.fillRect(-16+Math.sin(t*13)*4,-12-(Math.sin(t*7)+1)*12,32,3);
      c.globalAlpha=1;
    }
    Render.glowAt(c, 0, 0, 42, '', 0.35);
    c.restore();
  }
}

/* ================= 10 · THE CAT (character art) ================= */
function drawFlutonMark(c,x,y,s,col){
  c.save();c.translate(x,y);c.rotate(Math.PI/4);
  c.strokeStyle=col;c.lineWidth=Math.max(1,s*.28);c.lineJoin='round';
  const r=s;
  c.strokeRect(-r,-r,r*2,r*2);
  c.rotate(-Math.PI/4);
  /* stylized F curl */
  c.beginPath();c.arc(-s*.28,s*.3,s*.3,0,6.283);c.stroke();
  c.beginPath();c.moveTo(-s*.28,s*.0);c.lineTo(s*.55,-s*.55);c.stroke();
  c.restore();
}
function drawCat(c,o){
  /* o: {x,y,dir,cat,t,title?,look?} — feet anchored, ~44px tall */
  const cat=o.cat,t=o.t,dir=o.dir||1;
  const enc=cat.enc;
  const fur=enc?'rgba(88,64,160,.75)':'#101018';
  const line=enc?'rgba(200,170,255,.95)':'#3d4258';
  const white=enc?'rgba(220,205,255,.85)':'#f2f3f8';
  const grey=enc?'rgba(160,130,240,.8)':'#565b70';
  const px=cat.squashX||1,py=cat.squashY||1;
  const win=cat.win||0;

  c.save();
  c.translate(o.x,o.y);
  if(o.title){/* already scaled by caller; wave handled by title */ }
  c.scale(dir*px,py);

  /* shadow */
  c.globalAlpha=.32*py;c.fillStyle='#000';
  c.beginPath();c.ellipse(0,2,13/px,3.6/py,0,0,6.283);c.fill();c.globalAlpha=1;

  const run=cat.onGround!==false&&Math.abs(cat.vx||0)>40;
  const air=!cat.onGround&&cat.vyPrev!==0&&Math.abs(cat.vy||0)>60;
  const phase=cat.anim||0;
  const bob=run?Math.sin(phase*2)*1.6:Math.sin(t*2)*.6;

  /* ---------- TAIL ---------- */
  const tailWave=Math.sin(t*(run?9:2.2)+(run?phase:0))*(run?4:5);
  c.strokeStyle=fur;c.lineWidth=7;c.lineCap='round';
  c.beginPath();c.moveTo(-11,-14+Math.sin(phase)*1);
  c.quadraticCurveTo(-24-tailWave*.5,-26,-20-tailWave,-38+(run?-4:0));
  c.quadraticCurveTo(-17-tailWave,-44,-12-tailWave*.6,-43);
  c.stroke();
  c.strokeStyle=line;c.lineWidth=1.4;
  c.beginPath();c.moveTo(-11,-16);c.quadraticCurveTo(-23-tailWave*.5,-27,-19-tailWave,-38);c.stroke();

  /* ---------- BACK LEGS ---------- */
  const legPh=run?phase*2:0;
  function leg(hx,hy,ph,front){
    const sw=run?Math.sin(ph):0;
    const lift=run?Math.max(0,Math.cos(ph))*5:0;
    let kx=hx+sw*7, ky=hy-8-lift*.4;
    let fx=hx+sw*9, fy=hy-lift;
    if(air){fx=hx+(front?7:-6);fy=hy-6;}
    c.strokeStyle=fur;c.lineWidth=7;c.lineCap='round';
    c.beginPath();c.moveTo(hx,hy-8);c.lineTo(kx,ky);c.lineTo(fx,fy);c.stroke();
    c.fillStyle=fur;c.beginPath();c.ellipse(fx,fy,4.4,3.2,0,0,6.283);c.fill();
    c.strokeStyle=line;c.lineWidth=1;
    c.beginPath();c.moveTo(hx,hy-9);c.lineTo(kx,ky);c.stroke();
  }
  leg(-8,0,run?legPh+Math.PI:0,false);
  leg(-3,0,run?legPh+Math.PI+1.6:1.6,false);

  /* ---------- BODY (tuxedo jacket) ---------- */
  c.save();
  c.translate(-1,-18+bob);
  c.fillStyle=fur;
  c.beginPath();c.ellipse(0,0,15,11.5,-.06,0,6.283);c.fill();
  /* jacket tails */
  c.beginPath();c.moveTo(-6,6);c.lineTo(-17,12);c.lineTo(-8,12);c.closePath();c.fill();
  /* lapel sheen */
  c.strokeStyle=line;c.lineWidth=1.4;
  c.beginPath();c.moveTo(-13,-4);c.quadraticCurveTo(-4,4,7,7);c.stroke();
  c.beginPath();c.moveTo(-11,2);c.lineTo(-15,9);c.stroke();
  /* buttons */
  c.fillStyle=enc?'rgba(230,220,255,.8)':'#cfd4e6';
  c.beginPath();c.arc(2,3,1.3,0,6.283);c.fill();
  c.beginPath();c.arc(5,6,1.3,0,6.283);c.fill();
  c.restore();

  /* ---------- FRONT LEGS ---------- */
  leg(5,0,run?legPh:0,true);
  leg(10,0,run?legPh+1.6:0,true);

  /* ---------- HEAD ---------- */
  const headBob=run?Math.sin(phase*2+.6)*1.2:Math.sin(t*2+.6)*.8;
  c.save();
  c.translate(8,-30+headBob+bob*.4);
  const twitch=(cat.twitchAmt||0)*Math.sin(t*40);
  /* ears */
  c.fillStyle=fur;
  c.beginPath();c.moveTo(-9,-8);c.lineTo(-6+twitch,-19);c.lineTo(-1,-9);c.closePath();c.fill();
  c.beginPath();c.moveTo(4,-10);c.lineTo(9-twitch,-20);c.lineTo(12,-8);c.closePath();c.fill();
  c.fillStyle=grey;
  c.beginPath();c.moveTo(-7.5,-9.5);c.lineTo(-6+twitch,-16);c.lineTo(-3,-10);c.closePath();c.fill();
  c.beginPath();c.moveTo(6,-11);c.lineTo(8.5-twitch,-17);c.lineTo(9.8,-10);c.closePath();c.fill();
  /* head shape */
  c.fillStyle=fur;
  c.beginPath();c.ellipse(1,0,13.5,11.5,0,0,6.283);c.fill();
  c.strokeStyle=line;c.lineWidth=1.2;
  c.beginPath();c.ellipse(1,0,13.5,11.5,0,0,6.283);c.stroke();
  /* forehead logo */
  drawFlutonMark(c,1,-7.5,4,white);
  /* eyes */
  const blink=cat.blink>0?.12:1;
  const alert=cat.alertLook||0;
  const eyeY=-1;
  c.save();c.translate(0,eyeY);
  function eye(ex){
    c.save();c.scale(1,blink);
    c.fillStyle=enc?'rgba(235,225,255,.95)':'#e9edf9';
    c.beginPath();c.ellipse(ex,0,4.4,5,0,0,6.283);c.fill();
    const lookX=(o.look!=null?o.look:(cat.vx>30?1:cat.vx<-30?-1:dir))*1.6;
    const lookY=air?-.8:0;
    c.fillStyle='#14151f';
    c.beginPath();c.ellipse(ex+lookX*.8,lookY,2.1,blink<1?.8:3.4,0,0,6.283);c.fill();
    c.fillStyle='#fff';
    c.beginPath();c.arc(ex+lookX*.8-1,lookY-1.6,1.15,0,6.283);c.fill();
    c.restore();
    /* lids outline */
    c.strokeStyle=line;c.lineWidth=1;
    c.beginPath();c.ellipse(ex,0,4.4,5,0,0,6.283);c.stroke();
  }
  if(win){ /* happy closed eyes */
    c.strokeStyle='#14151f';c.lineWidth=1.8;c.lineCap='round';
    c.beginPath();c.arc(-4,-.5,3.2,3.6,5.8);c.stroke();
    c.beginPath();c.arc(6,-.5,3.2,3.6,5.8);c.stroke();
  }else{eye(-4);eye(6);}
  c.restore();
  /* muzzle */
  c.fillStyle=enc?'rgba(120,95,200,.6)':'#191a24';
  c.beginPath();c.ellipse(3.5,5.5,5.4,4,0,0,6.283);c.fill();
  c.fillStyle=grey;
  c.beginPath();c.moveTo(3.5,3);c.lineTo(6,5.2);c.lineTo(1,5.2);c.closePath();c.fill();
  c.strokeStyle=enc?'rgba(220,205,255,.8)':'#8b91a8';c.lineWidth=1.2;
  c.beginPath();c.arc(1.6,6.4,2.4,.3,2.6);c.stroke();
  c.beginPath();c.arc(5.6,6.4,2.4,.55,2.85);c.stroke();
  /* whiskers */
  c.strokeStyle=enc?'rgba(230,220,255,.75)':'rgba(225,230,245,.8)';c.lineWidth=1;
  c.beginPath();
  c.moveTo(8,4);c.lineTo(19,1);c.moveTo(8,5.5);c.lineTo(19,5.5);c.moveTo(8,7);c.lineTo(18,10);
  c.moveTo(-1,4.5);c.lineTo(-10,2);c.moveTo(-1,6);c.lineTo(-10,7);
  c.stroke();
  /* bow tie with logo */
  c.save();c.translate(4,10.6);
  c.fillStyle=enc?'rgba(60,40,120,.9)':'#0a0a10';
  c.beginPath();c.moveTo(0,0);c.lineTo(-7,-4);c.lineTo(-7,4);c.closePath();c.fill();
  c.beginPath();c.moveTo(0,0);c.lineTo(7,-4);c.lineTo(7,4);c.closePath();c.fill();
  c.strokeStyle=line;c.lineWidth=1;
  c.beginPath();c.moveTo(0,0);c.lineTo(-7,-4);c.lineTo(-7,4);c.closePath();c.stroke();
  c.beginPath();c.moveTo(0,0);c.lineTo(7,-4);c.lineTo(7,4);c.closePath();c.stroke();
  c.fillStyle=white;c.beginPath();c.arc(0,0,2.1,0,6.283);c.fill();
  c.restore();
  /* white collar hint */
  c.strokeStyle=white;c.lineWidth=2.4;
  c.beginPath();c.arc(4,9.5,7,-.4,1.9);c.stroke();
  c.restore();

  /* GM wave (title only) */
  if(o.title){
    const wv=Math.sin(t*.9);
    c.save();c.translate(3,-26+bob);
    c.rotate(-2.0+wv*.5);
    c.strokeStyle=fur;c.lineWidth=6.5;c.lineCap='round';
    c.beginPath();c.moveTo(0,0);c.lineTo(11,0);c.stroke();
    c.fillStyle=fur;c.beginPath();c.arc(13,0,4.2,0,6.283);c.fill();
    c.strokeStyle=line;c.lineWidth=1;
    c.beginPath();c.arc(13,0,4.2,0,6.283);c.stroke();
    c.restore();
  }

  /* throw arm (yarn) */
  if(cat.throwT>0){
    const k=1-cat.throwT/.3;
    c.save();c.translate(6,-20+bob);
    c.rotate(-1.4+k*2.2);
    c.strokeStyle=fur;c.lineWidth=6.5;c.lineCap='round';
    c.beginPath();c.moveTo(0,0);c.lineTo(10,0);c.stroke();
    c.fillStyle=fur;c.beginPath();c.arc(12,0,4,0,6.283);c.fill();
    c.restore();
  }

  /* ---------- ENCRYPTION EFFECTS ---------- */
  if(enc){
    c.strokeStyle='rgba(176,124,255,.95)';c.lineWidth=2;
    c.setLineDash([7,6]);c.lineDashOffset=-t*40;
    c.beginPath();c.ellipse(0,-19,24,30,0,0,6.283);c.stroke();
    c.setLineDash([]);
    /* glitch ghosts */
    if(Math.random()<.5){
      c.globalAlpha=.28;
      c.fillStyle='#b07cff';
      const gy=-10-Math.random()*26;
      c.fillRect(-16+(Math.random()-.5)*8,gy,32,3);
      c.globalAlpha=1;
    }
    Render.glowAt(c,0,-19,40,'',.35);
  }
  c.restore();
}

/* ============ 11 · UI STORE (React bridge) ============
   Immutable snapshots + subscribe — consumed by useSyncExternalStore.
   Per-frame values (energy/det bars) bypass React via UI.refs registry. */
const UI=(()=>{
  const subs=new Set();
  let st={screen:'loading',loading:0,progressV:0,muted:false,arcade:false,onExit:null,
    resetArm:false,resetMsg:false,toast:null,
    coarse:false,portrait:false,hud:null};
  function set(patch){ st={...st,...patch}; subs.forEach(f=>f()); }
  return {
    refs:{},
    subscribe(fn){subs.add(fn);return()=>subs.delete(fn);},
    get(){return st;},
    set
  };
})();

/* ================= 12 · UI WIRING ================= */
function showScreen(id){
  const map={'scr-title':'title','scr-select':'select','scr-how':'how',
    'scr-pause':'pause','scr-complete':'complete','scr-over':'over'};
  UI.set({screen:id?(map[id]||'play'):'play'});
}
function setSoundLabels(){ UI.set({muted:SFX.isMuted()}); }
function buildLevelGrid(){ UI.set({progressV:UI.get().progressV+1}); }
/* actions: the single command surface — React buttons and QA both call these */
const actions={
  play(){SFX.resume();SFX.click();Game.startRun();},
  levels(){SFX.resume();SFX.click();buildLevelGrid();Game.state='select';showScreen('scr-select');},
  how(){SFX.resume();SFX.click();Game.state='how';showScreen('scr-how');},
  back(){SFX.resume();SFX.click();Game.state='title';showScreen('scr-title');buildLevelGrid();},
  sound(){SFX.resume();SFX.click();toggleSound();},
  reset(){
    SFX.click();
    if(UI.get().resetArm){
      store.data={unlocked:1,stars:{},scores:{}};store.save();
      UI.set({resetArm:false,resetMsg:true,progressV:UI.get().progressV+1});
      setTimeout(()=>{if(UI.get().resetMsg)UI.set({resetMsg:false});},1800);
    }else{
      UI.set({resetArm:true});
      setTimeout(()=>{if(UI.get().resetArm)UI.set({resetArm:false});},2600);
    }},
  pause(){SFX.click();Game.togglePause();},
  resume(){SFX.click();Game.resume();},
  restart(){SFX.click();Game.load(Game.levelIdx);},
  pauseLevels(){SFX.click();Game.state='select';showScreen('scr-select');buildLevelGrid();},
  next(){
    SFX.click();
    if(Game.levelIdx+1<LEVELS.length)Game.load(Game.levelIdx+1);
    else{Game.state='title';showScreen('scr-title');buildLevelGrid();}},
  retry(){SFX.click();Game.load(Game.levelIdx);},
  overLevels(){SFX.click();Game.state='select';showScreen('scr-select');buildLevelGrid();},
  overTitle(){SFX.click();Game.state='title';showScreen('scr-title');buildLevelGrid();},
  arcadeExit(){SFX.click();
    if(Game.state==='play')Game.pause();
    const ex=UI.get().onExit;
    leaveArcade();
    if(ex)ex();},
  level(i){SFX.resume();SFX.click();Game.load(i);}
};
function uiInit(){
  document.addEventListener('visibilitychange',
    ()=>{if(document.hidden&&Game.state==='play')Game.pause();});
}

/* ================= 12 · MAIN LOOP ================= */
let lastTs=0,active=false,booted=false;
function loop(ts){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(ts-lastTs)/1000||0);lastTs=ts;
  if(!active)return;
  if(Game.state==='play')updateGame(dt);
  else if(Game.state==='title'||Game.state==='select'||Game.state==='how')FX.update(dt);
  Input.consume();
  syncTouch();
  Render.frame(dt);
}
function syncTouch(){
  const coarse=window.matchMedia('(pointer:coarse)').matches;
  const play=Game.state==='play';
  const portrait=play&&coarse&&isCoarsePortrait();
  const s=UI.get();
  if(s.coarse!==coarse||s.portrait!==portrait||s.play!==play)
    UI.set({coarse,portrait,play});
}
function boot(){
  Render.init();active=true;
  if(booted)return;
  booted=true;
  uiInit();
  setSoundLabels();
  requestAnimationFrame(loop);
  const loadP=Assets.ready?Promise.resolve():
    Assets.loadAll((d,t)=>UI.set({loading:Math.round(d/t*100)}));
  loadP.then(()=>{
    const elapsed=(performance&&performance.now)?performance.now():Date.now();
    setTimeout(()=>{showScreen('scr-title');buildLevelGrid();},Math.max(0,400-elapsed));
  });
  /* unlock audio on first gesture anywhere */
  const gest=()=>{SFX.resume();window.removeEventListener('pointerdown',gest);window.removeEventListener('keydown',gest);};
  window.addEventListener('pointerdown',gest);window.addEventListener('keydown',gest);
}
/* arcade lifecycle — host mounts/unmounts the game module */
function enterArcade(onExit){UI.set({arcade:true,onExit:onExit||null});boot();}
function leaveArcade(){
  active=false;
  if(Game.state==='play')Game.pause();
  UI.set({arcade:false,onExit:null});
}
function preloadAssets(onP){
  if(Assets.ready){onP&&onP(Assets.total,Assets.total);return Promise.resolve();}
  return Assets.loadAll(onP);
}
function isActive(){return active;}

/* engine handle for the React shell (and headless QA) */
window.__GAME={Game,Assets,Render,Input,UI,LEVELS,LEVEL_DYN,LEVEL_DECOR,store,CFG,actions,
  SFX,FX,boot,showScreen,buildLevelGrid,setSoundLabels,toggleSound,isCoarsePortrait,
  catFrameKey,fmtTime,solidAt,losClear,inCone,dist2,drawAsset,
  enterArcade,leaveArcade,preloadAssets,isActive};