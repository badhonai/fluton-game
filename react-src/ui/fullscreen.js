/* Fullscreen helper — with auto landscape lock where the platform allows it
   (Android Chrome locks orientation inside fullscreen; iOS Safari cannot
   fullscreen non-video elements, so the button hides itself there). */
import { useEffect, useState } from 'react';

export function fsSupported(){
  return !!(typeof document !== 'undefined' &&
    (document.fullscreenEnabled || document.webkitFullscreenEnabled));
}
export function isFullscreen(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
export function toggleFullscreen(){
  if(isFullscreen()){
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if(exit){ const p = exit.call(document); if(p && p.catch) p.catch(()=>{}); }
    return;
  }
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if(!req) return;
  try{
    const p = req.call(el);
    if(p && p.catch) p.catch(()=>{});
  }catch(e){ return; }
  /* auto-rotate into landscape while we own the screen */
  try{
    const o = screen && screen.orientation;
    if(o && o.lock){ const lp = o.lock('landscape'); if(lp && lp.catch) lp.catch(()=>{}); }
  }catch(e){}
}
/* headless QA handle */
if(typeof window !== 'undefined'){
  window.__FS = { toggle: toggleFullscreen, supported: fsSupported, is: isFullscreen };
}

export function useFullscreen(){
  const [on, setOn] = useState(false);
  useEffect(() => {
    const h = () => setOn(isFullscreen());
    document.addEventListener('fullscreenchange', h);
    document.addEventListener('webkitfullscreenchange', h);
    return () => {
      document.removeEventListener('fullscreenchange', h);
      document.removeEventListener('webkitfullscreenchange', h);
    };
  }, []);
  return on;
}
