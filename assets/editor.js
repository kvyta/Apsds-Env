/* Tiny dependency-free Python editor: a transparent <textarea> on top of a
   syntax-highlighted <pre>. Includes the little conveniences people expect:
   auto-indent / auto-dedent, bracket + quote pairing, comment toggle, line moving. */
(function () {
  'use strict';

  const KEYWORDS = new Set(('False None True and as assert async await break class continue def del elif else ' +
    'except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield').split(' '));
  const BUILTINS = new Set(('abs all any bin bool bytes callable chr dict divmod enumerate filter float format ' +
    'frozenset getattr hasattr hash hex id input int isinstance issubclass iter len list map max min next object oct ' +
    'open ord pow print range repr reversed round set setattr slice sorted str sum super tuple type zip self cls ' +
    'Exception ValueError KeyError IndexError TypeError StopIteration').split(' '));

  const R = String.raw;
  const TOKEN_RE = new RegExp([
    R`(#[^\n]*)`,                                                                  // 1 comment
    R`((?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|` +        // 2 string
      R`"(?:\\.|[^"\\\n])*(?:"|$)|'(?:\\.|[^'\\\n])*(?:'|$)))`,
    R`(@[A-Za-z_][\w.]*)`,                                                         // 3 decorator
    R`(\b0[xXoObB][\da-fA-F_]+\b|(?:\b\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?[jJ]?\b)`, // 4 number
    R`([A-Za-z_]\w*)`,                                                             // 5 identifier
    R`([\s\S])`                                                                    // 6 anything else
  ].join('|'), 'g');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(src) {
    let out = '', m, prev = '';
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(src)) !== null) {
      const t = m[0];
      if (t === '') { TOKEN_RE.lastIndex++; continue; }
      if (m[1] !== undefined) out += '<span class="tok-com">' + esc(t) + '</span>';
      else if (m[2] !== undefined) out += '<span class="tok-str">' + esc(t) + '</span>';
      else if (m[3] !== undefined) out += '<span class="tok-dec">' + esc(t) + '</span>';
      else if (m[4] !== undefined) out += '<span class="tok-num">' + esc(t) + '</span>';
      else if (m[5] !== undefined) {
        if (KEYWORDS.has(t)) { out += '<span class="tok-kw">' + t + '</span>'; prev = t; continue; }
        if (prev === 'def' || prev === 'class') out += '<span class="tok-def">' + t + '</span>';
        else if (BUILTINS.has(t)) out += '<span class="tok-bi">' + t + '</span>';
        else out += t;
        prev = t; continue;
      } else { out += esc(t); if (!/\s/.test(t)) prev = ''; continue; }
      prev = '';
    }
    return out;
  }

  /* ---------- small text helpers ---------- */
  const OPEN = { '(': ')', '[': ']', '{': '}' };
  const CLOSE = new Set([')', ']', '}']);
  const lineStart = (v, i) => v.lastIndexOf('\n', i - 1) + 1;
  const isWord = (c) => !!c && /[A-Za-z0-9_]/.test(c);

  // Scan one line's text up to the caret: are we inside a string or a comment?
  function scanLine(text) {
    let q = null;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '\\') i++;
        else if (c === q) q = null;
      } else if (c === '#') return { str: null, comment: true };
      else if (c === '"' || c === "'") q = c;
    }
    return { str: q, comment: false };
  }
  function stripComment(text) {
    let q = null;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; }
      else if (c === '#') return text.slice(0, i).trimEnd();
      else if (c === '"' || c === "'") q = c;
    }
    return text.trimEnd();
  }

  // Where should `else/elif/except/finally` sit? Under the nearest opener above it.
  function dedentTarget(v, ls, curIndent) {
    let pos = ls, first = true;
    while (pos > 0) {
      const ps = pos >= 2 ? v.lastIndexOf('\n', pos - 2) + 1 : 0;
      const line = v.slice(ps, pos - 1);
      pos = ps;
      if (!line.trim()) continue;
      const ind = line.match(/^[ \t]*/)[0].length;
      if (first) { if (ind !== curIndent) return -1; first = false; if (/:\s*(#.*)?$/.test(line)) return -1; }
      if (ind < curIndent) return /^\s*(if|elif|else|for|while|try|except|finally|with)\b/.test(line) ? ind : -1;
    }
    return -1;
  }

  function createEditor(root, onChange) {
    const ta = root.querySelector('textarea');
    const hl = root.querySelector('.hl');
    const hlCode = hl.querySelector('code');
    const gutter = root.querySelector('.gutter-inner');
    let escapeNext = false;
    let offset = 0;                       // line numbers start at offset + 1

    function render() {
      const v = ta.value;
      hlCode.innerHTML = highlight(v) + '\n';
      const n = v.split('\n').length;
      let nums = '';
      for (let i = 1; i <= n; i++) nums += (offset + i) + '\n';
      gutter.textContent = nums;
      sync();
    }
    // Move the *inner* content, not the clipping container (clipping a moved box hid lines).
    function sync() {
      hlCode.style.transform = 'translate(' + (-ta.scrollLeft) + 'px,' + (-ta.scrollTop) + 'px)';
      gutter.style.transform = 'translateY(' + (-ta.scrollTop) + 'px)';
    }

    // execCommand keeps the native undo stack; setRangeText is the fallback.
    function replace(start, end, text, selStart, selEnd) {
      ta.focus();
      ta.setSelectionRange(start, end);
      let ok = false;
      try {
        ok = text === '' ? document.execCommand('delete') : document.execCommand('insertText', false, text);
      } catch (e) {}
      if (!ok) {
        ta.setRangeText(text, start, end, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (selStart !== undefined) ta.setSelectionRange(selStart, selEnd === undefined ? selStart : selEnd);
    }

    // Rows covered by the selection: [a, endOfLastRow]
    function blockRange(v, s, e) {
      const a = lineStart(v, s);
      let b = e;
      if (e > s && v[e - 1] === '\n') b = e - 1;
      let end = v.indexOf('\n', b); if (end === -1) end = v.length;
      return [a, end];
    }

    function indentLines(dedent) {
      const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      const [a, end] = blockRange(v, s, e);
      let firstDelta = 0, total = 0;
      const out = v.slice(a, end).split('\n').map((ln, i) => {
        if (!dedent) { if (i === 0) firstDelta = 4; total += 4; return '    ' + ln; }
        const m = ln.match(/^( {1,4}|\t)/);
        const r = m ? m[0].length : 0;
        if (i === 0) firstDelta = -r;
        total -= r;
        return ln.slice(r);
      });
      replace(a, end, out.join('\n'), Math.max(a, s + firstDelta), e + total);
    }

    function toggleComment() {
      const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      const [a, end] = blockRange(v, s, e);
      const lines = v.slice(a, end).split('\n');
      const real = lines.filter((l) => l.trim());
      if (!real.length) return;
      const allCommented = real.every((l) => /^\s*#/.test(l));
      const minInd = Math.min(...real.map((l) => l.match(/^[ \t]*/)[0].length));
      let firstDelta = 0, total = 0;
      const out = lines.map((ln, i) => {
        if (!ln.trim()) return ln;
        let r;
        if (allCommented) {
          const m = ln.match(/^([ \t]*)# ?/);
          r = m[1] + ln.slice(m[0].length);
          if (i === 0) firstDelta = r.length - ln.length;
        } else {
          r = ln.slice(0, minInd) + '# ' + ln.slice(minInd);
          if (i === 0) firstDelta = 2;
        }
        total += r.length - ln.length;
        return r;
      });
      replace(a, end, out.join('\n'), Math.max(a, s + firstDelta), e + total);
    }

    function moveLines(dir) {
      const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      const [a, end] = blockRange(v, s, e);
      const block = v.slice(a, end);
      if (dir < 0) {
        if (a === 0) return;
        const ps = lineStart(v, a - 1), prev = v.slice(ps, a - 1);
        const d = prev.length + 1;
        replace(ps, end, block + '\n' + prev, s - d, e - d);
      } else {
        if (end >= v.length) return;
        let ne = v.indexOf('\n', end + 1); if (ne === -1) ne = v.length;
        const next = v.slice(end + 1, ne);
        const d = next.length + 1;
        replace(a, ne, next + '\n' + block, s + d, e + d);
      }
    }

    ta.addEventListener('keydown', (ev) => {
      if (ta.readOnly) return;
      const v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      const mod = ev.ctrlKey || ev.metaKey;
      const key = ev.key;

      if (key === 'Escape') { escapeNext = true; return; }

      if (key === 'Tab' && !mod && !ev.altKey) {
        if (escapeNext) { escapeNext = false; return; }   // let focus leave
        ev.preventDefault();
        const multi = v.slice(s, e).indexOf('\n') !== -1;
        if (ev.shiftKey || multi) { indentLines(ev.shiftKey); return; }
        const col = s - lineStart(v, s);
        replace(s, e, ' '.repeat(4 - (col % 4)));
        return;
      }
      escapeNext = false;

      // Ctrl+] / Ctrl+[ indent, Ctrl+/ comment, Alt+Up/Down move lines
      if (mod && key === ']') { ev.preventDefault(); indentLines(false); return; }
      if (mod && key === '[') { ev.preventDefault(); indentLines(true); return; }
      if (mod && key === '/') { ev.preventDefault(); toggleComment(); return; }
      if (ev.altKey && !mod && (key === 'ArrowUp' || key === 'ArrowDown')) {
        ev.preventDefault(); moveLines(key === 'ArrowUp' ? -1 : 1); return;
      }

      // Smart Home: toggle between first non-blank character and column 0
      if (key === 'Home' && !mod && !ev.shiftKey && !ev.altKey) {
        const ls = lineStart(v, s);
        const firstNonWs = ls + v.slice(ls).match(/^[ \t]*/)[0].length;
        ev.preventDefault();
        const to = s === firstNonWs ? ls : firstNonWs;
        ta.setSelectionRange(to, to);
        return;
      }

      // Enter: keep indent, indent after ':' or an open bracket, dedent after return/break/…,
      // and open a block when pressed between a bracket pair.
      if (key === 'Enter' && !mod && !ev.shiftKey && !ev.altKey) {
        ev.preventDefault();
        const ls = lineStart(v, s);
        const before = v.slice(ls, s);
        let le = v.indexOf('\n', s); if (le === -1) le = v.length;
        const after = v.slice(s, le);
        let indent = before.match(/^[ \t]*/)[0];
        const code = stripComment(before);
        const prevCh = v[s - 1], nextCh = v[s];
        if (e === s && OPEN[prevCh] && OPEN[prevCh] === nextCh) {
          const inner = indent + '    ';
          replace(s, e, '\n' + inner + '\n' + indent, s + 1 + inner.length);
          return;
        }
        if (code.endsWith(':') || /[(\[{]$/.test(code)) indent += '    ';
        else if (/^(return|break|continue|pass|raise)\b/.test(code.trim()) && after.trim() === '') {
          indent = indent.replace(/( {1,4}|\t)$/, '');
        }
        replace(s, e, '\n' + indent);
        return;
      }

      // ':' after else/elif/except/finally snaps the line back under its if/try
      if (key === ':' && !mod && s === e) {
        const ls = lineStart(v, s);
        const before = v.slice(ls, s);
        let le = v.indexOf('\n', s); if (le === -1) le = v.length;
        if (v.slice(s, le).trim() === '' && /^[ \t]+(else|elif\b.*|except\b.*|finally)$/.test(before)) {
          const cur = before.match(/^[ \t]*/)[0].length;
          const target = dedentTarget(v, ls, cur);
          if (target >= 0 && target < cur) {
            ev.preventDefault();
            replace(ls, s, ' '.repeat(target) + before.trim() + ':');
            return;
          }
        }
      }

      // Brackets and quotes: wrap selection, auto-close, type-over, delete pairs
      if (!mod && !ev.altKey) {
        const isQuote = key === '"' || key === "'";
        if (OPEN[key] || isQuote) {
          if (s !== e) {                                   // wrap the selection
            ev.preventDefault();
            const closer = isQuote ? key : OPEN[key];
            replace(s, e, key + v.slice(s, e) + closer, s + 1, e + 1);
            return;
          }
          const ls = lineStart(v, s);
          const st = scanLine(v.slice(ls, s));
          const next = v[s], prev = v[s - 1];
          if (isQuote) {
            if (next === key && st.str === key) { ev.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return; }
            const prefix = /[rRbBuUfF]/.test(prev || '') && !isWord(v[s - 2]);
            if (st.comment || st.str || (isWord(prev) && !prefix) || prev === key || isWord(next)) return;
            ev.preventDefault(); replace(s, e, key + key, s + 1); return;
          }
          if (st.comment || st.str || isWord(next)) return;
          ev.preventDefault(); replace(s, e, key + OPEN[key], s + 1); return;
        }
        if (CLOSE.has(key) && s === e && v[s] === key) {   // type over an auto-inserted closer
          ev.preventDefault(); ta.setSelectionRange(s + 1, s + 1); return;
        }
      }

      if (key === 'Backspace' && s === e && !mod && !ev.altKey) {
        const p = v[s - 1], n = v[s];
        if (p && n && ((OPEN[p] === n) || ((p === '"' || p === "'") && n === p))) {
          ev.preventDefault(); replace(s - 1, s + 1, ''); return;
        }
        const ls = lineStart(v, s);
        const before = v.slice(ls, s);
        if (before.length > 0 && /^ +$/.test(before)) {   // delete back to previous indent stop
          const n2 = before.length % 4 || 4;
          ev.preventDefault();
          replace(s - n2, s, '');
        }
      }
    });

    ta.addEventListener('input', () => { render(); onChange && onChange(); });
    ta.addEventListener('scroll', sync);
    new ResizeObserver(sync).observe(root);
    ta.addEventListener('blur', () => { escapeNext = false; });

    return {
      getValue: () => ta.value,
      setValue(text) { ta.value = text; ta.scrollTop = 0; ta.scrollLeft = 0; render(); },
      setOffset(n) { if (n !== offset) { offset = n; render(); } },
      setReadOnly(on) { ta.readOnly = on; root.classList.toggle('locked', on); },
      focus: () => ta.focus(),
      el: ta,
    };
  }

  window.ApsdsEditor = { create: createEditor, highlight };
})();
