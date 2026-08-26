import re

with open('apps/web/src/lib/api.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = re.sub(r'import \{ CATALOG_PRODUCTS, ProductDetail \} from \'@/data/mockProducts\';', 'import { ProductDetail } from \'@/data/mockProducts\';', c)
c = c.replace('return CATALOG_PRODUCTS;', 'return [];')

with open('apps/web/src/lib/api.ts', 'w', encoding='utf-8') as f:
    f.write(c)
