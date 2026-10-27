NUM_CASES = 10
TIME_LIMIT = 5


def generate(case, rng):
    fixed = {1: 2023, 2: 2024, 3: 1900, 4: 2000}
    if case in fixed:
        y = fixed[case]
    elif case == 5:
        y = rng.choice([1700, 1800, 2100, 2200, 2300])      # century, not leap
    elif case == 6:
        y = rng.choice([1600, 2400, 2800])                   # century, leap
    else:
        y = rng.randint(1583, 2999)
    return f"year = {y}"
