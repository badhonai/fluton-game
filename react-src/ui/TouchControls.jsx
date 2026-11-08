import { useState } from 'react';
import { G } from '../store.js';

function TouchButton({ id, act, label, cls }){
  const [held, setHeld] = useState(false);
  const down = e => { e.preventDefault(); G().Input.setTouch(act, true); setHeld(true); };
  const up   = e => { e.preventDefault(); G().Input.setTouch(act, false); setHeld(false); };
  return (
    <button id={id} className={cls + (held ? ' held' : '')}
      onPointerDown={down} onPointerUp={up}
      onPointerCancel={up} onPointerLeave={up}
      onContextMenu={e => e.preventDefault()}>
      {label}
    </button>
  );
}

export default function TouchControls({ st }){
  if(!(st.coarse && st.screen === 'play')) return null;
  return (
    <div id="touch">
      <TouchButton id="tLeft"  act="left"  label="◀"       cls="tbtn"/>
      <TouchButton id="tRight" act="right" label="▶"       cls="tbtn"/>
      <TouchButton id="tJump"  act="jump"  label="JUMP"    cls="tbtn"/>
      <TouchButton id="tEnc"   act="enc"   label="ENCRYPT" cls="tbtn small"/>
      <TouchButton id="tYarn"  act="yarn"  label="YARN"    cls="tbtn small"/>
    </div>
  );
}
