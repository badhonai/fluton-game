import { Icon } from './icons.jsx';

export default function RotateHint({ st }){
  if(!(st.portrait && st.screen === 'play')) return null;
  return (
    <div id="rotate" style={{ display: 'flex' }}>
      <Icon name="rotate-ccw" size={44}/>
      ROTATE YOUR DEVICE
      <span className="dim" style={{ fontSize:11, letterSpacing:'.16em' }}>
        the heist runs in landscape
      </span>
    </div>
  );
}
