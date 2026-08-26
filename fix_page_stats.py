import re

with open('apps/web/src/app/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'rating: \d\.\d,', 'rating: 0,', c)
c = re.sub(r'reviewsCount: \d+,', 'reviewsCount: 0,', c)
c = re.sub(r'soldCount: \d+,', 'soldCount: 0,', c)
c = re.sub(r'rating: p\.ratingAverage \|\| \d\.\d,', 'rating: p.ratingAverage || 0,', c)
c = re.sub(r'reviewsCount: p\.reviewsCount \|\| \d+,', 'reviewsCount: p.reviewsCount || 0,', c)
c = re.sub(r'soldCount: p\.soldCount \|\| \d+,', 'soldCount: p.soldCount || 0,', c)

with open('apps/web/src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
