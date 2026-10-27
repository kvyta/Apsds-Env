NUM_CASES = 10


def balanced(rng, pairs):
    """A random balanced string with `pairs` bracket pairs."""
    kinds = ["()", "[]", "{}"]
    out, stack, left = [], [], pairs
    while left or stack:
        if left and (not stack or rng.random() < 0.55):
            k = rng.choice(kinds)
            out.append(k[0])
            stack.append(k[1])
            left -= 1
        else:
            out.append(stack.pop())
    return "".join(out)


def corrupt(rng, s):
    """Change, drop or add one bracket (almost always unbalanced afterwards)."""
    if not s:
        return rng.choice("([{)]}")
    s = list(s)
    i = rng.randrange(len(s))
    mode = rng.randint(0, 2)
    if mode == 0:
        s[i] = rng.choice("()[]{}")
    elif mode == 1:
        del s[i]
    else:
        s.insert(i, rng.choice("()[]{}"))
    return "".join(s)


def generate(case, rng):
    if case == 1:
        return 's = ""'
    if case <= 7:                         # short random strings, about half corrupted
        s = balanced(rng, rng.randint(1, 12))
        if case % 2 == 0 or rng.random() < 0.3:
            s = corrupt(rng, s)
        return f"s = {s!r}".replace("'", '"')
    k = rng.randint(20_000, 50_000)       # large, written as expressions
    if case == 8:
        return f's = "([{{" * {k} + "}}])" * {k}'                      # balanced
    if case == 9:
        return f's = "(" * {k} + ")" * {k} + ")"'                      # one closer too many
    return f's = "(" * {k} + "[" + "]" + ")" * {k - 1} + "]"'           # mismatch at the very end
