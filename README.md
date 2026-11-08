# GLASS HOUSE HEIST — a Fluton stealth game

A polished 2D stealth-platformer starring Fluton's official tuxedo-cat mascot.
**React 19 owns the entire UI shell** (screens, HUD, touch controls) while a
headless canvas engine owns the game (physics, simulation, rendering, audio) —
the two communicate through a tiny immutable-snapshot store.

## Architecture

```
React (react-src/)                     Engine (src/game.js)
────────────────────                   ─────────────────────
App + screens  ── render store snapshots ──►  UI store (subscribe/get/set)
HUD (discrete)  ── useSyncExternalStore ──►   updateHUD (diff → store)
HUD bars (60fps)── UI.refs registry ─────►    energy/det/enc writes
Buttons          ── actions API ─────────►    Game.load / pause / next …
Touch controls   ── Input.setTouch ──────►    input flags
```

- **Engine**: fixed-timestep sim, sprite rendering with procedural fallbacks,
  audio (WebAudio SFX), level parser, particles — no DOM assumptions left.
- **React**: every screen as a component; no string-markup HTML in JS except
  engine-authored toast HTML.
- **Perf**: per-frame bars bypass React via a ref registry; React re-renders
  only when discrete HUD values change (~1/s idle).

## Structure

```
glass-house-heist/
├── index.html            # mount point + stylesheet + manifest/bundle scripts
├── react-src/
│   ├── index.jsx         # createRoot (skipped when __NO_MOUNT for QA)
│   ├── App.jsx           # screen router + canvas + overlays
│   ├── store.js          # useSyncExternalStore bridge to engine UI store
│   └── ui/               # Loading, Title, LevelSelect, HowTo, Pause,
│                         # Complete, GameOver, HUD, Toast, Touch, Rotate, Logo
├── src/
│   ├── game.js           # engine (classic script, exposes window.__GAME)
│   ├── manifest.js       # GENERATED — asset paths + sprite anchors
│   ├── style.css         # art direction: palette, screens, HUD, touch
│   └── app.js            # GENERATED — esbuild bundle (React + engine)
├── assets/               # AI-generated art: source sheets + processed frames
├── tools/
│   ├── slice_assets.py   # magenta-key → despill → slice → trim → manifest
│   ├── build_react.py    # esbuild → src/app.js → dist/standalone.html
│   ├── build.py          # inline CSS/JS + data-URI PNGs
│   └── qa/               # headless engine suites + renderToString smoke
└── dist/standalone.html  # self-contained build (works in sandboxed previews)
```

## Commands

```bash
npm install               # react, react-dom, esbuild
npm run build             # bundle + standalone dist
npm test                  # engine suites + render smoke (node, no browser)
```

## Play

- Structured build: serve the folder → `/glass-house-heist/`
- Standalone: open `dist/standalone.html` in any browser

**Controls** — A/D or arrows · Space jump · hold E/Shift encrypt · Q yarn · Esc pause · R restart · M mute
