import { useEffect, useState } from 'react';
import { G, hideImg } from '../store.js';

export default function CompleteScreen(){
  const g = G();
  const r = g.Game.result || { rows: [], awards: [], stars: 0, total: 0 };
  const [on, setOn] = useState(0);
  const [shown, setShown] = useState(0);

  /* stars pop in sequence (engine schedules the SFX) */
  useEffect(() => {
    const ids = [];
    for(let i = 0; i < r.stars; i++)
      ids.push(setTimeout(() => setOn(o => o + 1), 350 + i * 380));
    return () => ids.forEach(clearTimeout);
  }, []);

  /* eased score count-up */
  useEffect(() => {
    const total = r.total || 0;
    const t0 = performance.now();
    let raf;
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 700);
      setShown(Math.round(total * (1 - Math.pow(1 - k, 3))));
      if(k < 1) raf = requestAnimationFrame(tick); else setShown(total);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [r.total]);

  return (
    <div className="screen" id="scr-complete">
      <div className="ov-inner">
        <div className="kicker" id="cKicker">{r.kicker}</div>
        <div className="ov-title win" id="cTitle">{r.title}</div>
        <img className="ov-cat win-cat" src="assets/character/cat/win.png" alt="" onError={hideImg}/>
        <div className="stars" id="cStars">
          {[0,1,2].map(i => (
            <span key={i} className={'star' + (i < on ? ' on' : '')}>
              <img src="assets/pickups/star.png" alt="star" onError={hideImg}/>
            </span>
          ))}
        </div>
        <div className="awards" id="cAwards">
          {r.awards.map((a, i) => (
            <div key={i} className={'award ' + a.cls} style={{ animationDelay: (0.55 + i * 0.15) + 's' }}>
              <img src={a.src} alt="" onError={hideImg}/><span>{a.label}</span>
            </div>
          ))}
        </div>
        <div className="breakdown" id="cBreak">
          {r.rows.map((row, i) => (
            <div key={i} className="brow"><span>{row[0]}</span><b>+{row[1]}</b></div>
          ))}
          <div className="brow total"><span>TOTAL</span><b id="cTotal">{shown}</b></div>
        </div>
        <div className="leak">VALIDATORS SAW: 0 BYTES</div>
        <div className="btnrow">
          <button className="btn primary" id="bNext" onClick={() => g.actions.next()}>{r.nextLabel}</button>
          <button className="btn ghost" id="bRetryC" onClick={() => g.actions.retry()}>RETRY</button>
          <button className="btn ghost" id="bCompLevels" onClick={() => g.actions.pauseLevels()}>LEVELS</button>
        </div>
      </div>
    </div>
  );
}
