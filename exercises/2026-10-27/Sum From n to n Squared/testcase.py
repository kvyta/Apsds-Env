NUM_CASES = 10
TIME_LIMIT = 5


def generate(case, rng):
    if case <= 3:
        n = case
    elif case <= 7:
        n = rng.randint(4, 100)
    else:
        n = rng.randint(1000, 2000)
    return f"n = {n}"
