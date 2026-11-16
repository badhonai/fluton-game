import { Icon } from './icons.jsx';
import { fsSupported, useFullscreen, toggleFullscreen } from './fullscreen.js';

export default function FullscreenBtn({ label = true, className = 'btn chipbtn' }){
  const on = useFullscreen();
  if(!fsSupported()) return null;
  return (
    <button className={className} id="bFs"
      onClick={() => toggleFullscreen()}
      aria-label={on ? 'Exit fullscreen' : 'Enter fullscreen'}>
      <Icon name={on ? 'minimize' : 'maximize'} size={14}/>
      {label && (on ? 'EXIT FULLSCREEN' : 'FULLSCREEN')}
    </button>
  );
}
