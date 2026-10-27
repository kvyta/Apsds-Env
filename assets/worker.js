/* Web Worker: loads Pyodide, generates the per-case headers, runs reference + student code.
   Runs off the main thread so an infinite loop can be killed by terminating the worker. */
'use strict';

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
importScripts(PYODIDE_URL + 'pyodide.js');

let py = null, prepare, makeHeader, runProgram;

async function init() {
  py = await loadPyodide({ indexURL: PYODIDE_URL });
  const src = await (await fetch('harness.py')).text();
  py.runPython(src);
  prepare = py.globals.get('prepare');
  makeHeader = py.globals.get('make_header');
  runProgram = py.globals.get('run_program');
  postMessage({ type: 'ready' });
}

// Compare ignoring trailing whitespace on each line and trailing blank lines.
function normalize(s) {
  const lines = s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}
function firstDiff(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i + 1;
  return -1;
}

function generate(m) {
  try {
    const meta = JSON.parse(prepare(m.testcaseCode, m.seed));
    const headers = [];
    for (let i = 1; i <= meta.n; i++) headers.push(makeHeader(i));
    postMessage({ type: 'cases', seed: m.seed, headers, timeLimit: meta.time_limit });
  } catch (e) {
    postMessage({ type: 'generate-error', seed: m.seed,
      message: 'Test generator problem (tell the organizer):\n' + e.message });
  }
}

async function runAll(m) {
  try {
    await py.loadPackagesFromImports(m.headers[0] + m.userCode + m.solutionCode);
  } catch (e) { /* optional */ }
  postMessage({ type: 'start', total: m.headers.length });

  for (let i = 1; i <= m.headers.length; i++) {
    const header = m.headers[i - 1];
    postMessage({ type: 'begin', index: i, phase: 'solution' });
    const exp = JSON.parse(runProgram(header + m.solutionCode, 'solution.py'));
    if (exp.error) {
      postMessage({ type: 'result', index: i, status: 'internal',
        error: 'The reference solution crashed (tell the organizer):\n' + exp.error });
      continue;
    }
    postMessage({ type: 'begin', index: i, phase: 'user', expected: exp.stdout });
    const got = JSON.parse(runProgram(header + m.userCode, '<your code>'));
    const res = { type: 'result', index: i, expected: exp.stdout, got: got.stdout, ms: got.ms };
    if (got.error) {
      res.status = 'error';
      res.error = got.error;
    } else {
      const d = firstDiff(normalize(exp.stdout), normalize(got.stdout));
      res.status = d === -1 ? 'pass' : 'fail';
      res.diffLine = d;
    }
    postMessage(res);
  }
  postMessage({ type: 'done' });
}

onmessage = (e) => {
  const m = e.data;
  if (m.type === 'generate') generate(m);
  else if (m.type === 'run') {
    runAll(m).catch((err) => postMessage({ type: 'fatal', message: String(err && err.message || err) }));
  }
};

init().catch((err) => postMessage({ type: 'init-error', message: String(err && err.message || err) }));
