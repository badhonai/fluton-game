# FLUTON ARCADE — Glass House Heist, Glass Dash & more

A multi-game arcade for Fluton, headlined by **Glass House Heist** (a stealth
platformer starring Fluton's official tuxedo-cat mascot) and **Glass Dash**
(a one-button endless runner). Console-style home screen with game icons;
games are modules with mount/unmount lifecycles over one shared engine.

## Design system (anti-slop rules — enforced by `audit.py`)

- **Mobile-first**: base styles target phones; ≥640px enhances. Safe-area
  insets, ≥44px targets, coarse-pointer adaptations (HUD lifts above touch
  buttons), portrait rotate hint + **fullscreen with auto landscape-lock**.
- **One accent** (cyan), gold = reward, red = danger. Flat surfaces + 1px
  borders. **No** backdrop blur, gradient text, color-mix glows, or
  emoji glyphs — the audit fails the build if these reappear.
- **Icons**: [Lucide](https://lucide.dev) (MIT) stroke icons for all UI
  chrome — one 24px grid, 2px round strokes. Generated PNGs are reserved for
  *game art* (character, items, game icons), never UI chrome.
- **Perf**: world renders only while playing (screens cover the canvas —
  phones never pay fill-rate for hidden frames), cached sky gradients,
  sprite-cached tints/glows, DOM writes skipped when unchanged, 1.5× DPR cap
  on touch devices (from the engine's mobile pass).

## Architecture

```
Arcade shell (React)                Shared engine (src/game.js)
────────────────────                ────────────────────────────
ArcadeApp ── screen router          UI store (snapshots) ← useSyncExternalStore
 HomeScreen ── catalog grid         actions{} API (buttons + QA)
 GameHost ── mounts module          Assets pool (preloaded once)
   ├─ GHHModule ── enter/leave      SFX (one WebAudio system)
   └─ GlassDash ── own loop         storage: ghh-save · arcade-dash-best · arcade-meta
```

- **Fullscreen** (`ui/fullscreen.js`): Fullscreen API + `screen.orientation.lock('landscape')`
  where supported (Android Chrome); auto-hidden where impossible (iOS Safari).
- **Feel values** (research): coyote 0.12s, jump buffer 0.12s, variable jump,
  juice proportionality, ±pitch SFX.

## Structure

```
├── index.html            # arcade mount + viewport + manifest/bundle
├── react-src/
│   ├── index.jsx         # createRoot(ArcadeApp) — skipped under __NO_MOUNT
│   ├── App.jsx           # GHH screen router (hosted inside the arcade)
│   ├── arcade/           # ArcadeApp · HomeScreen · catalog · store · GHHModule
│   ├── ui/               # screens · HUD · icons (Lucide) · fullscreen · Logo
│   └── store.js
├── games/                # GlassDash.jsx + dash/engine.js (pure sim, headless-tested)
├── src/                  # engine · manifest · style.css · app.js (bundle)
├── assets/               # AI art: source sheets + processed frames + arcade icons
├── tools/                # slice_assets · build_react · build · qa/
│   └── qa/               # suites: engine · actions · arcade · smoke · audit
└── dist/                 # standalone.html + index.html (Vercel entry)
```

## Commands

```bash
npm ci                    # react, react-dom, esbuild
npm run build             # esbuild → src/app.js → dist/{standalone,index}.html
npm test                  # audit + engine + actions + arcade + render smoke
```

## Play

- Serve the folder → `/glass-house-heist/` (arcade home with game icons)
- Or open `dist/standalone.html` in any browser
- **Fullscreen**: button in the arcade bar, GHH title, GHH HUD, pause menu, Dash HUD

**Glass House Heist** — A/D · Space jump · hold E/Shift encrypt · Q yarn · Esc pause · F-style button for fullscreen
**Glass Dash** — Space / tap jump (hold for height) · R restart · Esc pause
