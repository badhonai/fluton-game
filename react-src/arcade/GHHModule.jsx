import { useEffect } from 'react';
import GHHApp from '../App.jsx';

/* Wraps Glass House Heist as an arcade module: engine session lifecycle
   (boot / active loop / pause-on-exit) tied to React mount/unmount. */
export default function GHHModule({ onExit }){
  useEffect(() => {
    window.__GAME.enterArcade(onExit);
    return () => window.__GAME.leaveArcade();
  }, [onExit]);
  return <GHHApp/>;
}
