#!/usr/bin/env python3
"""Scan exercises/ and write exercises/manifest.json.

Layout:  exercises/<meeting date>/<exercise name>/{description.txt, solution.py, testcase.py}

GitHub Pages cannot list directories, so the site reads this manifest to build
its menu. The deploy workflow runs this automatically; run it by hand
(python tools/build_manifest.py) if you deploy straight from a branch.
"""
import json
import sys
from pathlib import Path

REQUIRED = ("description.txt", "solution.py", "testcase.py")
root = Path(__file__).resolve().parent.parent / "exercises"

dates = []
for day in sorted((p for p in root.iterdir() if p.is_dir()), key=lambda p: p.name, reverse=True):
    exercises = []
    for ex in sorted((p for p in day.iterdir() if p.is_dir()), key=lambda p: p.name.lower()):
        missing = [f for f in REQUIRED if not (ex / f).is_file()]
        if missing:
            print(f"warning: skipping {ex.relative_to(root)} (missing {', '.join(missing)})", file=sys.stderr)
            continue
        exercises.append(ex.name)
    if exercises:
        dates.append({"name": day.name, "exercises": exercises})

out = root / "manifest.json"
out.write_text(json.dumps({"dates": dates}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"wrote {out.relative_to(root.parent)}: {sum(len(d['exercises']) for d in dates)} exercises in {len(dates)} meetings")
