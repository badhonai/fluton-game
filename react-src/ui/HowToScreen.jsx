import { G } from '../store.js';
import { Icon } from './icons.jsx';

export default function HowToScreen(){
  const g = G();
  return (
    <div className="screen" id="scr-how">
      <div className="kicker">BRIEFING</div>
      <div className="h1s">HOW TO PLAY</div>
      <div className="howgrid">
        <div className="hcard"><h3><Icon name="move" size={14}/> MOVE &amp; JUMP</h3>
          <p>Collect every <b>intent note</b>, reach the <b>vault exit</b>. Fall into the void and you lose a life.</p>
          <div className="keys"><span className="kbd">A D / ← →</span><span className="kbd">W / SPACE · jump</span></div>
        </div>
        <div className="hcard"><h3><Icon name="shield" size={14}/> ENCRYPT — hold</h3>
          <p><span className="pu">Encryption</span> turns you into a ghost: cameras, bots and lasers
             <b> can't read or touch you</b>. It drains <span className="yl">ENERGY</span>. Notes need you
             <b> in plaintext</b> — drop the shield to read them.</p>
          <div className="keys"><span className="kbd">E / SHIFT · hold</span></div>
        </div>
        <div className="hcard"><h3><Icon name="eye" size={14}/> AVOID RED CONES</h3>
          <p><span className="rd">Validators</span> sweep searchlights. Stand plaintext inside one and the
             <b> detection meter</b> fills — a full meter means alarm, and alarms cost lives.</p>
        </div>
        <div className="hcard"><h3><Icon name="yarn" size={14}/> YARN DISTRACTION</h3>
          <p>Throw <span className="pu">yarn</span> to yank a patrolling <span className="rd">MEV bot</span> off
             its route — even mid-chase. It only works while they can see the toy.</p>
          <div className="keys"><span className="kbd">Q · throw</span></div>
        </div>
      </div>
      <div className="btnrow">
        <button className="btn ghost" id="bHowBack" onClick={() => g.actions.back()}>
          <Icon name="arrow-left" size={13}/> BACK
        </button>
      </div>
    </div>
  );
}
