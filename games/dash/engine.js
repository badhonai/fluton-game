/* GLASS DASH — one-button endless runner engine (pure sim + canvas draw).
   Feel values follow the research brief: coyote 0.12s, jump buffer 0.12s,
   variable-height jump (release cuts velocity), eased squash & stretch. */

const GRAV = 2100;
const JUMP_V = 780;          /* up positive */
const BEST_KEY = 'arcade-dash-best';

export class DashEngine {
  constructor(api){
    this.api = api || {};
    this.best = this._loadBest();
    this.W = 960; this.H = 540; this.groundY = 430;
    this.reset();
  }
  _loadBest(){ try{ return parseInt(localStorage.getItem(BEST_KEY)||'0',10)||0; }catch(e){ return 0; } }
  _saveBest(){ try{ localStorage.setItem(BEST_KEY, String(this.best)); }catch(e){} }
  _ev(type, data){ this.events.push(Object.assign({ type }, data||{})); }
  drain(){ const e = this.events; this.events = []; return e; }

  layout(W, H){ this.W = W; this.H = H; this.groundY = Math.round(H * 0.8); }

  reset(){
    this.state = 'run';           /* run | dead */
    this.t = 0; this.dist = 0; this.speed = 300;
    this.bonus = 0; this.notes = 0; this.score = 0;
    this.cat = { h:0, vy:0, onGround:true, coyote:0.12, jbuf:0, squash:1, anim:0, cutLock:0 };
    this.obstacles = []; this.pickups = [];
    this.nextSpawn = 520; this.nextPick = 340;
    this.shake = 0; this.deathT = 0; this.gateFlip = 0;
    this.events = [];
    this.record = false;
  }

  jump(){
    if(this.state !== 'run') return;
    this.cat.jbuf = 0.12;
  }
  /* release early → shorter jump (variable height) */
  release(){
    if(this.state === 'run' && this.cat.vy > 260) this.cat.vy = 260;
  }

  update(dt){
    if(this.state === 'dead'){
      this.deathT += dt;
      this.shake = Math.max(0, this.shake - dt * 2.4);
      return;
    }
    this.t += dt;
    this.gateFlip += dt;
    this.speed = Math.min(660, this.speed + 7.5 * dt);
    this.dist += this.speed * dt;
    const c = this.cat;

    /* forgiving controls */
    c.jbuf = Math.max(0, c.jbuf - dt);
    c.coyote = c.onGround ? 0.12 : Math.max(0, c.coyote - dt);
    if(c.jbuf > 0 && c.coyote > 0){
      c.vy = JUMP_V; c.onGround = false; c.coyote = 0; c.jbuf = 0;
      c.squash = 1.28; this._ev('jump');
    }
    c.vy -= GRAV * dt;                 /* up positive */
    c.h += c.vy * dt;
    if(c.h <= 0){
      if(!c.onGround){ c.squash = 0.7; this._ev('land'); }
      c.h = 0; c.vy = 0; c.onGround = true;
    } else c.onGround = false;
    c.squash += (1 - c.squash) * Math.min(1, dt * 11);
    c.anim += this.dist / 30;

    /* score */
    this.score = Math.max(this.score, Math.floor(this.dist / 10) + this.bonus);

    /* obstacle spawning */
    this.nextSpawn -= this.speed * dt;
    if(this.nextSpawn <= 0){
      const tier = this.t < 8 ? 0 : this.t < 20 ? 1 : 2;
      const r = Math.random();
      let type = r < 0.52 ? 'shard' : r < 0.82 ? 'block' : 'gate';
      if(tier === 0 && type === 'gate') type = 'shard';
      const w = type === 'shard' ? 26 + Math.random() * 16
              : type === 'block' ? 34 : 20;
      const h = type === 'shard' ? 26 + Math.random() * 14
              : type === 'block' ? 52 + Math.random() * 12 : 150;
      this.obstacles.push({
        x: this.dist + this.W + 40, w, h, type,
        ph: Math.random() * 1.9, on: true
      });
      this.nextSpawn = Math.max(160, 260 + Math.random() * 180 - tier * 34) + w;
      if(type === 'gate') this.nextSpawn += 140; /* breathing room after gates */
    }
    /* gate cycling: on ~1.05s, off ~0.85s */
    for(const o of this.obstacles){
      if(o.type === 'gate'){
        const cycle = (this.t + o.ph) % 1.9;
        o.on = cycle < 1.05;
      }
    }

    /* pickup spawning: arcs of notes, occasional yarn */
    this.nextPick -= this.speed * dt;
    if(this.nextPick <= 0){
      const x0 = this.dist + this.W + 60;
      const yarnArc = Math.random() < 0.22;
      const n = 3;
      for(let i = 0; i < n; i++){
        const arc = Math.sin((i / (n - 1)) * Math.PI);
        this.pickups.push({
          x: x0 + i * 48, h: 52 + arc * 44,
          kind: yarnArc && i === 1 ? 'yarn' : 'note',
          ph: Math.random() * 6.28, got: false
        });
      }
      this.nextPick = 430 + Math.random() * 320;
    }

    /* collisions */
    const cw0 = this.dist + this.W * 0.28 - 10;   /* cat world box */
    const cw1 = this.dist + this.W * 0.28 + 10;
    const ch0 = c.h, ch1 = c.h + 38;
    for(const o of this.obstacles){
      if(o.type === 'gate' && !o.on) continue;
      const ox0 = o.x, ox1 = o.x + o.w;
      if(cw1 > ox0 && cw0 < ox1 && ch1 > 0 && ch0 < o.h){ this._die(); break; }
    }
    /* pickups */
    for(const p of this.pickups){
      if(p.got) continue;
      const dx = Math.abs((this.dist + this.W * 0.28) - p.x);
      const dy = Math.abs((c.h + 20) - p.h);
      if(dx < 26 && dy < 28){
        p.got = true;
        if(p.kind === 'yarn'){ this.notes += 1; this.bonus += 25; this._ev('yarn', { x:p.x, h:p.h }); }
        else { this.notes += 1; this.bonus += 10; this._ev('note', { x:p.x, h:p.h }); }
      }
    }
    /* cull */
    while(this.obstacles.length && this.obstacles[0].x + this.obstacles[0].w < this.dist - 80)
      this.obstacles.shift();
    while(this.pickups.length && (this.pickups[0].got || this.pickups[0].x < this.dist - 80))
      this.pickups.shift();
  }

