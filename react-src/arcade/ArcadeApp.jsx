import { useArcade, UIA } from './store.js';
import HomeScreen from './HomeScreen.jsx';
import { gameById } from './catalog.js';
import { Logo } from '../ui/Logo.jsx';

function ArcadeLoading({ st }){
  return (
    <div className="screen scr-loading" id="arcade-loading">
      <div className="load-mark"><Logo className="fmark spin"/></div>
      <div className="load-title">FLUTON ARCADE</div>
      <div className="load-track"><div id="loadBar" style={{ width: st.loading + '%' }}/></div>
      <div className="load-row">
        <span id="loadPct">{st.loading}%</span>
        <span className="load-hint">loading the arcade…</span>
      </div>
    </div>
  );
}

export default function ArcadeApp(){
  const st = useArcade();
  if(!st.ready) return <ArcadeLoading st={st}/>;
  if(st.screen === 'game'){
    const g = gameById(st.gameId);
    if(g && g.Component){
      return (
        <div className="arcade-host" key={g.id}>
          <g.Component onExit={() => UIA.exit()}/>
        </div>
      );
    }
  }
  return <HomeScreen st={st}/>;
}
