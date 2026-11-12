#!/usr/bin/env python3
"""Headless QA runner for the React build.
 suites: tests | extra | smoke | all   (default: all)
  tests/extra — engine suites run against dist/standalone.html (React bundle, __NO_MOUNT)
  smoke       — esbuild-bundled renderToString suite across every screen
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QA = os.path.join(ROOT, "tools", "qa")
ESBUILD = os.path.join(ROOT, "node_modules", ".bin", "esbuild")

def extract():
    html = open(os.path.join(ROOT, "dist", "standalone.html")).read()
    blocks = re.findall(r"<script>([\s\S]*?)</script>", html)
    if len(blocks) < 2:
        print("expected >=2 inline script blocks, got", len(blocks)); sys.exit(1)
    return "\n;\n".join(blocks)

def run_node(parts, out_name):
    runjs = os.path.join(QA, out_name)
    open(runjs, "w").write("\n;\n".join(parts))
    return subprocess.run(["node", runjs], cwd=ROOT).returncode

def run_engine(suite):
    js = extract()
    tests = {"tests": "tests.js", "extra": "tests_extra.js", "arcade": "tests_arcade.js"}[suite]
    stubs = open(os.path.join(QA, "stubs.js")).read()
    body = open(os.path.join(QA, tests)).read()
    return run_node([stubs, js, body], "_run_%s.js" % suite)

def run_smoke():
    r = subprocess.run([ESBUILD, "tools/qa/smoke.jsx", "--bundle", "--platform=node",
                        "--jsx=automatic", "--outfile=tools/qa/_smoke.cjs",
                        "--log-level=warning"], cwd=ROOT)
    if r.returncode:
        return r.returncode
    stubs = open(os.path.join(QA, "stubs.js")).read()
    bundle = open(os.path.join(QA, "_smoke.cjs")).read()
    return run_node([stubs, bundle], "_run_smoke.js")

def run_audit():
    return subprocess.run([sys.executable, os.path.join(QA, "audit.py")], cwd=ROOT).returncode

def main():
    suite = sys.argv[1] if len(sys.argv) > 1 else "all"
    rc = 0
    if suite in ("audit", "all"): rc |= run_audit()
    if suite in ("tests", "all"): rc |= run_engine("tests")
    if suite in ("extra", "all"): rc |= run_engine("extra")
    if suite in ("arcade", "all"): rc |= run_engine("arcade")
    if suite in ("smoke", "all"): rc |= run_smoke()
    sys.exit(rc)

if __name__ == "__main__":
    main()
