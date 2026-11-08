# GLASS HOUSE HEIST — a Fluton stealth game

A polished 2D stealth-platformer starring Fluton's official tuxedo-cat mascot.
Built like a small-studio release: generated art assets, layered art direction,
full game shell, and a verified QA pipeline.

## Structure

```
glass-house-heist/
├── index.html            # markup + screen structure (links src/)
├── src/
│   ├── style.css         # art direction: palette, screens, HUD, touch
│   ├── manifest.js       # GENERATED — asset paths + sprite anchors
│   └── game.js           # engine: sim, render, audio, UI, states
├── assets/
│   ├── source/           # original AI-generated sheets (pre-processing)
│   ├── backgrounds/      # bg_title, bg_far (parallax), bg_mid (alpha-faded)
│   ├── character/cat/    # 12 keyed frames: idle, run×3, jump, fall, land…
│   ├── enemies/          # turret ±alert, drone, bot patrol/chase/distract
│   ├── pickups/          # intent note, energy cell, yarn, star
│   ├── props/            # environment set dressing
│   ├── ui/               # icon set
│   ├── fx/               # particle sprites
│   ├── env/              # platform edge strip + seamless face texture, vault
│   └── manifest.json     # machine-readable copy of src/manifest.js
├── tools/
│   ├── slice_assets.py   # pipeline: magenta-key → despill → slice → trim → manifest
│   └── build.py          # → dist/standalone.html (all inlined, data-URI PNGs)
└── dist/standalone.html  # self-contained build for sandboxed previews
```

## Pipeline

1. `python3 tools/slice_assets.py` — processes `assets/source/*.png` into
   per-frame transparent PNGs + regenerates `src/manifest.js`.
2. `python3 tools/build.py` — emits `dist/standalone.html`.

## Play

- Structured build: serve the folder (`python3 -m http.server`) → `/glass-house-heist/`
- Standalone: open `dist/standalone.html` in any browser.

**Controls** — A/D or arrows · Space jump · hold E/Shift encrypt · Q yarn · Esc pause · R restart · M mute
