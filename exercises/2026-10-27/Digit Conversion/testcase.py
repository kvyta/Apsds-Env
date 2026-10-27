NUM_CASES = 10
TIME_LIMIT = 5


def generate(case, rng):
    fixed = {1: 0, 2: 7, 3: 8, 4: 64}
    if case in fixed:
        n = fixed[case]
    elif case <= 7:
        n = rng.randint(9, 5000)
    else:
        n = rng.randint(10**6, 10**9)
    return f"n = {n}"
