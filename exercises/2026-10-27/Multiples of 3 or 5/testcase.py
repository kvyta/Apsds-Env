NUM_CASES = 10
TIME_LIMIT = 5


def generate(case, rng):
    fixed = {1: 1, 2: 3, 3: 15}
    if case in fixed:
        n = fixed[case]
    elif case <= 7:
        n = rng.randint(16, 500)
    else:
        n = rng.randint(10_000, 100_000)
    return f"n = {n}"
