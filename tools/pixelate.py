#!/usr/bin/env python3
"""Pixel-arcade art pass: bake chunky pixels into processed assets.
Downscale (nearest) -> quantize -> upscale (nearest) back to the SAME
dimensions, so manifest/draw code stay untouched while the art reads 16-bit."""
import os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# (glob under assets/, downscale factor, quantize colors)
JOBS = [
    ("character/cat/*.png", 4, 40),
    ("backgrounds/*.png",   8, 40),
    ("pickups/*.png",       3, 32),
    ("enemies/*.png",       4, 40),
    ("props/*.png",         4, 40),
    ("ui/*.png",            3, 32),
    ("fx/*.png",            3, 24),
    ("arcade/*.png",        4, 40),
    ("env/vault_door.png",  4, 40),
    ("env/platform_top.png",2, 24),
    ("env/platform_face.png",4, 32),
]
def process(path, factor, colors):
    im = Image.open(path)
    mode = im.mode
    w, h = im.size
    sw, sh = max(1, w // factor), max(1, h // factor)
    small = im.resize((sw, sh), Image.NEAREST)
    small = small.quantize(colors, method=Image.Quantize.FASTOCTREE)
    big = small.resize((w, h), Image.NEAREST)
    if mode == "RGBA":
        big = big.convert("RGBA")
        # restore alpha from the original (nearest-scaled) so glow edges survive
        alpha = im.convert("RGBA").getchannel("A").resize((sw, sh), Image.NEAREST).resize((w, h), Image.NEAREST)
        big.putalpha(alpha)
    big.save(path, optimize=True)
    return w, h

total = 0
for pattern, factor, colors in JOBS:
    for p in glob.glob(os.path.join(ROOT, "assets", pattern)):
        before = os.path.getsize(p)
        process(p, factor, colors)
        total += before - os.path.getsize(p)
print(f"pixelated {sum(len(glob.glob(os.path.join(ROOT,'assets',j[0]))) for j in JOBS)} files")
