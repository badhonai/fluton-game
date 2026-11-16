import { useEffect } from 'react';
import { useUI } from './store.js';
import HUD from './ui/HUD.jsx';
import LoadingScreen from './ui/LoadingScreen.jsx';
import TitleScreen from './ui/TitleScreen.jsx';
import LevelSelectScreen from './ui/LevelSelectScreen.jsx';
import HowToScreen from './ui/HowToScreen.jsx';
import PauseOverlay from './ui/PauseOverlay.jsx';
import CompleteScreen from './ui/CompleteScreen.jsx';
import GameOverScreen from './ui/GameOverScreen.jsx';
import Toast from './ui/Toast.jsx';
import TouchControls from './ui/TouchControls.jsx';
import RotateHint from './ui/RotateHint.jsx';

export default function App(){
  const st = useUI();
  useEffect(()=>{ window.__GAME.boot(); }, []);
  return (
    <div id="stage">
      <canvas id="cv"></canvas>
      <HUD st={st}/>
      {st.screen === 'loading' && <LoadingScreen st={st}/>}
      {st.screen === 'title'    && <TitleScreen st={st}/>}
      {st.screen === 'select'   && <LevelSelectScreen st={st}/>}
      {st.screen === 'how'      && <HowToScreen st={st}/>}
      {st.screen === 'pause'    && <PauseOverlay st={st}/>}
      {st.screen === 'complete' && <CompleteScreen st={st}/>}
      {st.screen === 'over'     && <GameOverScreen st={st}/>}
      <Toast st={st}/>
      <TouchControls st={st}/>
      <RotateHint st={st}/>
    </div>
  );
}
