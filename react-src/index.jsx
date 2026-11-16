import { createRoot } from 'react-dom/client';
import ArcadeApp from './arcade/ArcadeApp.jsx';
import { UIA } from './arcade/store.js';

/* headless QA sets __NO_MOUNT to drive stores/engines directly */
if(!window.__NO_MOUNT){
  createRoot(document.getElementById('root')).render(<ArcadeApp/>);
  UIA.start(); /* preload the shared asset pool behind the loading screen */
}
