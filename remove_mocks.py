import re

def clean_api_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # 1. Admin/Seller fallbacks inside catch blocks
    # e.g. catch (err) { console.warn('Using demo...'); return [ ... ]; }
    c = re.sub(r'catch\s*\([^)]*\)\s*\{\s*console\.warn\([^)]*fallback[^)]*\);\s*return\s*\[.*?\];\s*\}', 'catch (err) { throw err; }', c, flags=re.DOTALL)
    
    # 2. Product fallback
    c = re.sub(r'const fallbackProducts: .*?\];', '', c, flags=re.DOTALL)
    c = re.sub(r'if \(!rawItems \|\| rawItems\.length === 0\) return fallbackProducts;', 'if (!rawItems || rawItems.length === 0) return [];', c)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(c)

clean_api_file('apps/admin/src/lib/api.ts')
try:
    clean_api_file('apps/seller/src/lib/api.ts')
except FileNotFoundError:
    pass
