# FLUTON ARCADE — Glass House Heist, Glass Dash & more

A multi-game arcade for Fluton, headlined by **Glass House Heist** (a stealth
platformer starring Fluton's official tuxedo-cat mascot) and **Glass Dash**
(a one-button endless runner). A console-style home screen shows game icons;
games are modules with mount/unmount lifecycles over one shared engine.

## Architecture

```
Arcade shell (React)                Shared engine (src/game.js)
────────────────────                ────────────────────────────
ArcadeApp ── screen router
 HomeScreen ── catalog.json grid    UI store (snapshots) ◄── useSyncExternalStore
 GameHost   ── mounts module        actions{} API (buttons + QA)
   ├─ GHHModule ── enterArcade/      Assets pool (preloaded once, both games)
   │   leaveArcade → engine session  SFX (one WebAudio system, gesture-unlocked)
   └─ GlassDash ── own canvas loop   per-game storage: ghh-save · arcade-dash-best
```

- **Module registry** (`react-src/arcade/catalog.js`) — one catalog powers the
  home grid, score lines, and which component mounts. Adding a game = one entry.
- **Lifecycle** — `enterArcade/leaveArcade` park the engine loop when a game is
  unmounted; `boot()` is idempotent and rebinds the canvas on each mount.
- **Shared asset pool** — arcade preloads all art behind its loading screen;
  both games read the same sprites/backgrounds/particles.
- **Namespaced storage** — `ghh-save`, `arcade-dash-best`, `arcade-meta`.
- **Feel values from research** — coyote 0.12s, jump buffer 0.12s, variable
  jump height, juice proportionality, ±pitch SFX.

## Structure

```
├── index.html            # arcade mount + stylesheet + manifest/bundle
├── react-src/
│   ├── index.jsx         # createRoot(ArcadeApp) — skipped under __NO_MOUNT
│   ├── App.jsx           # GHH screen router (hosted inside the arcade)
│   ├── arcade/           # ArcadeApp · HomeScreen · catalog · store · GHHModule
│   ├── ui/               # GHH screens, HUD, touch, Logo
│   └── store.js          # GHH store bridge
├── games/
│   ├── GlassDash.jsx     # React host: canvas, HUD, pause, results
│   └── dash/engine.js    # pure sim + draw (headless-testable)
├── src/                  # engine · manifest · style · app.js (bundle)
├── assets/               # AI art: source sheets + processed frames + arcade icons
├── tools/                # slice_assets · build_react · build · qa/
└── dist/standalone.html  # self-contained arcade (works in sandboxed previews)
```

## Commands

```bash
npm ci                    # react, react-dom, esbuild
npm run build             # esbuild → src/app.js → dist/standalone.html
npm test                  # 4 suites: engine · actions · arcade · render smoke
```

## QA (all headless, no browser needed)

- **Engine suite** — full GHH regression: movement, encryption, alarms, bots,
  yarn, movers, victory, 5-level soak, perf budget.
- **Actions suite** — every handler throw-free.
- **Arcade suite** — preload, catalog, enter/exit/re-enter lifecycle, engine
  parking, Glass Dash sim (jump/coyote/gates/death/best persistence), storage.
- **Render smoke** — `renderToString` across every screen of both games.

## Play

- Serve the folder → `/glass-house-heist/` (arcade home with game icons)
- Or open `dist/standalone.html` in any browser

**Glass House Heist** — A/D · Space jump · hold E/Shift encrypt · Q yarn · Esc pause
**Glass Dash** — Space / tap jump (hold for height) · R restart · Esc pause
