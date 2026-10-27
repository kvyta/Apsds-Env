NUM_CASES = 12
TIME_LIMIT = 5          # seconds per case


def header(rng, n, lo, hi):
    """Short lists are written out; long ones are rebuilt from a seed so the header stays readable."""
    if n <= 12:
        a = [rng.randint(lo, hi) for _ in range(n)]
        return f"n = {n}\na = {a}"
    seed = rng.randrange(10**9)
    return (
        "import random\n"
        f"random.seed({seed})\n"
        f"n = {n}\n"
        f"a = [random.randint({lo}, {hi}) for _ in range(n)]"
    )


def generate(case, rng):
    # Cases 1-3: tiny edge cases. 4-7: medium. 8-10: large (kills O(N^2)).
    if case == 1:
        return header(rng, 1, -1000, 1000)
    if case == 2:
        return header(rng, rng.randint(2, 6), -1000, -1)    # all negative
    if case == 3:
        return header(rng, rng.randint(2, 6), 1, 1000)      # all positive
    if case <= 7:
        return header(rng, rng.randint(13, 500), -1000, 1000)
    return header(rng, rng.randint(50_000, 100_000), -1000, 1000)
