#!/usr/bin/env python3
"""Glass House Heist — asset processing pipeline.
Sources (AI-generated, magenta-keyed sheets) -> optimized per-frame PNGs + manifest.
Pipeline: magenta key -> despill -> grid slice -> inset -> alpha-trim -> anchor ->
optimize -> manifest (src/manifest.js + assets/manifest.json).
"""
import json, os, sys
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC  = os.path.join(ROOT, "assets", "source")
OUT  = os.path.join(ROOT, "assets")

# ---------- keying ----------
def key_magenta(img):
    """Strict vectorized magenta key + despill.
    m = min(R,B) - G:  high for magenta bg/divider lines, ~0 for real content."""
    import numpy as np
    a = np.asarray(img.convert("RGBA")).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.minimum(r, b) - g
    alpha = np.where(m > 65, 0, 255).astype(np.int32)
    excess = np.maximum(0, np.minimum(r, b) - g - 25)
    r2 = np.maximum(0, r - (excess * 7) // 10)
    b2 = np.maximum(0, b - (excess * 7) // 10)
    out = np.dstack([r2, g, b2, alpha]).astype(np.uint8)
    res = Image.fromarray(out, "RGBA")
    rr, gg, bb, aa = res.split()
    aa = aa.filter(ImageFilter.GaussianBlur(0.5))
    return Image.merge("RGBA", (rr, gg, bb, aa))

def drop_stray(img, min_frac):
    """Keep main component(s); drop detached specks smaller than min_frac of largest."""
    import numpy as np
    a = np.asarray(img)
    mask = a[..., 3] > 24
    H, W = mask.shape
    labels = np.zeros((H, W), dtype=np.int32)
    sizes = {}; cur = 0
    from collections import deque
    for y in range(H):
        for x in range(W):
            if mask[y, x] and labels[y, x] == 0:
                cur += 1; q = deque([(y, x)]); labels[y, x] = cur; n = 0
                while q:
                    cy, cx = q.popleft(); n += 1
                    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                        ny, nx = cy+dy, cx+dx
                        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and labels[ny, nx] == 0:
                            labels[ny, nx] = cur; q.append((ny, nx))
                sizes[cur] = n
    if not sizes: return img
    largest = max(sizes.values())
    keep = {k for k, v in sizes.items() if v >= largest * min_frac}
    if len(keep) == len(sizes): return img
    km = np.isin(labels, list(keep))
    out = a.copy(); out[~km, 3] = 0
    return Image.fromarray(out, "RGBA")

def alpha_trim(img, pad=1):
    bbox = img.getbbox()
    if not bbox: return None
    l, t, r, b = bbox
    l = max(0, l - pad); t = max(0, t - pad)
    r = min(img.width, r + pad); b = min(img.height, b + pad)
    if r - l < 6 or b - t < 6: return None
    return img.crop((l, t, r, b))

# ---------- sheets ----------
def process_sheet(src_name, cols, rows, names, out_dir, inset=6, min_frac=0.02):
    path = os.path.join(SRC, src_name)
    if not os.path.exists(path):
        print(f"  SKIP {src_name} (missing)"); return {}
    img = key_magenta(Image.open(path))
    W, H = img.size
    cw, ch = W / cols, H / rows
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    for idx, name in enumerate(names):
        cx, cy = idx % cols, idx // cols
        box = (int(cx * cw) + inset, int(cy * ch) + inset,
               int((cx + 1) * cw) - inset, int((cy + 1) * ch) - inset)
        cell = img.crop(box)
        frame = drop_stray(cell, min_frac)
        frame = alpha_trim(frame, pad=2)
        if frame is None:
            print(f"  !! empty cell {src_name}:{name}"); continue
        if frame.width > 460:  # keep sprite files lean
            s = 460 / frame.width
            frame = frame.resize((460, max(1, int(frame.height * s))), Image.LANCZOS)
        rel = os.path.join(out_dir, name + ".png").replace(os.sep, "/")
        frame.save(os.path.join(ROOT, rel), optimize=True)
        out[name] = {"file": rel, "ax": 0.5, "ay": 1.0,
                     "w": frame.width, "h": frame.height}
        print(f"  {rel}  {frame.width}x{frame.height}")
    return out

def process_full(src_name, rel_out, resize_w=None, alpha_ramp=False,
                 line_crop=False, mirror_tile=False, palette=True):
    path = os.path.join(SRC, src_name)
    if not os.path.exists(path):
        print(f"  SKIP {src_name} (missing)"); return None
    img = Image.open(path)
    if line_crop:
        # platform top: find the brightest cyan row, crop flush from there
        rgb = img.convert("RGB"); w, h = rgb.size; best, by = -1, 0
        for y in range(min(h, 200)):
            s = 0
            for x in range(0, w, 8):
                r, g, b = rgb.getpixel((x, y))
                if g > 120 and b > 120 and g > r + 40: s += g + b
            if s > best: best, by = s, y
        img = img.crop((0, max(0, by - 2), w, min(h, by - 2 + 120)))
        palette = False  # keep smooth glow
    if mirror_tile:
        # 2x2 mirror tile -> seamless
        h1 = Image.new("RGBA", (img.width * 2, img.height))
        h1.paste(img, (0, 0)); h1.paste(img.transpose(Image.FLIP_LEFT_RIGHT), (img.width, 0))
        v1 = Image.new("RGBA", (h1.width, h1.height * 2))
        v1.paste(h1, (0, 0)); v1.paste(h1.transpose(Image.FLIP_TOP_BOTTOM), (0, h1.height))
        img = v1
    if resize_w and img.width > resize_w:
        s = resize_w / img.width
        img = img.resize((resize_w, int(img.height * s)), Image.LANCZOS)
    if alpha_ramp:
        # fade the sky at the top to transparent so far layer shows through
        img = img.convert("RGBA"); px = img.load()
        ramp_end = int(img.height * 0.30)
        for y in range(ramp_end):
            t = y / ramp_end
            t = t * t * (3 - 2 * t)  # smoothstep
            f = t
            for x in range(img.width):
                r, g, b, a = px[x, y]
                if a: px[x, y] = (r, g, b, int(a * f))
    elif palette and img.mode == "RGB":
        img = img.quantize(256, method=Image.Quantize.FASTOCTREE)
    out_path = os.path.join(ROOT, rel_out)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, optimize=True)
    print(f"  {rel_out}  {img.width}x{img.height}  {os.path.getsize(out_path)//1024}KB")
    return {"file": rel_out, "w": img.width, "h": img.height}

# ---------- sheets only (skip heavy fulls) ----------
def main_sheets_only():
    M = json.load(open(os.path.join(ROOT, "assets", "manifest.json")))
    M.setdefault("images", {})
    I = M["images"]
    for src_name, cols, rows, names, out_dir, inset, mf in SHEET_CFG:
        for name, out in process_sheet(src_name, cols, rows, names, out_dir, inset=inset, min_frac=mf).items():
            key = out.get("_key") or name
            I[key if not key.startswith("!") else key[1:]] = out
    write_manifest(M)

def write_manifest(M):
    with open(os.path.join(ROOT, "assets", "manifest.json"), "w") as f:
        json.dump(M, f, indent=1)
    os.makedirs(os.path.join(ROOT, "src"), exist_ok=True)
    with open(os.path.join(ROOT, "src", "manifest.js"), "w") as f:
        f.write("/* generated by tools/slice_assets.py — do not edit */\n")
        f.write("window.GHH_MANIFEST=" + json.dumps(M, indent=1) + ";\n")
    print("manifest written:", len(M["images"]), "images")

# ---------- main ----------
def main():
    M = {"images": {}, "cat": {"drawH": 54}, "ver": 2}
    I = M["images"]
    print("backgrounds / environment:")
    for k, args in {
        "bg_title": ("bg_title.png", "assets/backgrounds/bg_title.png", dict(resize_w=1600)),
        "bg_far":   ("bg_far.png",   "assets/backgrounds/bg_far.png",   dict(resize_w=1600)),
        "bg_mid":   ("bg_mid.png",   "assets/backgrounds/bg_mid.png",   dict(resize_w=1600, alpha_ramp=True)),
        "plat_top": ("platform_top.png", "assets/env/platform_top.png", dict(line_crop=True)),
        "face":     ("platform_face.png","assets/env/platform_face.png",dict(mirror_tile=True)),
    }.items():
        rel = args[1]; opts = args[2]
        r = process_full(args[0], rel, **opts)
        if r: I[k] = r
    r = process_full("vault_door.png", "assets/env/vault_door.png", resize_w=480)
    if r:
        img = Image.open(os.path.join(ROOT, r["file"]))
        img = key_magenta(img); fr = alpha_trim(img, 2)
        fr.save(os.path.join(ROOT, r["file"]), optimize=True)
        r.update({"file": r["file"], "ax": 0.5, "ay": 1.0, "w": fr.width, "h": fr.height})
        I["vault"] = r
        print(f"  vault keyed {fr.width}x{fr.height}")

    print("character:")
    for name, out in process_sheet("cat_core.png", 3, 2,
            ["idle","run1","run2","run3","jump","fall"], "assets/character/cat", inset=14, min_frac=0.06).items():
        I["cat_" + name] = out
    for name, out in process_sheet("cat_react.png", 3, 2,
            ["land","hurt","win","wave","throw","sit"], "assets/character/cat", inset=14, min_frac=0.06).items():
        I["cat_" + name] = out

    print("pickups:")
    for name, out in process_sheet("collectibles.png", 2, 2,
            ["note","cell","yarn","star"], "assets/pickups", inset=6, min_frac=0.04).items():
        out["ay"] = 0.5; I[name] = out

    print("enemies:")
    for name, out in process_sheet("enemies.png", 3, 2,
            ["turret","turret_alert","drone","bot","bot_alert","bot_distract"],
            "assets/enemies", inset=8, min_frac=0.015).items():
        if name.startswith("bot"): out["ay"] = 1.0
        if name == "drone": out["ay"] = 0.5
        I[name] = out

    print("props:")
    for name, out in process_sheet("props.png", 3, 2,
            ["plant","rack","glass","sign","pipe","cone"], "assets/props", inset=8, min_frac=0.02).items():
        I["prop_" + name] = out

    print("ui:")
    for name, out in process_sheet("ui_icons.png", 4, 3,
            ["star","star_empty","clock","eye","sound","mute","pause","play",
             "replay","home","heart","lock"], "assets/ui", inset=8, min_frac=0.02).items():
        out["ay"] = 0.5; I["ui_" + name] = out

    print("fx:")
    for name, out in process_sheet("fx.png", 4, 2,
            ["spark","burst","dust","ring","glitch","dots","cross","plus"],
            "assets/fx", inset=6, min_frac=0.0).items():
        out["ay"] = 0.5; I["fx_" + name] = out

    # manifest outputs
    with open(os.path.join(ROOT, "assets", "manifest.json"), "w") as f:
        json.dump(M, f, indent=1)
    os.makedirs(os.path.join(ROOT, "src"), exist_ok=True)
    with open(os.path.join(ROOT, "src", "manifest.js"), "w") as f:
        f.write("/* generated by tools/slice_assets.py — do not edit */\n")
        f.write("window.GHH_MANIFEST=" + json.dumps(M, indent=1) + ";\n")
    n = len(I)
    print(f"\nmanifest: {n} images -> src/manifest.js + assets/manifest.json")
    missing = [k for k in ("prop_plant","ui_star","fx_spark","vault") if k not in I]
    if missing: print("STILL MISSING:", missing)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "sheets":
        main_sheets_only()
    else:
        main()
