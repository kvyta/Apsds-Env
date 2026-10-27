NUM_CASES = 10
TIME_LIMIT = 5
from math import gcd


def generate(case, rng):
    if case == 1:                      # a == b
        a = b = rng.randint(2, 20)
        n = rng.randint(50, 500)
    elif case == 2:                    # one divides the other
        b = rng.randint(2, 10)
        a = b * rng.randint(2, 5)
        n = rng.randint(100, 1000)
    elif case == 3:                    # no answer: lcm > n
        while True:
            a, b = rng.randint(10, 50), rng.randint(10, 50)
            l = a * b // gcd(a, b)
            if l > 30:
                break
        n = rng.randint(max(1, l - 25), l - 1)
    elif case == 4:                    # n exactly a multiple
        a, b = rng.randint(2, 12), rng.randint(2, 12)
        l = a * b // gcd(a, b)
        n = l * rng.randint(1, 20)
    elif case <= 7:
        a, b = rng.randint(1, 30), rng.randint(1, 30)
        n = rng.randint(1, 1000)
    else:
        a, b = rng.randint(1, 50), rng.randint(1, 50)
        n = rng.randint(5000, 10_000)
    return f"a = {a}\nb = {b}\nn = {n}"
