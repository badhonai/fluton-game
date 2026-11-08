/* UI store hook — engine publishes immutable snapshots, React subscribes. */
import { useSyncExternalStore } from 'react';
import '../src/game.js'; /* engine side-effects run first: defines window.__GAME */

export function useUI(){
  const ui = window.__GAME.UI;
  return useSyncExternalStore(ui.subscribe, ui.get, ui.get);
}
export function G(){ return window.__GAME; }
export const hideImg = e => { e.currentTarget.style.display = 'none'; };
