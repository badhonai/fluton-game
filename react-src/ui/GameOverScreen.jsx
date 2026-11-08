import { G, hideImg } from '../store.js';

export default function GameOverScreen(){
  const g = G();
  return (
    <div className="screen" id="scr-over">
      <div className="ov-inner">
        <div className="ov-title dead">BUSTED</div>
        <img className="ov-cat" src="assets/character/cat/hurt.png" alt="" onError={hideImg}/>
        <div className="sub2" id="ovMsg">the chain read you like an open book.</div>
        <div className="btnrow">
          <button className="btn primary" id="bRetryO" onClick={() => g.actions.retry()}>RETRY LEVEL</button>
          <button className="btn ghost" id="bOverLevels" onClick={() => g.actions.overLevels()}>LEVELS</button>
          <button className="btn ghost" id="bOverTitle" onClick={() => g.actions.overTitle()}>TITLE</button>
        </div>
      </div>
    </div>
  );
}
