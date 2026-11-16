/* The game catalog — the single source of truth for the arcade home grid. */
import GHHModule from './GHHModule.jsx';
import GlassDash from '../../games/GlassDash.jsx';

export const GAMES = [
  {
    id: 'ghh',
    title: 'GLASS HOUSE HEIST',
    tag: 'STEALTH PLATFORMER',
    blurb: 'Steal back the encrypted intents. Outfox validators, MEV bots and laser grids — in plaintext when you must, encrypted when you can.',
    icon: 'assets/arcade/ghh-icon.png',
    cover: 'assets/backgrounds/bg_title.png',
    accent: '#3df5e0',
    status: 'playable',
    scoreLabel: 'STARS',
    Component: GHHModule
  },
  {
    id: 'dash',
    title: 'GLASS DASH',
    tag: 'ENDLESS RUNNER · ONE BUTTON',
    blurb: 'One button. Infinite glass. How far can Fluton run before the vault catches up?',
    icon: 'assets/arcade/dash-icon.png',
    accent: '#b07cff',
    status: 'playable',
    scoreLabel: 'BEST',
    Component: GlassDash
  },
  {
    id: 'cubes',
    title: 'PRISM CUBES',
    tag: 'PUZZLE · SOON',
    blurb: 'Refract the beam through stacking glass.',
    icon: 'assets/arcade/soon-puzzle.png',
    accent: '#ffd166',
    status: 'soon'
  },
  {
    id: 'aegis',
    title: 'NULL AEGIS',
    tag: 'ARENA · SOON',
    blurb: 'Hold the shield. Hide the signal.',
    icon: 'assets/arcade/soon-shield.png',
    accent: '#ff7dd6',
    status: 'soon'
  }
];

export function gameById(id){ return GAMES.find(g => g.id === id) || null; }
if(typeof window!=='undefined') window.__GAMES = GAMES;
