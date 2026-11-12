import { G } from '../store.js';
import { Icon } from './icons.jsx';
import FullscreenBtn from './FullscreenBtn.jsx';

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
        <button className="btn primary" id="bResume" onClick={() => g.actions.resume()}>
          <Icon name="play" size={14} fill/> RESUME
        </button>
        <button className="btn ghost" id="bRestart" onClick={() => g.actions.restart()}>
          <Icon name="rotate-ccw" size={14}/> RESTART LEVEL
        </button>
        <button className="btn ghost" id="bPauseLevels" onClick={() => g.actions.pauseLevels()}>
          <Icon name="layout-grid" size={14}/> LEVEL SELECT
        </button>
        {st.arcade && (
          <button className="btn ghost" id="bPauseArcade"
            onClick={() => g.actions.arcadeExit()}>
            <Icon name="home" size={14}/> ARCADE HOME
          </button>
        )}
        <div className="settings-row">
          <button className="btn chipbtn" id="bSoundP" onClick={() => g.actions.sound()}>
            <Icon name={st.muted ? 'volume-x' : 'volume-2'} size={13}/>
            SOUND: {st.muted ? 'OFF' : 'ON'}
          </button>
          <FullscreenBtn/>
        </div>
      </div>
    </div>
  );
}
