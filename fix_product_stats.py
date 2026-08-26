import re

with open('apps/web/src/lib/api.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'rating: p\.rating_average \|\| p\.ratingAverage \|\| p\.rating \|\| 4\.8,', 'rating: p.rating_average || p.ratingAverage || p.rating || 0,', c)
c = re.sub(r'reviewsCount: p\.rating_count \|\| p\.ratingCount \|\| p\.reviewsCount \|\| 12,', 'reviewsCount: p.rating_count || p.ratingCount || p.reviewsCount || 0,', c)
c = re.sub(r'soldCount: p\.sold_count \|\| p\.soldCount \|\| 45,', 'soldCount: p.sold_count || p.soldCount || 0,', c)
c = re.sub(r"deliveryTime: '2-3 Business Days',", "deliveryTime: 'Standard Delivery',", c)

with open('apps/web/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(c)
