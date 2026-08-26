import re

with open('apps/web/src/app/category/[slug]/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('backed by State Bank escrow protection.', 'with secure payment protection.')
c = c.replace('Nationwide 24-48h Express Dispatch', 'Nationwide Delivery')

with open('apps/web/src/app/category/[slug]/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
