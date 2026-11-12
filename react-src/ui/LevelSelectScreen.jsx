import { G, hideImg } from '../store.js';
import { Icon } from './icons.jsx';

export default function LevelSelectScreen({ st }){
  const g = G();
  return (
    <div className="screen" id="scr-select">
      <div className="kicker">CHOOSE YOUR MARK</div>
      <div className="h1s">LEVELS</div>
      <div className="lvgrid" id="lvGrid" data-v={st.progressV}>
        {g.LEVELS.map((L, i) => {
          const unlocked = i < g.store.data.unlocked;
          const stars = g.store.data.stars[i] || 0;
          return (
            <button key={i}
              className={'lvcard' + (unlocked ? '' : ' lock') + (i === g.Game.levelIdx ? ' cur' : '')}
              onClick={() => unlocked && g.actions.level(i)}>
              <div className="n">LEVEL {i + 1}
                {!unlocked && <Icon name="lock" size={10}/>}
              </div>
              <div className="t">{L.name}</div>
              <div className="st">
                {[0,1,2].map(k => (
                  <img key={k} src="assets/pickups/star.png" alt=""
                       className={k < stars ? 'on' : ''} onError={hideImg}/>
                ))}
              </div>
              <div className="best">{g.store.data.scores[i] ? 'BEST ' + g.store.data.scores[i] : '—'}</div>
            </button>
          );
        })}
      </div>
      <div className="btnrow">
        <button className="btn ghost" id="bSelBack" onClick={() => g.actions.back()}>
          <Icon name="arrow-left" size={13}/> BACK
        </button>
      </div>
    </div>
  );
}
