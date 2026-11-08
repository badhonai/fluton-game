#!/usr/bin/env python3
"""Full React build: esbuild bundle (React + engine) -> src/app.js -> dist/standalone.html."""
import os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ESBUILD = os.path.join(ROOT, "node_modules", ".bin", "esbuild")

def main():
    if not os.path.exists(ESBUILD):
        print("esbuild missing — run: npm install"); sys.exit(1)
    cmd = [ESBUILD, "react-src/index.jsx", "--bundle", "--minify",
           "--jsx=automatic", '--define:process.env.NODE_ENV="production"',
           "--outfile=src/app.js", "--log-level=warning"]
    print("esbuild:", " ".join(cmd[1:]))
    subprocess.run(cmd, cwd=ROOT, check=True)
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "build.py")],
                   cwd=ROOT, check=True)

if __name__ == "__main__":
    main()
