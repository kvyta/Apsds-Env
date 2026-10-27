ans = -1
for x in range(n, 0, -1):
    if x % a == 0 and x % b == 0:
        ans = x
        break
print(ans)
