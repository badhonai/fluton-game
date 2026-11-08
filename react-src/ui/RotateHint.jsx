export default function RotateHint({ st }){
  if(!(st.portrait && st.screen === 'play')) return null;
  return (
    <div id="rotate" style={{ display: 'flex' }}>
      ↻<br/><br/>ROTATE YOUR DEVICE<br/>
      <span className="dim">the heist runs in landscape</span>
    </div>
  );
}
