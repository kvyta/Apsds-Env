NUM_CASES = 10
TIME_LIMIT = 5


def generate(case, rng):
    fixed = {1: 0, 2: 1, 3: -1}
    if case in fixed:
        x = fixed[case]
    elif case <= 6:
        x = rng.randint(2, 1000)
    else:
        x = rng.randint(-1000, -2)
    return f"x = {x}"
