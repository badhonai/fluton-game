import { G } from '../store.js';
import { Icon } from './icons.jsx';
import * as Accordion from '@radix-ui/react-accordion';

const LESSONS = [
  { v: 'move', icon: 'move', title: 'MOVE & JUMP',
    body: <p>Collect every <b>intent note</b>, reach the <b>vault exit</b>. Fall into the void and you lose a life.</p>,
    keys: <div className="keys"><span className="kbd">A D / ← →</span><span className="kbd">W / SPACE · jump</span></div> },
  { v: 'enc', icon: 'shield', title: 'ENCRYPT — hold',
    body: <p><span className="pu">Encryption</span> turns you into a ghost: cameras, bots and lasers
      <b> can't read or touch you</b>. It drains <span className="yl">ENERGY</span>. Notes need you
      <b> in plaintext</b> — drop the shield to read them.</p>,
    keys: <div className="keys"><span className="kbd">E / SHIFT · hold</span></div> },
  { v: 'cone', icon: 'eye', title: 'AVOID RED CONES',
    body: <p><span className="rd">Validators</span> sweep searchlights. Stand plaintext inside one and the
      <b> detection meter</b> fills — a full meter means alarm, and alarms cost lives.</p>,
    keys: null },
  { v: 'yarn', icon: 'yarn', title: 'YARN DISTRACTION',
    body: <p>Throw <span className="pu">yarn</span> to yank a patrolling <span className="rd">MEV bot</span> off
      its route — even mid-chase. It only works while they can see the toy.</p>,
    keys: <div className="keys"><span className="kbd">Q · throw</span></div> }
];

/* Briefing = Radix Accordion (one section open at a time) — everything fits
   on screen without scrolling, on any phone. */
export default function HowToScreen(){
  const g = G();
  return (
    <div className="screen" id="scr-how">
      <div className="kicker">BRIEFING</div>
      <div className="h1s">HOW TO PLAY</div>
      <div className="acc-wrap">
        <Accordion.Root type="single" defaultValue="move" collapsible className="acc">
          {LESSONS.map(L => (
            <Accordion.Item key={L.v} value={L.v} className="acc-item">
              <Accordion.Header className="acc-header">
                <Accordion.Trigger className="acc-trigger">
                  <Icon name={L.icon} size={15}/>
                  <span>{L.title}</span>
                  <Icon name="chevron-right" size={14} className="acc-chev"/>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="acc-content">
                {L.body}{L.keys}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
      <div className="btnrow">
        <button className="btn ghost" id="bHowBack" onClick={() => g.actions.back()}>
          <Icon name="arrow-left" size={13}/> BACK
        </button>
      </div>
    </div>
  );
}