  _die(){
    if(this.state !== 'run') return;
    this.state = 'dead'; this.deathT = 0; this.shake = 1;
    this.cat.squash = 1.3;
    if(this.score > this.best){ this.best = this.score; this.record = true; this._saveBest(); }
    this._ev('die', { score:this.score, best:this.best, record:this.record, notes:this.notes });
  }

  /* ---------- rendering ---------- */
  draw(c, A, FX){
    const W = this.W, H = this.H, gy = this.groundY;
    const catScreen = W * 0.28;
    c.save();
    if(this.shake > 0){
      c.translate((Math.random()-.5) * this.shake * 10, (Math.random()-.5) * this.shake * 10);
    }
    /* sky (cached — rebuilt only when layout changes) */
    if(!this._sky || this._skyH !== H){
      const sky = c.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#0a1024'); sky.addColorStop(.75,'#070b18'); sky.addColorStop(1,'#06080f');
      this._sky = sky; this._skyH = H;
    }
    c.fillStyle = this._sky; c.fillRect(-20,-20,W+40,H+40);

    /* parallax (mirrored loop, same trick as the heist) */
    const far = A && A.get ? A.get('bg_far') : null;
    const mid = A && A.get ? A.get('bg_mid') : null;
    if(far) this._loopX(c, far, -this.dist * 0.10, H - Math.max(200, H*0.5) - H*0.05, Math.max(200, H*0.5));
    else { c.fillStyle = '#0d1428'; c.fillRect(0, H*0.55, W, H*0.45); }
    if(mid){
      c.globalAlpha = 0.7;
      this._loopX(c, mid, -this.dist * 0.26, H - Math.max(230, H*0.56) + H*0.03, Math.max(230, H*0.56));
      c.globalAlpha = 1;
    }

    /* ground */
    const face = A && A.get ? A.get('face') : null;
    if(face){ c.fillStyle = c.createPattern(face,'repeat'); }
    else c.fillStyle = '#0d1526';
    c.fillRect(-20, gy, W+40, H - gy + 20);
    const strip = A && A.get ? A.get('plat_top') : null;
    if(strip){
      for(let x = -20; x < W + 40; x += 36) c.drawImage(strip, x, gy - 1, 36, 14);
    }
    c.fillStyle = 'rgba(150,255,247,.9)'; c.fillRect(-20, gy, W+40, 2);

    /* obstacles */
    for(const o of this.obstacles){
      const x = o.x - this.dist;
      if(x > W + 60 || x + o.w < -60) continue;
      if(o.type === 'gate'){
        /* posts */
        c.fillStyle = '#141a30';
        c.fillRect(x - 4, gy - o.h - 10, 8, o.h + 10);
        c.fillRect(x + o.w - 4, gy - o.h - 10, 8, o.h + 10);
        if(o.on){
          const pulse = 0.75 + Math.sin(this.t * 18) * 0.25;
          c.fillStyle = 'rgba(255,77,106,' + (0.35 * pulse) + ')';
          c.fillRect(x + 2, gy - o.h, o.w - 4, o.h);
          c.fillStyle = 'rgba(255,255,255,' + (0.85 * pulse) + ')';
          c.fillRect(x + o.w/2 - 1.4, gy - o.h, 2.8, o.h);
        } else {
          c.strokeStyle = 'rgba(61,245,224,.55)'; c.lineWidth = 2;
          c.setLineDash([6,7]);
          c.beginPath(); c.moveTo(x + o.w/2, gy - o.h); c.lineTo(x + o.w/2, gy);
          c.stroke(); c.setLineDash([]);
        }
      } else if(o.type === 'shard'){
        c.beginPath();
        c.moveTo(x, gy); c.lineTo(x + o.w * .5, gy - o.h); c.lineTo(x + o.w, gy);
        c.closePath();
        const g = c.createLinearGradient(x, gy - o.h, x, gy);
        g.addColorStop(0,'rgba(190,255,250,.95)'); g.addColorStop(1,'rgba(61,245,224,.4)');
        c.fillStyle = g; c.fill();
        c.strokeStyle = '#3df5e0'; c.lineWidth = 1.5; c.stroke();
      } else { /* block */
        if(face){ c.fillStyle = c.createPattern(face,'repeat'); } else c.fillStyle = '#0d1526';
        c.fillRect(x, gy - o.h, o.w, o.h);
        c.fillStyle = 'rgba(150,255,247,.9)'; c.fillRect(x, gy - o.h, o.w, 2);
        c.strokeStyle = 'rgba(176,124,255,.5)'; c.lineWidth = 1.5;
        c.strokeRect(x + .75, gy - o.h + .75, o.w - 1.5, o.h - 1.5);
      }
    }

    /* pickups */
    for(const p of this.pickups){
      if(p.got) continue;
      const x = p.x - this.dist, y = gy - p.h - Math.sin(this.t * 3 + p.ph) * 5;
      if(x < -40 || x > W + 40) continue;
      const key = p.kind === 'yarn' ? 'yarn' : 'note';
      const img = A && A.get ? A.get(key) : null;
      this._glow(c, x, y, p.kind === 'yarn' ? 26 : 24,
        p.kind === 'yarn' ? '255,125,214' : '255,209,102', .5);
      if(img){
        const s = (p.kind === 'yarn' ? 24 : 27) / img.height;
        c.drawImage(img, x - img.width*s/2, y - img.height*s/2, img.width*s, img.height*s);
      } else {
        c.fillStyle = p.kind === 'yarn' ? '#ff7dd6' : '#ffd166';
        c.beginPath(); c.arc(x, y, 8, 0, 6.283); c.fill();
      }
    }

    /* cat */
    const feetY = gy - this.cat.h;
    const sq = this.cat.squash;
    const key = this.state === 'dead' ? 'cat_hurt'
      : !this.cat.onGround ? (this.cat.vy > 0 ? 'cat_jump' : 'cat_fall')
      : 'cat_run' + ((Math.floor(this.cat.anim) % 3) + 1);
    const img = A && A.get ? A.get(key) : null;
    c.save();
    c.translate(catScreen, feetY);
    c.scale(2 - sq, sq);           /* preserve area-ish squash */
    if(img){
      const s = 46 / 300;
      c.drawImage(img, -img.width*s/2, -img.height*s, img.width*s, img.height*s);
    } else {
      c.fillStyle = '#10131d'; c.fillRect(-11, -38, 22, 38);
      c.fillStyle = '#fff'; c.fillRect(-11, -38, 22, 5);
    }
    c.restore();

    if(FX){ FX.update(0); FX.draw(c); } /* particles live in screen space here */
    c.restore();
  }

  _loopX(c, img, offset, y, h){
    const w = h * (img.width / img.height);
    let x = offset % w; if(x > 0) x -= w;
    let i = 0;
    while(x < this.W + w && i < 14){
      if((i % 2) === 1){ c.save(); c.translate(x + w, y); c.scale(-1,1); c.drawImage(img,0,0,w,h); c.restore(); }
      else c.drawImage(img, x, y, w, h);
      x += w; i++;
    }
  }
  _glow(c, x, y, r, rgb, a){
    const g = c.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  }
}

export const DASH_BEST_KEY = BEST_KEY;
