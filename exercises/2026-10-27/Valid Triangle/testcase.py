NUM_CASES = 10
TIME_LIMIT = 5


def generate(case, rng):
    if case == 1:                                  # equilateral
        s = rng.randint(1, 1000)
        sides = [s, s, s]
    elif case == 2:                                # flat: a + b == c
        a, b = rng.randint(1, 400), rng.randint(1, 400)
        sides = [a, b, a + b]
    elif case == 3:                                # clearly too long
        a, b = rng.randint(1, 100), rng.randint(1, 100)
        sides = [a, b, a + b + rng.randint(5, 300)]
    elif case == 4:                                # just barely valid
        a, b = rng.randint(2, 400), rng.randint(2, 400)
        sides = [a, b, a + b - 1]
    else:
        sides = [rng.randint(1, 1000) for _ in range(3)]
    rng.shuffle(sides)
    a, b, c = sides
    return f"a = {a}\nb = {b}\nc = {c}"
