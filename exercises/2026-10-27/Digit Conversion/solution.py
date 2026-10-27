if n == 0:
    print(0)
else:
    digits = ""
    while n > 0:
        digits = str(n % 8) + digits
        n //= 8
    print(digits)
