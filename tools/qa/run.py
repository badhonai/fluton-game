#!/usr/bin/env python3
"""Headless QA runner: extracts scripts from dist/standalone.html, concatenates
stubs + game + tests, runs under Node. Usage: python3 tools/qa/run.py [suite]
suite = tests (default) | extra | all
"""
import os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QA = os.path.join(ROOT, "tools", "qa")

def extract():
    html = open(os.path.join(ROOT, "dist", "standalone.html")).read()
    blocks = re.findall(r"<script>([\s\S]*?)</script>", html)
    if len(blocks) < 2:
        print("expected >=2 inline script blocks, got", len(blocks)); sys.exit(1)
    return "\n;\n".join(blocks)

def run(suite):
    js = extract()
    tests = {"tests": "tests.js", "extra": "tests_extra.js"}[suite]
    runjs = os.path.join(QA, "_run_%s.js" % suite)
    # order: stubs, game(extracted from bundle), tests
    out = open(os.path.join(QA, "stubs.js")).read() + "\n;\n" + js + "\n;\n" \
        + open(os.path.join(QA, tests)).read()
    open(runjs, "w").write(out)
    r = subprocess.run(["node", runjs], cwd=ROOT)
    return r.returncode

def main():
    suite = sys.argv[1] if len(sys.argv) > 1 else "tests"
    rc = 0
    if suite in ("tests", "all"): rc |= run("tests")
    if suite in ("extra", "all"): rc |= run("extra")
    sys.exit(rc)

if __name__ == "__main__":
    main()
