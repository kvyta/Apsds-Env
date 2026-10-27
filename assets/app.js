(function () {
  'use strict';

  const STARTER = '# The grey header above sets up this test case. Write your code below and print() your answer.\n\n';
  const $ = (id) => document.getElementById(id);
  const enc = encodeURIComponent;

  /* ---------- safe localStorage ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ---------- theme ---------- */
  const root = document.documentElement;
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    document.querySelectorAll('[data-theme-value]').forEach((b) =>
      b.setAttribute('aria-checked', String(b.dataset.themeValue === t)));
  }
  applyTheme(root.getAttribute('data-theme') || 'light');
  document.querySelectorAll('[data-theme-value]').forEach((b) =>
    b.addEventListener('click', () => { applyTheme(b.dataset.themeValue); store.set('apsds:theme', b.dataset.themeValue); }));

  /* ---------- layout (single / two columns) ---------- */
  function applyLayout(l) {
    root.setAttribute('data-layout', l);
    document.querySelectorAll('[data-layout-value]').forEach((b) =>
      b.setAttribute('aria-checked', String(b.dataset.layoutValue === l)));
  }
  applyLayout(root.getAttribute('data-layout') === 'two' ? 'two' : 'one');
  document.querySelectorAll('[data-layout-value]').forEach((b) =>
    b.addEventListener('click', () => { applyLayout(b.dataset.layoutValue); store.set('apsds:layout', b.dataset.layoutValue); }));

  /* ---------- drawer ---------- */
  const drawer = $('drawer'), scrim = $('scrim'), menuBtn = $('menu-btn');
  function setDrawer(open) {
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    scrim.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close exercise menu' : 'Open exercise menu');
  }
  menuBtn.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
  scrim.addEventListener('click', () => setDrawer(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) { setDrawer(false); menuBtn.focus(); }
  });

  /* ---------- manifest + folder tree ---------- */
  let manifest = { dates: [] };
  const expanded = new Set();

  function prettyDate(name) {
    const m = name.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
    if (!m) return name;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (isNaN(d)) return name;
    return d.toLocaleDateString(undefined, { timeZone: 'UTC', weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + m[4];
  }

  const CHEV = '<svg class="chev" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 1.5 6.5 5 3 8.5"/></svg>';
  const FOLDER = '<svg class="folder" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true"><path d="M1.75 4.5a1 1 0 0 1 1-1h3l1.5 1.5h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-10.5a1 1 0 0 1-1-1z"/></svg>';

  function renderTree() {
    const tree = $('tree');
    tree.textContent = '';
    if (!manifest.dates.length) {
      tree.innerHTML = '<p class="muted small pad">No exercises yet.</p>';
      return;
    }
    manifest.dates.forEach((day) => {
      const wrap = document.createElement('div');
      const head = document.createElement('button');
      head.type = 'button';
      head.className = 'day-head';
      head.innerHTML = CHEV + FOLDER + '<span class="label"></span><span class="count"></span>';
      head.querySelector('.label').textContent = prettyDate(day.name);
      head.querySelector('.count').textContent = day.exercises.length;
      head.title = day.name;
      const list = document.createElement('ul');
      list.className = 'day-list';
      day.exercises.forEach((ex) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + enc(day.name) + '/' + enc(ex);
        a.textContent = ex;
        a.dataset.day = day.name; a.dataset.ex = ex;
        a.addEventListener('click', () => setDrawer(false));
        li.appendChild(a); list.appendChild(li);
      });
      const set = (open) => {
        head.setAttribute('aria-expanded', String(open));
        list.hidden = !open;
        open ? expanded.add(day.name) : expanded.delete(day.name);
      };
      head.addEventListener('click', () => set(head.getAttribute('aria-expanded') !== 'true'));
      set(expanded.has(day.name));
      wrap.append(head, list);
      tree.appendChild(wrap);
    });
    markCurrent();
  }
  function markCurrent() {
    document.querySelectorAll('#tree a').forEach((a) => {
      const on = current && a.dataset.day === current.day && a.dataset.ex === current.ex;
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------- exercise state ---------- */
  // current = { day, ex, testcaseCode, solutionCode, cases (headers[]), seed, timeLimit,
  //             view (1-based), phase: loading|ready|running|graded, results[], generating, error }
  let current = null;
  const editor = ApsdsEditor.create($('editor'), saveDraft);
  let saveTimer = 0;
  const draftKey = () => 'apsds:code:' + current.day + '/' + current.ex;
  function saveDraft() {
    if (!current) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { if (current) store.set(draftKey(), editor.getValue()); }, 300);
  }

  const exURL = (day, ex, file) => 'exercises/' + enc(day) + '/' + enc(ex) + '/' + file;
  async function fetchText(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' (' + r.status + ')');
    return r.text();
  }

  const runBtn = $('run-btn'), statusEl = $('status'), actionsEl = $('actions');
  const resultBar = $('result-bar'), outBox = $('out-box'), chipsEl = $('chips');
  const prevBtn = $('case-prev'), nextBtn = $('case-next'), caseLabel = $('case-label');
  const hdrPane = $('header-pane'), hdrCode = $('header-code').querySelector('code'), hdrGutter = $('header-gutter');

  async function openExercise(day, name) {
    abortRun();
    const me = current = {
      day, ex: name, testcaseCode: null, solutionCode: null, cases: null, seed: 0, timeLimit: 5,
      view: 1, phase: 'loading', results: [], generating: false, error: null,
    };
    markCurrent();
    expanded.add(day);
    renderTree();
    $('welcome').hidden = true;
    $('exercise').hidden = false;
    $('ex-title').textContent = name;
    $('ex-meta').textContent = 'Meeting: ' + prettyDate(day);
    document.title = name + ' · APSDS';
    statusEl.textContent = '';
    const desc = $('description');
    desc.textContent = 'Loading…';
    const draft = store.get(draftKey());
    editor.setValue(draft !== null ? draft : STARTER);
    setPhase('loading');
    window.scrollTo(0, 0);
    document.querySelectorAll('.col-left, .col-right').forEach((el) => { el.scrollTop = 0; });

    fetchText(exURL(day, name, 'description.txt')).then(
      (html) => { if (current === me) desc.innerHTML = html; },
      () => { if (current === me) desc.innerHTML = '<p class="notice">Could not load this exercise\'s description.</p>'; });

    try {
      const [tc, sol] = await Promise.all([fetchText(exURL(day, name, 'testcase.py')), fetchText(exURL(day, name, 'solution.py'))]);
      if (current !== me) return;
      me.testcaseCode = tc; me.solutionCode = sol;
      maybeGenerate();
    } catch (e) {
      if (current !== me) return;
      me.error = 'Could not load testcase.py / solution.py for this exercise.';
      renderCase();
    }
  }

  function showWelcome() {
    abortRun();
    current = null;
    markCurrent();
    $('exercise').hidden = true;
    $('welcome').hidden = false;
    document.title = 'APSDS Practice';
  }

  function route() {
    const h = location.hash.slice(1);
    if (!h) return showWelcome();
    const i = h.indexOf('/');
    if (i < 0) return showWelcome();
    let day, name;
    try { day = decodeURIComponent(h.slice(0, i)); name = decodeURIComponent(h.slice(i + 1)); } catch (e) { return showWelcome(); }
    openExercise(day, name);
  }
  window.addEventListener('hashchange', route);

  /* ---------- phases + rendering ---------- */
  function setPhase(p) {
    current.phase = p;
    const locked = p === 'running' || p === 'graded';
    editor.setReadOnly(locked);
    actionsEl.hidden = p === 'graded';
    resultBar.hidden = outBox.hidden = p !== 'graded';
    setRunButton();
    renderCase();
  }

  function setRunButton() {
    runBtn.classList.remove('stop');
    const c = current;
    if (workerError) { runBtn.textContent = 'Python unavailable'; runBtn.disabled = true; return; }
    if (!c || c.phase === 'loading' || (!workerReady && c.phase !== 'running')) {
      runBtn.textContent = !workerReady ? 'Loading Python…' : 'Preparing…'; runBtn.disabled = true;
    } else if (c.phase === 'running') {
      runBtn.textContent = 'Stop'; runBtn.classList.add('stop'); runBtn.disabled = false;
    } else { runBtn.textContent = 'Run'; runBtn.disabled = c.phase !== 'ready'; }
  }

  function renderCase() {
    const c = current; if (!c) return;
    const n = c.cases ? c.cases.length : 0;
    caseLabel.textContent = n ? 'Test case ' + c.view + ' of ' + n : 'Test case – of –';
    prevBtn.disabled = nextBtn.disabled = !n || c.phase === 'running';
    hdrCode.className = '';
    if (!n) {
      hdrPane.hidden = false;
      hdrGutter.textContent = '';
      hdrCode.className = 'muted';
      hdrCode.textContent = c.error || (workerError ? 'Python could not start.' : (workerReady ? 'Generating test cases…' : 'Loading Python…'));
      editor.setOffset(0);
    } else {
      const header = c.cases[c.view - 1];
      const lines = header.split('\n'); lines.pop();           // header ends with '\n' (or is empty)
      hdrPane.hidden = lines.length === 0;
      hdrCode.innerHTML = ApsdsEditor.highlight(lines.join('\n'));
      hdrGutter.textContent = lines.map((_, i) => i + 1).join('\n');
      editor.setOffset(lines.length);
    }
    if (c.phase === 'graded') { renderScore(); renderOutput(); }
  }

  function shiftCase(d) {
    const c = current; if (!c || !c.cases) return;
    const n = c.cases.length;
    c.view = ((c.view - 1 + d + n) % n) + 1;                 // wraps: 1 ‹ goes to n, n › goes to 1
    renderCase();
  }
  prevBtn.addEventListener('click', () => shiftCase(-1));
  nextBtn.addEventListener('click', () => shiftCase(1));

  function renderScore() {
    const c = current;
    const p = c.results.filter((r) => r && r.status === 'pass').length;
    const sc = $('score');
    sc.textContent = p + ' / ' + c.cases.length;
    sc.className = 'score' + (p === c.cases.length ? ' ok' : '');
    chipsEl.textContent = '';
    chipsEl.style.gridTemplateColumns = 'repeat(' + Math.min(c.cases.length, 15) + ', 28px)';
    c.cases.forEach((_, i) => {
      const r = c.results[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip ' + (!r || r.status === 'skip' ? 'skip' : r.status === 'pass' ? 'pass' : 'bad') + (c.view === i + 1 ? ' cur' : '');
      b.textContent = i + 1;
      b.setAttribute('aria-label', 'Test case ' + (i + 1) + ': ' + (r ? LABEL[r.status] : 'not run'));
      b.addEventListener('click', () => { c.view = i + 1; renderCase(); });
      chipsEl.appendChild(b);
    });
  }

  const LABEL = { pass: 'Passed', fail: 'Wrong answer', error: 'Runtime error', tle: 'Time limit exceeded', internal: 'Judge error', skip: 'Not run' };
  const MARK = { pass: '✓', fail: '✗', error: '✗', tle: '✗', internal: '!', skip: '–' };
  const DISPLAY_LIMIT = 4000;

  function clip(s) {
    if (s.length <= DISPLAY_LIMIT) return s;
    return s.slice(0, DISPLAY_LIMIT) + '\n… (' + (s.length - DISPLAY_LIMIT).toLocaleString() + ' more characters)';
  }
  function block(title, text, cls) {
    const d = document.createElement('div');
    const h = document.createElement('h4'); h.textContent = title;
    const pre = document.createElement('pre');
    if (cls) pre.className = cls;
    if (text === '' || text == null) { pre.textContent = '(no output)'; pre.classList.add('ws'); }
    else pre.textContent = clip(text);
    d.append(h, pre);
    return d;
  }

  function renderOutput() {
    const c = current, r = c.results[c.view - 1];
    outBox.textContent = '';
    outBox.classList.remove('pass', 'bad');
    if (!r) return;
    if (r.status === 'pass') outBox.classList.add('pass');
    else if (r.status !== 'skip') outBox.classList.add('bad');
    const head = document.createElement('div');
    head.className = 'out-head ' + (r.status === 'pass' ? 'pass' : 'bad');
    head.innerHTML = '<strong></strong><span class="time"></span>';
    head.querySelector('strong').textContent = 'Case ' + c.view + ': ' + (r.status === 'pass' ? 'Success' : r.status === 'skip' ? 'Not run' : 'Failed');
    if (r.ms != null && r.status !== 'skip') head.querySelector('.time').textContent = r.ms + ' ms';
    outBox.appendChild(head);
    if (r.status === 'skip') return;
    // Always the same layout: Expected output | Your output (errors appear in the right box).
    let exp = r.expected, got = r.got, expErr = false, gotErr = false;
    if (r.status === 'error' || r.status === 'tle') { got = (r.got ? r.got + '\n' : '') + r.error; gotErr = true; }
    else if (r.status === 'internal') { exp = r.error; expErr = true; got = ''; }
    const stack = document.createElement('div'); stack.className = 'cols';
    stack.append(block('Expected output', exp, expErr ? 'err' : ''), block('Your output', got, gotErr ? 'err' : ''));
    outBox.appendChild(stack);
  }

  /* ---------- Python worker ---------- */
  let worker = null, workerReady = false, watchdog = 0, workerError = null;

  function spawnWorker() {
    workerReady = false; workerError = null;
    setRunButton();
    try {
      worker = new Worker('assets/worker.js');
    } catch (e) {
      workerError = e; setRunButton(); renderCase();
      statusEl.textContent = 'Could not start Python: ' + e.message;
      return;
    }
    worker.onmessage = onWorkerMessage;
    worker.onerror = (e) => {
      workerError = new Error(e.message || 'worker failed');
      statusEl.textContent = 'Could not start Python (are you offline?).';
      setRunButton(); renderCase();
    };
    renderCase();
  }
  function killWorker() {
    clearTimeout(watchdog);
    if (worker) { worker.onmessage = null; worker.onerror = null; worker.terminate(); worker = null; }
  }
  function arm(ms, handler) { clearTimeout(watchdog); watchdog = setTimeout(handler, ms); }

  function maybeGenerate() {
    const c = current;
    if (!c || !workerReady || !c.testcaseCode || c.cases || c.generating || c.phase !== 'loading') return;
    c.generating = true;
    c.seed = Math.floor(Math.random() * 1e9);
    worker.postMessage({ type: 'generate', testcaseCode: c.testcaseCode, seed: c.seed });
    arm(30000, () => {                    // test generator hung
      killWorker(); spawnWorker();
      if (current) { current.generating = false; current.error = 'Timed out while generating test cases (tell the organizer).'; renderCase(); }
    });
  }

  function onWorkerMessage(ev) {
    const m = ev.data, c = current;
    switch (m.type) {
      case 'ready':
        workerReady = true; setRunButton(); renderCase(); maybeGenerate(); break;
      case 'init-error':
        workerError = new Error(m.message); statusEl.textContent = 'Could not load Python: ' + m.message; setRunButton(); renderCase(); break;
      case 'cases':
        if (!c || m.seed !== c.seed) break;
        clearTimeout(watchdog);
        c.generating = false; c.cases = m.headers; c.timeLimit = m.timeLimit; c.view = 1;
        setPhase('ready'); break;
      case 'generate-error':
        if (!c || m.seed !== c.seed) break;
        clearTimeout(watchdog);
        c.generating = false; c.error = m.message; renderCase(); break;
      case 'fatal':
        if (!c || c.phase !== 'running') break;
        clearTimeout(watchdog);
        statusEl.textContent = 'Run failed: ' + m.message;
        c.results = []; setPhase('ready'); break;
      case 'start': break;
      case 'begin':
        if (!c || c.phase !== 'running') break;
        c.runPhase = m.phase; c.runIndex = m.index; c.runExpected = m.expected || '';
        if (c.view !== m.index) { c.view = m.index; renderCase(); }
        statusEl.textContent = 'Running case ' + m.index + ' of ' + c.cases.length + '…';
        arm(c.timeLimit * 1000, onTimeout);
        break;
      case 'result':
        if (!c || c.phase !== 'running') break;
        clearTimeout(watchdog);
        c.results[m.index - 1] = m; break;
      case 'done':
        if (!c || c.phase !== 'running') break;
        finishRun(); break;
    }
  }

  /* ---------- running / grading ---------- */
  function startRun() {
    const c = current;
    if (!c || c.phase !== 'ready' || !workerReady) return;
    store.set(draftKey(), editor.getValue());
    c.results = [];
    setPhase('running');
    statusEl.textContent = 'Running…';
    arm(60000, () => {                    // loading imported packages took too long
      killWorker(); spawnWorker();
      if (current === c) { c.results = []; setPhase('ready'); statusEl.textContent = 'Run failed: timed out while preparing.'; }
    });
    worker.postMessage({ type: 'run', headers: c.cases, userCode: editor.getValue(), solutionCode: c.solutionCode });
  }

  function onTimeout() {
    const c = current; if (!c || c.phase !== 'running') return;
    const i = c.runIndex;
    killWorker();
    if (c.runPhase === 'solution') {
      c.results[i - 1] = { status: 'internal', error: 'The reference solution timed out (tell the organizer).' };
    } else {
      c.results[i - 1] = { status: 'tle', ms: c.timeLimit * 1000, expected: c.runExpected, error: 'Time limit exceeded' };
    }
    for (let k = i + 1; k <= c.cases.length; k++) c.results[k - 1] = { status: 'skip' };
    spawnWorker();
    finishRun();
  }

  function finishRun() {
    const c = current;
    clearTimeout(watchdog);
    const firstBad = c.results.findIndex((r) => !r || r.status !== 'pass');
    c.view = firstBad === -1 ? 1 : firstBad + 1;       // jump to the first failing case
    statusEl.textContent = '';
    setPhase('graded');
  }

  function abortRun() {            // Stop button, or leaving the exercise mid-run
    const c = current;
    if (!c || c.phase !== 'running') return;
    killWorker(); spawnWorker();
    c.results = [];
    setPhase('ready');
  }

  runBtn.addEventListener('click', () => {
    if (!current) return;
    if (current.phase === 'running') { abortRun(); statusEl.textContent = 'Stopped.'; }
    else startRun();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && current && !$('exercise').hidden) {
      e.preventDefault(); startRun();
    }
  });

  // Clicking (or typing in) the locked editor after grading: glint the Try again button.
  const retryBtn = $('retry-btn');
  function nudgeRetry() {
    if (!current || current.phase !== 'graded') return;
    retryBtn.classList.remove('glint');
    void retryBtn.offsetWidth;                       // restart the animation if it is already playing
    retryBtn.classList.add('glint');
  }
  retryBtn.addEventListener('animationend', (e) => { if (e.animationName !== 'glint-sweep' && e.animationName !== 'glint-fade') return; retryBtn.classList.remove('glint'); });
  $('editor').addEventListener('pointerdown', nudgeRetry);
  editor.el.addEventListener('keydown', (e) => {
    if (editor.el.readOnly && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Tab')) nudgeRetry();
  });

  // Try again: unlock the editor (code is kept) and draw a fresh set of cases.
  $('retry-btn').addEventListener('click', () => {
    const c = current; if (!c) return;
    c.results = []; c.cases = null; c.generating = false; c.view = 1; c.error = null;
    statusEl.textContent = '';
    setPhase('loading');
    maybeGenerate();
    editor.focus();
  });

  /* ---------- boot ---------- */
  async function boot() {
    if (location.protocol === 'file:') {
      $('file-warning').hidden = false;
      $('tree').innerHTML = '<p class="muted small pad">Serve this folder over http to load exercises.</p>';
      return;
    }
    try {
      const r = await fetch('exercises/manifest.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      manifest = await r.json();
      manifest.dates.sort((a, b) => (a.name < b.name ? 1 : -1));   // newest first
    } catch (e) {
      $('tree').innerHTML = '<p class="muted small pad">Could not load exercises/manifest.json.</p>';
    }
    if (manifest.dates.length) expanded.add(manifest.dates[0].name);
    renderTree();
    spawnWorker();
    route();
  }
  boot();
})();
