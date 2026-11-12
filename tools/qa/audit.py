#!/usr/bin/env python3
"""Design & mobile audit — automated anti-slop gate.
Fails if: backdrop blur, gradient text, color-mix glow shadows, emoji glyphs
in UI source, unbalanced CSS, or viewport meta missing.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# decorative-slop bans (styles) — real design systems don't need them
CSS_BANS = [
    ("backdrop-filter", "full-screen blur is a mobile frame-killer"),
    ("background-clip:text", "gradient text is an AI-slop tell"),
    ("color-mix(", "color-mix glow shadows repaint constantly"),
]
# emoji / fake-icon bans in UI source (typographic arrows ← → in keycaps are fine)
EMOJI = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF]"
    "|[♪🔒★◈👁🧶↻◀▶◆♥]"  # noqa
)
ALLOW_KBD = ("kbd", "keys", "keycap")  # context markers where glyphs are labels

def find_files(base, exts):
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, base)):
        dirnames[:] = [d for d in dirnames if d not in ("node_modules", "dist", ".git")]
        for f in filenames:
            if any(f.endswith(e) for e in exts):
                yield os.path.join(dirpath, f)

def main():
    fails = []

    # ---- CSS ----
    css = open(os.path.join(ROOT, "src", "style.css")).read()
    if css.count("{") != css.count("}"):
        fails.append(f"style.css: unbalanced braces ({css.count('{')} vs {css.count('}')})")
    for needle, why in CSS_BANS:
        if needle in css:
            fails.append(f"style.css: banned '{needle}' — {why}")
    if "font-size:clamp" not in css and "@media" not in css:
        fails.append("style.css: no responsive rules found")

    # ---- UI sources: emoji audit ----
    for base in ("react-src", "games"):
        for path in find_files(base, (".jsx", ".js")):
            src = open(path).read()
            for i, line in enumerate(src.splitlines(), 1):
                if EMOJI.search(line):
                    # allow inside explicit keycap/label comments only
                    if "<kbd" in line or "keycap" in line:
                        continue
                    rel = os.path.relpath(path, ROOT)
                    fails.append(f"{rel}:{i}: emoji/fake icon in UI source -> {line.strip()[:80]}")

    # ---- index.html: viewport + no external resources ----
    html = open(os.path.join(ROOT, "index.html")).read()
    if "viewport" not in html:
        fails.append("index.html: missing viewport meta (mobile)")
    if re.search(r'(src|href)="https?://(?!fluton)', html):
        fails.append("index.html: external resource reference (breaks offline/preview)")

    # ---- HUD touch overlap guard: coarse-pointer rule must exist ----
    if "@media (pointer:coarse)" not in css:
        fails.append("style.css: missing coarse-pointer adaptations")

    if fails:
        print("AUDIT FAILED:")
        for f in fails:
            print("  -", f)
        sys.exit(1)
    print("  ok: design audit (no blur/gradient-text/color-mix, no emoji, viewport ok, coarse-pointer rules present)")

if __name__ == "__main__":
    main()
