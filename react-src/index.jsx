import { createRoot } from 'react-dom/client';
import App from './App.jsx';

/* headless QA sets __NO_MOUNT to drive the engine directly */
if(!window.__NO_MOUNT){
  createRoot(document.getElementById('root')).render(<App/>);
}
