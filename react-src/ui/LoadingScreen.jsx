import { Logo } from './Logo.jsx';

export default function LoadingScreen({ st }){
  return (
    <div className="screen scr-loading" id="scr-loading">
      <div className="load-mark"><Logo className="fmark spin"/></div>
      <div className="load-title">GLASS HOUSE HEIST</div>
      <div className="load-track"><div id="loadBar" style={{ width: st.loading + '%' }}/></div>
      <div className="load-row">
        <span id="loadPct">{st.loading}%</span>
        <span className="load-hint">loading heist assets…</span>
      </div>
    </div>
  );
}
