import { G, hideImg } from '../store.js';

/* HUD renders from the store (discrete values) while the energy/detection
   bars are written imperatively through UI.refs at 60fps — no React churn. */
export default function HUD({ st }){
  const g = G();
  if(!(st.screen === 'play' || st.screen === 'pause')) return null;
  const h = st.hud || { level: '', notes: '0/0', lives: 3, score: 0, time: '0:00', yarn: 0 };
  const hearts = g.Assets.has('ui_heart')
    ? Array.from({ length: g.CFG.LIVES }, (_, i) => (
        <img key={i} src="assets/ui/heart.png" alt="life"
             className={i < h.lives ? '' : 'off'} onError={hideImg}/>
      ))
    : '♥'.repeat(h.lives) + '♡'.repeat(g.CFG.LIVES - h.lives);
  return (
    <div id="hud">
      <div className="hud-tl">
        <span className="chip" id="hLevel">{h.level}</span>
        <span className="chip notes">
          <img className="ico" src="assets/pickups/note.png" alt="" onError={hideImg}/>
          <span id="hNotes">{h.notes}</span>
        </span>
      </div>
      <div className="hud-tc">
        <div id="detLabel">DETECTION</div>
        <div id="detBox" ref={n => { g.UI.refs.detBox = n; }}>
          <div id="detBar" ref={n => { g.UI.refs.detBar = n; }}></div>
        </div>
      </div>
      <div className="hud-tr">
        <span id="hTime">{h.time}</span>
        <span id="hLives">{hearts}</span>
        <span id="hScore">{h.score}</span>
        <button id="btnPause" aria-label="Pause" onClick={() => g.actions.pause()}>
          <img className="ico" src="assets/ui/pause.png" alt="pause" onError={hideImg}/>
        </button>
      </div>
      <div className="hud-bl">
        <div id="engWrap" ref={n => { g.UI.refs.engWrap = n; }}>
          <label>ENERGY</label>
          <div id="engBarBox"><div id="engBar" ref={n => { g.UI.refs.engBar = n; }}></div></div>
        </div>
        <div id="hYarn" className={h.yarn <= 0 ? 'empty' : ''}>
          <img className="ico" src="assets/pickups/yarn.png" alt="" onError={hideImg}/>
          <span id="hYarnN">×{h.yarn}</span>
        </div>
      </div>
      <div id="hEnc" ref={n => { g.UI.refs.hEnc = n; }}>◆ ENCRYPTED</div>
    </div>
  );
}
