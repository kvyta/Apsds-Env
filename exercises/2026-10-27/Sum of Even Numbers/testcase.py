NUM_CASES = 10
TIME_LIMIT = 5


def generate(case, rng):
    if case <= 3:
        n = case
    elif case <= 7:
        n = rng.randint(4, 50)
    else:
        n = rng.randint(10_000, 100_000)
    return f"n = {n}"
