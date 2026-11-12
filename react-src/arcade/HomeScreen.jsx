import { useState } from 'react';
import { UIA, ghh, hideImg } from './store.js';
import { GAMES } from './catalog.js';
import { Logo } from '../ui/Logo.jsx';

function totalStars(){
  try{ return Object.values(ghh().store.data.stars).reduce((a,b)=>a+b,0); }
  catch(e){ return 0; }
}

function scoreLine(g, st){
  if(g.status === 'soon') return 'LOCKED';
  if(g.id === 'ghh') return totalStars() + ' / 15 STARS';
  try{
    const best = parseInt(localStorage.getItem('arcade-dash-best') || '0', 10) || 0;
    return best > 0 ? 'BEST ' + best : 'NO RUN YET';
  }catch(e){ return '—'; }
}

function GameCard({ g, st, onPlay }){
  const soon = g.status === 'soon';
  const last = (st.meta.last || {})[g.id];
  return (
    <button className={'game-card' + (soon ? ' soon' : '')}
            style={{ '--accent': g.accent }}
            disabled={soon}
            onClick={() => !soon && onPlay(g.id)}>
      <div className="card-art">
        <img src={g.icon} alt="" onError={hideImg}/>
        {soon && <div className="card-lock">🔒 SOON</div>}
        {!soon && last && <div className="card-badge">RECENT</div>}
      </div>
      <div className="card-title">{g.title}</div>
      <div className="card-tag">{g.tag}</div>
      <div className="card-score">{scoreLine(g, st)}</div>
    </button>
  );
}

export default function HomeScreen({ st }){
  const g = ghh();
  const [muted, setMuted] = useState(() => g.SFX.isMuted());
  const featured = GAMES.find(x => x.status === 'playable' &&
    (st.meta.last || {})[x.id] && (st.meta.last[x.id] > 0)) || GAMES[0];
  const play = id => { g.SFX.resume(); g.SFX.click(); UIA.enter(id); };
  const toggleMute = () => { g.toggleSound(); setMuted(g.SFX.isMuted()); };
  const others = GAMES.filter(x => x.id !== featured.id);

  return (
    <div className="screen home-screen" id="scr-home">
      <header className="arcade-bar">
        <div className="arcade-brand"><Logo className="fmark"/><span>FLUTON ARCADE</span></div>
        <div className="arcade-bar-right">
          <span className="arcade-chip">★ {totalStars()} / 15</span>
          <button className="btn chipbtn" id="bSoundA" onClick={toggleMute}>
            ♪ SOUND: {muted ? 'OFF' : 'ON'}
          </button>
        </div>
      </header>

      <div className="arcade-scroll">
        <section className="featured" style={{ '--accent': featured.accent }}
                 onClick={() => play(featured.id)}>
          <img className="featured-bg" src={featured.cover || featured.icon} alt="" onError={hideImg}/>
          <div className="featured-veil"></div>
          <div className="featured-body">
            <div className="kicker">{(st.meta.last || {})[featured.id] ? 'CONTINUE' : 'FEATURED'}</div>
            <h2>{featured.title}</h2>
            <p>{featured.blurb}</p>
            <span className="btn primary" id="bFeaturedPlay">▶ PLAY</span>
          </div>
          <img className="featured-icon" src={featured.icon} alt="" onError={hideImg}/>
        </section>

        <div className="shelf-label">ALL GAMES</div>
        <section className="game-grid">
          {others.map(g2 => (
            <GameCard key={g2.id} g={g2} st={st} onPlay={play}/>
          ))}
        </section>

        <footer className="arcade-foot">
          a FLUTON project · every game shares one engine, one QA harness, one cat —
          <a href="https://fluton.io" target="_blank" rel="noopener"> fluton.io</a>
        </footer>
      </div>
    </div>
  );
}
