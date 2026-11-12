/* Arcade store — home/host routing, metadata, asset preload progress. */
import { useSyncExternalStore } from 'react';
import '../../src/game.js'; /* engine side-effects: window.__GAME */

const subs = new Set();
function loadMeta(){
  try { return JSON.parse(localStorage.getItem('arcade-meta')) || { last:{} }; }
  catch(e){ return { last:{} }; }
}
let st = { ready:false, loading:0, screen:'home', gameId:null, meta:loadMeta() };

function emit(){ subs.forEach(f => f()); }
function saveMeta(){ try{ localStorage.setItem('arcade-meta', JSON.stringify(st.meta)); }catch(e){} }

export const UIA = {
  subscribe(fn){ subs.add(fn); return () => subs.delete(fn); },
  get(){ return st; },
  set(patch){ st = { ...st, ...patch }; emit(); },
  enter(id){
    st = { ...st, screen:'game', gameId:id,
      meta:{ ...st.meta, last:{ ...st.meta.last, [id]: Date.now() } } };
    saveMeta(); emit();
  },
  exit(){ st = { ...st, screen:'home', gameId:null }; emit(); },
  /* preload the shared asset pool (both games read from it) */
  start(){
    const g = window.__GAME;
    if(!g){ st = { ...st, ready:true, loading:100 }; emit(); return Promise.resolve(); }
    return g.preloadAssets((d,t)=>{ st = { ...st, loading: Math.round(d/t*100) }; emit(); })
      .then(()=>{ st = { ...st, ready:true, loading:100 }; emit(); });
  }
};
window.__ARCADE = UIA;

export function useArcade(){
  return useSyncExternalStore(UIA.subscribe, UIA.get, UIA.get);
}
export function ghh(){ return window.__GAME; }
export const hideImg = e => { e.currentTarget.style.display = 'none'; };
