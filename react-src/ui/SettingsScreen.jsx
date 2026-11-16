import { useState } from 'react';
import { G } from '../store.js';
import { Icon } from './icons.jsx';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';

/* Settings lives on its OWN page (no scrolling) — sliders + switches from
   Radix (the shadcn foundation), styled by the clay design tokens. */
export default function SettingsScreen(){
  const g = G();
  const s = g.Settings;
  const d = s.data;
  const [vol, setVol] = useState(Math.round(d.volume * 100));
  const [quality, setQuality] = useState(d.quality);
  const [reduced, setReduced] = useState(!!d.reduced);
  const [soundOn, setSoundOn] = useState(!g.SFX.isMuted());

  return (
    <div className="screen" id="scr-settings">
      <div className="kicker">SYSTEM</div>
      <div className="h1s">SETTINGS</div>

      <div className="settings-panel">
        <div className="set-row">
          <div className="set-label">
            <Icon name="volume-2" size={16}/> SOUND
            <span className="set-hint">music &amp; effects</span>
          </div>
          <Switch.Root className="sw" checked={soundOn}
            onCheckedChange={v => { setSoundOn(v); g.toggleSound(); }}>
            <Switch.Thumb className="sw-thumb"/>
          </Switch.Root>
        </div>

        <div className="set-row">
          <div className="set-label">
            <Icon name="volume-2" size={16}/> VOLUME
            <span className="set-hint">{vol}%</span>
          </div>
          <Slider.Root className="rad-slider" value={[vol]} min={0} max={100} step={5}
            onValueChange={v => setVol(v[0])}
            onValueCommit={v => s.set({ volume: v[0] / 100 })}>
            <Slider.Track className="rad-track"><Slider.Range className="rad-range"/></Slider.Track>
            <Slider.Thumb className="rad-thumb" aria-label="Volume"/>
          </Slider.Root>
        </div>

        <div className="set-row">
          <div className="set-label">
            <Icon name="maximize" size={16}/> RENDER QUALITY
            <span className="set-hint">{quality === 1 ? 'FAST (recommended)' : 'CRISP (2× pixels)'}</span>
          </div>
          <Slider.Root className="rad-slider" value={[quality]} min={1} max={2} step={1}
            onValueChange={v => setQuality(v[0])}
            onValueCommit={v => s.set({ quality: v[0] })}>
            <Slider.Track className="rad-track"><Slider.Range className="rad-range"/></Slider.Track>
            <Slider.Thumb className="rad-thumb" aria-label="Render quality"/>
          </Slider.Root>
        </div>

        <div className="set-row">
          <div className="set-label">
            <Icon name="shield" size={16}/> REDUCED MOTION
            <span className="set-hint">no screen shake or flashing</span>
          </div>
          <Switch.Root className="sw" checked={reduced}
            onCheckedChange={v => { setReduced(v); s.set({ reduced: v }); }}>
            <Switch.Thumb className="sw-thumb"/>
          </Switch.Root>
        </div>
      </div>

      <div className="btnrow">
        <button className="btn ghost" id="bSettingsBack" onClick={() => g.actions.back()}>
          <Icon name="arrow-left" size={13}/> BACK
        </button>
      </div>
    </div>
  );
}
