#!/usr/bin/env python3
"""Build dist/standalone.html — fully self-contained (inlined CSS/JS + data-URI PNGs).
Source of truth: index.html + src/style.css + src/manifest.js + src/app.js (React bundle).
"""
import base64, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def inline_js(html, tag, path):
    full = os.path.join(ROOT, path)
    if tag not in html:
        print("tag not found:", tag); sys.exit(1)
    js = open(full).read().replace("</script", "<\\/script")
    return html.replace(tag, "<script>\n" + js + "\n</script>")

def main():
    html = open(os.path.join(ROOT, "index.html")).read()

    # inline CSS
    css = open(os.path.join(ROOT, "src", "style.css")).read()
    html = html.replace('<link rel="stylesheet" href="src/style.css">',
                        "<style>\n" + css + "\n</style>")

    # inline manifest (asset paths + anchors) then the React+engine bundle
    html = inline_js(html, '<script src="src/manifest.js"></script>', "src/manifest.js")
    html = inline_js(html, '<script src="src/app.js"></script>', "src/app.js")

    # inline images as data URIs (paths appear in manifest + component strings)
    paths = set(re.findall(r'assets/[A-Za-z0-9_\-./]+\.png', html))
    missing = []
    for p in sorted(paths):
        full = os.path.join(ROOT, p)
        if not os.path.exists(full):
            missing.append(p)
            continue
        b = base64.b64encode(open(full, "rb").read()).decode()
        html = html.replace(p, "data:image/png;base64," + b)

    out = os.path.join(ROOT, "dist")
    os.makedirs(out, exist_ok=True)
    dst = os.path.join(out, "standalone.html")
    open(dst, "w").write(html)
    # Vercel's static output directory expects an index.html entry point.
    shutil.copyfile(dst, os.path.join(out, "index.html"))
    print(f"built dist/standalone.html  {os.path.getsize(dst)//1024} KB  "
          f"({len(paths)} asset refs, {len(missing)} missing)")
    if missing:
        print("missing assets (graceful fallbacks active):")
        for m in missing: print("  -", m)

if __name__ == "__main__":
    main()
