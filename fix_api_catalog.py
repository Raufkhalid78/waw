import re

with open('apps/web/src/lib/api.ts', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace CATALOG_PRODUCTS in fetchProductById
c = re.sub(r'return CATALOG_PRODUCTS.*?;', 'return undefined;', c)

with open('apps/web/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(c)
