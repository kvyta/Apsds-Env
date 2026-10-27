# APSDS Practice

A minimal, USACO-style practice site for the club. Static files only: Python runs in the visitor's browser (Pyodide), so it works on Windows, macOS and Linux with nothing to install.

## Adding an exercise

```
exercises/
  2026-10-26/                  <- meeting date (folder name; use YYYY-MM-DD so it sorts)
    Balanced Brackets/         <- exercise name (folder name is the title)
      description.txt          <- the problem, as HTML
      solution.py              <- reference solution (reads stdin, prints stdout)
      testcase.py              <- random test-case generator
```

Create the folder, add the three files, commit and push. The menu updates itself.

### How an exercise works
Students don't read input. Instead each test case has a **header**: a few grey, read-only lines of Python shown above their code (imports, `n = 10`, `a = [...]`, ...). Their code goes below it and `print()`s the answer. When they press Run, the judge runs `header + their code` and `header + solution.py` for every case and compares the printed output.

### description.txt
Plain HTML fragment (no `<html>`/`<body>`; the exercise name is already shown as the page title). Describe the variables the header provides. Handy bits: `<h3>`, `<p>`, `<code>`, `<pre>`, `<table>`, and
`<div class="samples"><div>…</div><div>…</div></div>` for a side-by-side sample.

### testcase.py
```python
NUM_CASES  = 10      # optional, default 10
TIME_LIMIT = 5       # optional, seconds per case, default 5

def generate(case, rng):
    # case: 1..NUM_CASES      rng: a random.Random, use it instead of `random`
    # return the header as a string of Python source
    n = rng.randint(1, 10)
    a = [rng.randint(1, 99) for _ in range(n)]
    return f"n = {n}\na = {a}"
```
- Vary difficulty with `case` (small edge cases first, large inputs last).
- Headers are shown on screen, so keep them readable. For big data, return code that builds it from a seed instead of a giant literal, e.g. `"import random\nrandom.seed(123)\nn = 100000\na = [random.randint(1, 9) for _ in range(n)]"`, or an expression such as `s = "(" * 50000 + ")" * 50000`.
- Test cases are generated once when the exercise opens, and again when the student clicks **Try again**.

### solution.py
The reference **body**: it uses the header's variables and `print()`s the answer, exactly what a student is expected to write. No expected answers are stored anywhere. Output is compared line by line, ignoring trailing spaces and blank lines at the end.

## How judging works
Students step through the cases with the ‹ › arrows above the editor (the header swaps, their code stays). Run grades all cases at once, then locks the editor (grey), shows the score (e.g. 4 / 10) and an output box that follows the ‹ › arrows: their output, or expected vs. theirs, or the error. **Try again** unlocks the editor and re-randomizes the cases. Student code runs in a Web Worker, so infinite loops are stopped after `TIME_LIMIT` seconds and the page stays responsive.

Because everything is static, `solution.py` and `testcase.py` are downloadable by anyone who looks. That's fine for a club; don't rely on them being secret.

## Editor shortcuts
Tab / Shift+Tab indent (also on a selection) · Enter keeps indent, indents after `:` or an open bracket, and dedents after `return`/`break`/`continue`/`pass`/`raise` · typing `else:`/`elif:`/`except:`/`finally:` snaps under its `if`/`try` · brackets and quotes auto-close and type-over · Backspace removes a whole indent or an empty pair · Ctrl/⌘+/ toggles comments · Alt+↑/↓ moves lines · Home toggles first character / column 0 · Ctrl/⌘+Enter runs · Esc then Tab leaves the editor.

## Deploying on GitHub Pages
**Simple (deploy from a branch):** push this folder to a repo, then **Settings → Pages → Deploy from a branch → `main` / root**. Before each push after adding an exercise, run `python tools/build_manifest.py` and commit the updated `exercises/manifest.json` (GitHub Pages can't list folders, so the menu reads that file).

**Automatic (optional):** set **Source: GitHub Actions** instead and keep `.github/workflows/pages.yml`; it rebuilds the manifest on every push, so you never run the script yourself.

## Preview locally
```
python serve.py
```
Opens http://localhost:8000. (Opening `index.html` by double-click won't work; browsers block loading files from disk.) Needs internet on first load to fetch Pyodide from a CDN.

## Files
- `index.html`, `assets/style.css`: page and theme
- `assets/editor.js`: the code editor (Tab/Shift+Tab, auto-indent, highlighting)
- `assets/app.js`: menu, routing, results
- `assets/worker.js`, `assets/harness.py`: Python runner
- `tools/build_manifest.py`: builds `exercises/manifest.json`
