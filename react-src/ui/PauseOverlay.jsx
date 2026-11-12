import { G } from '../store.js';

export default function PauseOverlay({ st }){
  const g = G();
  return (
    <div className="screen" id="scr-pause">
      <div className="pausecard">
        <h2>PAUSED</h2>
        <div className="ctrl-line">
          <kbd>A D</kbd> move · <kbd>SPACE</kbd> jump<br/>
          <kbd>E</kbd>/<kbd>SHIFT</kbd> encrypt · <kbd>Q</kbd> yarn · <kbd>R</kbd> restart
        </div>
        <button className="btn primary" id="bResume" onClick={() => g.actions.resume()}>RESUME</button>
        <button className="btn ghost" id="bRestart" onClick={() => g.actions.restart()}>RESTART LEVEL</button>
        <button className="btn ghost" id="bPauseLevels" onClick={() => g.actions.pauseLevels()}>LEVEL SELECT</button>
        {st.arcade && (
          <button className="btn ghost" id="bPauseArcade"
            onClick={() => g.actions.arcadeExit()}>ARCADE HOME</button>
        )}
        <button className="btn chipbtn" id="bSoundP" onClick={() => g.actions.sound()}>
          ♪ SOUND: {st.muted ? 'OFF' : 'ON'}
        </button>
      </div>
    </div>
  );
}
