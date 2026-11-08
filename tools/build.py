#!/usr/bin/env python3
"""Build dist/standalone.html — fully self-contained (inlined CSS/JS + data-URI PNGs).
The structured build (index.html + src/ + assets/) stays the source of truth; this is
the distribution artifact for sandboxes/previews where external files can't load.
"""
import base64, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def main():
    html = open(os.path.join(ROOT, "index.html")).read()

    # inline CSS
    css = open(os.path.join(ROOT, "src", "style.css")).read()
    html = html.replace('<link rel="stylesheet" href="src/style.css">',
                        "<style>\n" + css + "\n</style>")

    # inline JS (manifest first — game.js reads window.GHH_MANIFEST at boot)
    mf = open(os.path.join(ROOT, "src", "manifest.js")).read()
    game = open(os.path.join(ROOT, "src", "game.js")).read()
    old = '<script src="src/manifest.js"></script>\n<script src="src/game.js"></script>'
    if old not in html:
        print("script tags not found in index.html"); sys.exit(1)
    html = html.replace(old,
        "<script>\n" + mf + "\n</script>\n<script>\n" + game + "\n</script>")

    # inline images as data URIs
    paths = set(re.findall(r'assets/[A-Za-z0-9_\-./]+\.png', html))
    missing = []
    for p in sorted(paths):
        full = os.path.join(ROOT, p)
        if not os.path.exists(full):
            missing.append(p)
            # remove the element/attribute usage: leave path -> loader marks failed.
            # For src="" attributes, pointing at a missing file is fine (onerror fallbacks),
            # but in data-only contexts we must not leave a broken reference:
            continue
        b = base64.b64encode(open(full, "rb").read()).decode()
        html = html.replace(p, "data:image/png;base64," + b)

    out = os.path.join(ROOT, "dist")
    os.makedirs(out, exist_ok=True)
    dst = os.path.join(out, "standalone.html")
    open(dst, "w").write(html)
    size = os.path.getsize(dst)
    print(f"built dist/standalone.html  {size//1024} KB  ({len(paths)} asset refs, {len(missing)} missing)")
    if missing:
        print("missing assets (graceful fallbacks active):")
        for m in missing: print("  -", m)

if __name__ == "__main__":
    main()
