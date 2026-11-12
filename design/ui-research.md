# GAME UI RESEARCH — examples, principles, and style directions
*Phase 1 of the rebuild: UI design first. Compiled from design literature, UI databases, and best-in-class case studies.*

---

## PART 1 — THE BEST GAME UIs (what to steal, and why)

### Tier A — the canon (universally cited)
| Game | What it does | The lesson for us |
|---|---|---|
| **Dead Space (2008)** | Fully **diegetic**: health = spine light bar, ammo on the weapon, menus = holograms from Isaac's chest, game never pauses | Put the most urgent info **on the character**. Our cat could carry energy/encryption state visibly (glow when encrypted!) |
| **Persona 5** | Most-referenced UI of the decade: red/black/white, off-kilter animated compositions, every transition has personality — "UI is brand, not plumbing" | A menu can BE the game's identity. Motion + one violent color decision beats decoration |
| **Hades (2020)** | Menus as lively as gameplay; instant, sharp feedback; color+symbol teach without text; personality in every screen | Feedback timing: every selection must answer back within a frame or two |
| **Celeste** | Flat non-pixel UI for a pixel-ish platformer; ultra-minimal HUD (only what's needed); feedback particles/sounds on every collect/death; postcard loading tips | **The closest genre match to ours** — flat + minimal + feedback-first |
| **Dead Cells** | Pixel UI done readable: strong silhouettes, high contrast, minimal in-play HUD (corners only), generous grids in menus | Corner-only HUD during play; menu density lives OUT of gameplay |
| **Hollow Knight** | Atmospheric minimalism — subtle health/soul meters that blend with art; clarity without breaking mood | Meters can be quiet and still readable via shape+motion |
| **Metroid Prime / Alien: Isolation** | Helmet/scanline interfaces — the HUD is a physical object you look through | Diegetic framing devices (a "vault terminal" bezel around our HUD?) |
| **Cuphead** | Every HUD element in the same 1930s language — total consistency | One style bible; no element may look borrowed |
| **God of War (2018)** | Context-sensitive: health only in combat, prompts only near interactables | Our "earn every pixel" rule: contextual fade for detection/yarn/energy |
| **Monument Valley / Journey** | Near-zero UI; the world teaches | Aspiration for quiet moments (title, results) |
| **Cuphead · Kingdom Hearts · Hearthstone** | Consistency, shape language, drag feedback | Predictable shapes = zero re-learning |

### Tier B — pattern libraries
- **Game UI Database** (gameuidatabase.com — 60,000+ screens) & **Interface.InGame** — the professional reference libraries; Celeste/Hades/Dead Space pages are the relevant starting points.
- **Mobile best practice** (Clash Royale, Subway Surfers, Monument Valley): large touch targets, minimal text, color-coded feedback, read at a glance, progressive disclosure — the HUD must survive a5-inch screen in sunlight.

### Community-verdict favorites (r/Games, ResetEra, r/truegaming threads)
Dead Space (near-unanimous #1), Persona 5, Metroid Prime helmet, Wipeout/N++ menus, TF2's "unobtrusive vintage" HUD, Half-Life 2's ambient level-shot menus, RDR's returning-landscape title screen, Goldeneye's watch menu.

---

## PART 2 — THE PRINCIPLES (distilled from the research)

1. **Diegetic whenever possible** — attach state to the world/character (Dead Space spine, Metroid helmet). Our encryption state, energy and alarm are naturally *world-readable*.
2. **Contextual HUD (earn every pixel)** — show information only when actionable (God of War, fading-HUD shooters). Detection meter appears *when detection exists*; yarn chip fades when empty.
3. **Read in 200ms, peripherally** — urgency hierarchy; shape over text; stable positions (never move resting anchors); shadow/scrim so it survives busy scenes.
4. **Feedback is the product** — every input answers back (Hades): hover, press, selection sound, micro-animation. UI motion = personality (Persona 5), but proportionate (research juice tiers).
5. **Consistency = brand** — one shape language, one type system, one icon set; total style adherence (Cuphead). UI is the game's voice (Persona 5 proved "UI is brand").
6. **Learn without text** — color/symbol/position teach (Hades); signposting over instructions (Journey, our level-design research agrees).
7. **Quiet when idle, loud when it matters** — restraint (Hollow Knight/Monument Valley) punctuated by decisive moments (alarm states).
8. **Accessibility is core** — contrast ≥4.5:1, reduced-motion/shake options, scalable text, never color-only signals.
9. **Mobile-first ergonomics** — ≥44px targets, thumb-zone placement for touch, safe-areas, landscape-first gameplay with portrait guidance.
10. **Performance is a design value** — no full-screen blurs, no per-frame gradient churn; a UI that drops frames is a bad UI (ties to previous audit rules).

---

## PART 3 — PLATFORMER-SPECIFIC HUD PATTERNS (our genre)

1. **Minimalist HUD** — icons/colors/sounds instead of numbers (platformers run fast; corner-only like Dead Cells).
2. **Contextual UI** — prompts only when relevant (God of War); death-recovery under 5s keeps HUD out of the way.
3. **Diegetic options** — energy lives on the cat (encryption glow), lives as hearts only when damaged?, score as floating world text.
4. **Feedback UI** — Celeste: particles + sound on every pickup/death; numbers pop, don't sit.
5. **Rhythm of attention** — HUD must lose to the action: during a jump-arc the eye is center-screen; corners are for glanceable truth (energy/lives), center is for events (detection, toasts).

---

## PART 4 — FIVE STYLE DIRECTIONS (mockups generated for choosing)

Each mockup uses the **same composition** (title + menu column, HUD strip, mascot, gameplay glimpse) so only the style differs:

| # | Style | Lineage | Personality | Risk |
|---|---|---|---|---|
| A | **Clean Flat Neon** | Celeste · Monument Valley · modern flat | Confident, quiet, premium; cyan-on-navy with real negative space | Can read "generic" if hierarchy is lazy |
| B | **Holo-Tech HUD** | Dead Space · Cyberpunk · Metroid Prime | Immersive "vault terminal" diegetic frame; brackets, grids, scanlines | Density must stay controlled or it's costume-y |
| C | **Speedrun Chic** | Neon White · Sayonara Wild Hearts | Energetic: huge numerals, timer-forward, diagonal motion; speed is the fantasy | Loud; risks clashing with stealth pacing (could suit Dash + results) |
| D | **Swiss Editorial** | Superhot-adjacent · sports broadcast · print grids | Off-white/ink + one signal red; index numbers, rules instead of boxes; adult, distinctive | Coldest option; least "gamey" |
| E | **Pixel Arcade** | Dead Cells · Into the Breach · Moonlighter | Chunky borders, bitmap energy, arcade-marquee personality | Fights our hi-res generated cat art (needs sprite rework) |

**Fit analysis for Glass House Heist** (stealth + confidentiality themes):
- **B (Holo-Tech)** maps directly to the fiction: encryption = holograms, validators = scan UIs, vault = terminal chrome.
- **A (Flat Neon)** is the safest premium choice and best matches the existing mascot art at hi-res.
- **D (Swiss)** is the boldest differentiator vs. AI-slop neon — one strong color decision, typographic confidence.
- **C** likely belongs to Glass Dash's identity more than the heist.
- **E** demands an art-style commitment (pixel) — biggest cascade.

---

## SOURCES
- StringLabs — *7 Successful Game UI Design Examples* · *Best UI/UX Moments in Games* · *The Art of Video Game UI with Panels*
- SunStrike Studios — *What Is Game UI? Examples & Principles* (Persona 5, Dead Cells, Cyberpunk, diegetic taxonomy)
- Game Design Skills — *Game UI: Meaning, Examples, Database* (contextual HUD, Game UI Database / Interface.InGame pointers)
- Super Jumps — *Top 5 Best Video Game UIs* (Dead Space deep-dive)
- Wayline — *Game UI/UX Best Practices* (30% quit over bad UI)
- Pixune — *Best Mobile Game UI Designs 2026* (Clash Royale hierarchy, PUBG custom HUD, Monument Valley minimalism)
- LinkedIn/Kixyc — *UI design patterns for platformer games* (minimalist/contextual/diegetic/feedback HUD)
- r/gamedev · r/Games · ResetEra · r/truegaming — community canon threads
- Interface.InGame (Celeste, Hades pages) & Game UI Database — screenshot references used in the board below
