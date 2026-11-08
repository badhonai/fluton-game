import { G, hideImg } from '../store.js';
import { Logo } from './Logo.jsx';

function ResetButton({ st }){
  const g = G();
  let label = 'RESET PROGRESS', cls = 'btn chipbtn';
  if(st.resetArm){ label = 'CONFIRM?'; cls += ' danger'; }
  else if(st.resetMsg) label = 'PROGRESS RESET';
  return (
    <button className={cls} id="bReset" onClick={() => g.actions.reset()}>{label}</button>
  );
}

export default function TitleScreen({ st }){
  const g = G();
  const stars = Object.values(g.store.data.stars).reduce((a,b)=>a+b, 0);
  return (
    <div className="screen scr-title" id="scr-title">
      <img className="title-bg" src="assets/backgrounds/bg_title.png" alt="" onError={hideImg}/>
      <div className="title-veil"></div>
      <div className="title-inner">
        <div className="kicker">FLUTON PRESENTS</div>
        <div className="logo">
          <Logo className="fmark big"/>
          <div className="logo-text">
            <h1>GLASS HOUSE<span className="line2">HEIST</span></h1>
            <div className="sub">A STEALTH GAME · STARRING THE FLUTON CAT</div>
          </div>
        </div>
        <div className="title-stage">
          <img className="title-cat" src="assets/character/cat/wave.png"
               alt="Fluton cat waving" onError={hideImg}/>
          <div className="title-floor"></div>
        </div>
        <div className="sub2">steal back the encrypted intents · <b>don't get read</b></div>
        <div className="btnrow">
          <button className="btn primary big" id="bPlay" onClick={() => g.actions.play()}>
            <img className="ico" src="assets/ui/play.png" alt="" onError={hideImg}/>PLAY
          </button>
          <button className="btn ghost" id="bLevels" onClick={() => g.actions.levels()}>LEVELS</button>
          <button className="btn ghost" id="bHow" onClick={() => g.actions.how()}>HOW TO PLAY</button>
        </div>
        <div className="settings-row">
          <button className="btn chipbtn" id="bSoundT" onClick={() => g.actions.sound()}>
            ♪ SOUND: {st.muted ? 'OFF' : 'ON'}
          </button>
          <ResetButton st={st}/>
        </div>
        <div className="tiny">
          starring Fluton's tuxedo cat ·{' '}
          <a href="https://fluton.io" target="_blank" rel="noopener">fluton.io</a> — the universal confidentiality engine<br/>
          <span id="tProg">progress: {g.store.data.unlocked}/{g.LEVELS.length} levels · {stars}/15 stars</span>
        </div>
      </div>
    </div>
  );
}
