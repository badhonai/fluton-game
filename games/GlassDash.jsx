import { useEffect, useRef, useState } from 'react';
import { DashEngine, DASH_BEST_KEY } from './dash/engine.js';
if(typeof window!=='undefined'){ window.__DASH = DashEngine; window.__DASH_KEY = DASH_BEST_KEY; }
import { hideImg } from '../react-src/arcade/store.js';
import { Icon } from '../react-src/ui/icons.jsx';

/* Glass Dash — React host: canvas loop, HUD, pause & results overlays.
   mount/unmount lifecycle = effect cleanup (arcade-safe). */
export default function GlassDash({ onExit }){
  const cvRef = useRef(null);
  const engRef = useRef(null);
  const pausedRef = useRef(false);
  const phaseRef = useRef('run');
  const [phase, setPhase] = useState('run');          /* run | paused | results */
  const [hud, setHud] = useState({ score: 0, notes: 0 });
  const [result, setResult] = useState({ score:0, best:0, notes:0, record:false });

  useEffect(() => {
    const G = window.__GAME;
    const eng = new DashEngine({ sfx: n => { const s = G && G.SFX && G.SFX[n]; if(s) s(); } });
    engRef.current = eng;
    if(G && G.FX) G.FX.clear();

    const cv = cvRef.current;
    const ctx = cv.getContext('2d');
    let raf = 0, last = performance.now(), uiT = 0, hintT = 6, shownResults = false;

    const setPhaseBoth = p => { phaseRef.current = p; setPhase(p); };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth || window.innerWidth;
      const h = cv.clientHeight || window.innerHeight;
      cv.width = Math.max(1, Math.floor(w * dpr));
      cv.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      eng.layout(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    const togglePause = () => {
      if(eng.state !== 'run') return;
      const p = phaseRef.current === 'paused' ? 'run' : 'paused';
      pausedRef.current = (p === 'paused');
      setPhaseBoth(p);
      if(G && G.SFX) G.SFX.click();
    };

    const onKey = e => {
      if(G && G.SFX) G.SFX.resume();
      if(e.code === 'Escape'){ e.preventDefault(); togglePause(); return; }
      if(e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW'){
        e.preventDefault();
        if(phaseRef.current === 'run'){ eng.jump(); hintT = 0; }
      }
      if(e.code === 'KeyR' && phaseRef.current === 'results') restart();
    };
    const onKeyUp = e => {
      if(e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') eng.release();
    };
    const onPointerDown = e => {
      e.preventDefault();
      if(G && G.SFX) G.SFX.resume();
      if(phaseRef.current === 'run'){ eng.jump(); hintT = 0; }
      else if(phaseRef.current === 'results') restart();
    };
    const onVis = () => {
      if(document.hidden && phaseRef.current === 'run'){
        pausedRef.current = true; setPhaseBoth('paused');
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    cv.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('visibilitychange', onVis);

    function restart(){
      eng.reset();
      if(G && G.FX) G.FX.clear();
      shownResults = false;
      pausedRef.current = false;
      setPhaseBoth('run');
      setHud({ score:0, notes:0 });
      hintT = 6;
      if(G && G.SFX) G.SFX.click();
    }

    const loop = ts => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      if(!pausedRef.current) eng.update(dt);

      for(const ev of eng.drain()){
        if(!G) break;
        const sx = ev.x != null ? ev.x - eng.dist : 0;
        const sy = ev.h != null ? eng.groundY - ev.h : eng.groundY;
        if(ev.type === 'jump') G.SFX.jump();
        else if(ev.type === 'land'){ G.SFX.land(); G.FX.dust(eng.W*0.28, eng.groundY, 5); }
        else if(ev.type === 'note'){ G.SFX.note(); G.FX.spark(sx, sy, 7, '#ffd166', 150); G.FX.text(sx, sy - 14, '+10', '#ffd166', .8); }
        else if(ev.type === 'yarn'){ G.SFX.yarn(); G.FX.spark(sx, sy, 9, '#ff7dd6', 170); G.FX.text(sx, sy - 14, '+25', '#ff7dd6', .8); }
        else if(ev.type === 'die'){
          G.SFX.hurt();
          G.FX.spark(eng.W*0.28, eng.groundY - eng.cat.h - 18, 18, '#ff4d6a', 240);
          G.FX.text(eng.W*0.28, eng.groundY - eng.cat.h - 46, 'SHATTERED!', '#ff4d6a', 1.1);
        }
      }
      if(G && G.FX) G.FX.update(pausedRef.current ? 0 : dt);
      eng.draw(ctx, G && G.Assets ? G.Assets : null, G && G.FX ? G.FX : null);

      if(eng.state === 'dead' && eng.deathT > 0.6 && !shownResults){
        shownResults = true;
        setResult({ score: eng.score, best: eng.best, notes: eng.notes, record: eng.record });
        setPhaseBoth('results');
      }
      uiT += dt;
      if(uiT > 0.1){ uiT = 0; setHud({ score: eng.score, notes: eng.notes }); }
      hintT -= dt;
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
      cv.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="dash-root">
      <canvas ref={cvRef} className="dash-cv"></canvas>
      <div className="dash-hud">
        <div className="dash-score"><label>SCORE</label><b>{hud.score}</b></div>
        <div className="dash-notes">
          <img src="assets/pickups/note.png" alt="" onError={hideImg}/>×{hud.notes}
        </div>
        <div className="dash-best"><label>BEST</label>
          <b>{(() => { try{ return localStorage.getItem(DASH_BEST_KEY)||'0'; }catch(e){ return '0'; } })()}</b>
        </div>
        <button className="dash-pause" id="bDashPause" aria-label="Pause"
          onClick={() => { const p = phaseRef.current;
            if(p === 'run'){ pausedRef.current = true; setPhase('paused'); phaseRef.current = 'paused'; }
            else if(p === 'paused'){ pausedRef.current = false; setPhase('run'); phaseRef.current = 'run'; } }}>
          <Icon name="pause" size={15}/>
        </button>
      </div>

      {phase === 'run' && (
        <div className={'dash-hint' + (hud.score > 0 ? ' gone' : '')}>SPACE / TAP — JUMP · hold for higher</div>
      )}

      {phase === 'paused' && (
        <div className="screen dash-overlay" id="scr-dash-pause">
          <div className="pausecard">
            <h2>PAUSED</h2>
            <button className="btn primary" id="bDashResume"
              onClick={() => { pausedRef.current = false; setPhase('run'); phaseRef.current = 'run'; }}>
              <Icon name="play" size={14} fill/> RESUME
            </button>
            <button className="btn ghost" id="bDashHome" onClick={onExit}>
              <Icon name="home" size={14}/> ARCADE HOME
            </button>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div className="screen dash-overlay" id="scr-dash-results">
          <div className="pausecard results-card">
            <div className="kicker">RUN COMPLETE</div>
            <div className="ov-title dead">SHATTERED</div>
            {result.record && <div className="award gold" style={{ animationDelay:'.3s' }}>NEW BEST!</div>}
            <div className="breakdown">
              <div className="brow"><span>SCORE</span><b>{result.score}</b></div>
              <div className="brow"><span>NOTES</span><b>{result.notes}</b></div>
              <div className="brow total"><span>BEST</span><b>{result.best}</b></div>
            </div>
            <button className="btn primary" id="bDashAgain" onClick={() => {
              const eng = engRef.current;
              eng.reset();
              if(window.__GAME && window.__GAME.FX) window.__GAME.FX.clear();
              shownResultsReset();
            }}><Icon name="rotate-ccw" size={14}/> RUN AGAIN</button>
            <button className="btn ghost" id="bDashHome2" onClick={onExit}>
              <Icon name="home" size={14}/> ARCADE HOME
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* restart path used by results button (kept outside the effect closure) */
function shownResultsReset(){
  /* dispatch a synthetic R press handled by the engine loop's key handler */
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' }));
}
