/* ---- headless DOM/canvas/Image stubs for Node QA ---- */
const __els = {};
function mkClassList(){ const set=new Set(); return {
  add:(...c)=>c.forEach(x=>set.add(x)),
  remove:(...c)=>c.forEach(x=>set.delete(x)),
  toggle:(c,f)=>{ if(f===undefined){ set.has(c)?set.delete(c):set.add(c);} else { f?set.add(c):set.delete(c);} },
  contains:c=>set.has(c) }; }
function mkCtx(){
  const grad={addColorStop(){}};
  const special={createRadialGradient:()=>grad,createLinearGradient:()=>grad,
    createPattern:()=>({__pattern:1}),measureText:()=>({width:10}),getImageData:()=>({data:[]})};
  return new Proxy({},{ get(t,p){ if(p in special) return special[p];
      if(!(p in t)) t[p]=(...a)=>undefined;
      return typeof t[p]==='function'?t[p].bind(null):t[p]; },
    set(t,p,v){ t[p]=v; return true; }});
}
function mkEl(tag){
  const el={tagName:tag||'div',style:{},dataset:{},children:[],_html:'',className:'',_h:{},
    classList:mkClassList(),textContent:'',width:0,height:0,
    set innerHTML(v){this._html=v;this.children=[];},get innerHTML(){return this._html;},
    addEventListener(t,f){ (this._h[t]=this._h[t]||[]).push(f); },
    removeEventListener(){},
    fire(t,e){ e=e||{}; e.preventDefault=e.preventDefault||(()=>{});
      (this._h[t]||[]).forEach(f=>f(e)); },
    appendChild(c){this.children.push(c);return c;},
    querySelectorAll(){return [];},querySelector(){return null;},focus(){},
    getContext(){return mkCtx();},
    onclick:null};
  return el;
}
const __raf=[]; let __t=0;
global.requestAnimationFrame=cb=>{__raf.push(cb);return __raf.length;};
global.cancelAnimationFrame=()=>{};
global.localStorage={__d:{},getItem(k){return this.__d[k]??null;},setItem(k,v){this.__d[k]=String(v);}};
const __tbtnIds=['tLeft','tRight','tJump','tEnc','tYarn'];
global.document={
  getElementById(id){ return __els[id] || (__els[id]=mkEl('div')); },
  createElement(tag){ return mkEl(tag); },
  querySelectorAll(sel){ if(sel==='.tbtn') return __tbtnIds.map(id=>global.document.getElementById(id)); return []; },
  querySelector(){ return null; },
  addEventListener(){}, removeEventListener(){},
  hidden:false, body:mkEl('body')
};
['left','right','jump','enc','yarn'].forEach((act,i)=>{
  global.document.getElementById(__tbtnIds[i]).dataset.act=act;
});
const __winH={};
global.__mq={coarse:false,portrait:false};
global.window={
  innerWidth:1280, innerHeight:720, devicePixelRatio:1,
  addEventListener(t,f){ (__winH[t]=__winH[t]||[]).push(f); },
  removeEventListener(){},
  matchMedia:q=>({matches:(q.includes('coarse')&&global.__mq.coarse)||(q.includes('portrait')&&global.__mq.portrait),
    addEventListener(){},removeEventListener(){}}),
  AudioContext:undefined, webkitAudioContext:undefined, console
};
global.navigator={userAgent:'headless'};
global.window.__NO_MOUNT=1; /* React bundle must not mount in headless tests */
global.Image=class{
  set src(v){ this._src=String(v);
    this.width=512;this.height=512;
    queueMicrotask(()=>{
      if(this._src.indexOf('missing')>=0){ this.onerror&&this.onerror(); }
      else { this.complete=true;this.naturalWidth=512;this.naturalHeight=512;
             this.onload&&this.onload(); } }); }
  get src(){ return this._src; }
};
global.__emitKey=(code,down)=>{ const h=__winH[down?'keydown':'keyup']||[];
  h.forEach(f=>f({code,repeat:false,preventDefault(){}})); };
global.__tick=(n,dt)=>{ dt=dt||1000/60;
  for(let i=0;i<n;i++){ const q=__raf.splice(0); __t+=dt; q.forEach(cb=>cb(__t)); } };
global.__setWH=(w,h)=>{ window.innerWidth=w; window.innerHeight=h;
  (__winH['resize']||[]).forEach(f=>f()); };
global.__sleep=ms=>new Promise(r=>setTimeout(r,ms));
