"""Runs inside Pyodide (in a Web Worker). Loaded by worker.js.

Contract for an exercise's testcase.py:

    NUM_CASES  = 10        # optional, default 10
    TIME_LIMIT = 5         # optional, seconds per case, default 5

    def generate(case, rng):
        # case: 1..NUM_CASES      rng: a random.Random (use it, not `random`)
        # Return the HEADER: Python source (imports, variables) shown grey and
        # read-only above the student's code, and run before it.
        return "n = 5\\na = [1, 2, 3, 4, 5]"

solution.py is the reference BODY: it uses the header's variables and print()s the answer.
"""
import sys, io, json, time, random, traceback, linecache, builtins

sys.setrecursionlimit(3000)

_gen = None
_seed = 0


def prepare(testcase_src, seed):
    """Load testcase.py. Returns JSON {n, time_limit}."""
    global _gen, _seed
    ns = {"__name__": "testcase"}
    exec(compile(testcase_src, "testcase.py", "exec"), ns)
    if "generate" not in ns:
        raise RuntimeError("testcase.py must define generate(case, rng)")
    _gen = ns["generate"]
    _seed = seed
    n = int(ns.get("NUM_CASES", 10))
    tl = float(ns.get("TIME_LIMIT", 5))
    return json.dumps({"n": n, "time_limit": tl})


def make_header(case):
    rng = random.Random("%s/%s" % (_seed, case))
    data = _gen(case, rng)
    if isinstance(data, (list, tuple)):
        data = "\n".join(str(x) for x in data)
    data = str(data).rstrip("\n")
    return data + "\n" if data else ""


def _format_error(filename):
    etype, err, tb = sys.exc_info()
    while tb is not None and tb.tb_frame.f_code.co_filename != filename:
        tb = tb.tb_next
    text = "".join(traceback.format_exception(etype, err, tb))
    return text.rstrip("\n")


def run_program(code, filename):
    """Run `code` (header + body) as a script. Returns JSON string."""
    linecache.cache[filename] = (len(code), None, code.splitlines(True), filename)
    old = (sys.stdin, sys.stdout, sys.stderr)
    out, errbuf = io.StringIO(), io.StringIO()
    sys.stdin, sys.stdout, sys.stderr = io.StringIO(""), out, errbuf
    error = None
    t0 = time.perf_counter()
    try:
        exec(compile(code, filename, "exec"), {"__name__": "__main__", "__builtins__": builtins})
    except SystemExit:
        pass
    except BaseException:
        error = _format_error(filename)
    finally:
        elapsed = time.perf_counter() - t0
        sys.stdin, sys.stdout, sys.stderr = old
    return json.dumps({
        "stdout": out.getvalue(),
        "stderr": errbuf.getvalue(),
        "error": error,
        "ms": round(elapsed * 1000),
    })
