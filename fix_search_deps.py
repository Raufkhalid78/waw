import re

with open('apps/web/src/app/search/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('}, [searchQuery, selectedCategory, selectedCity, selectedSellerType, minPrice, maxPrice, minRating, sortBy]);',
              '}, [products, searchQuery, selectedCategory, selectedCity, selectedSellerType, minPrice, maxPrice, minRating, sortBy]);')

with open('apps/web/src/app/search/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
