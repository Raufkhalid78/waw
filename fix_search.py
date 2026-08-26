import re

with open('apps/web/src/app/search/page.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Replace imports
c = re.sub(r"import \{ CATALOG_PRODUCTS, ProductDetail \} from '@/data/mockProducts';",
           "import { ProductDetail } from '@/data/mockProducts';\nimport { fetchProducts } from '@/lib/api';\nimport { useEffect } from 'react';", c)

# Add state and useEffect inside SearchContent
state_hook = """  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [products, setProducts] = useState<ProductDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProducts({
      q: searchQuery.trim() ? searchQuery : undefined,
      category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
    }).then(data => {
      if (active) {
        setProducts(data);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [searchQuery, selectedCategory]);"""

c = c.replace("  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);", state_hook)

# Replace CATALOG_PRODUCTS in useMemo
c = c.replace("return CATALOG_PRODUCTS.filter((prod) => {", "return products.filter((prod) => {")

# Also add a loading state in the render maybe? No, let it just render empty or skeleton.
# Actually let's add a quick loading spinner if loading.
spinner = """        {/* Grid */}
        {loading ? (
          <div className="w-full flex items-center justify-center py-20 text-slate-400">
            <span className="font-bold text-sm tracking-widest animate-pulse">LOADING PRODUCTS...</span>
          </div>
        ) : filteredProducts.length > 0 ? ("""

c = c.replace("        {/* Grid */}\n        {filteredProducts.length > 0 ? (", spinner)
# If the comment is missing or slightly different, try:
c = c.replace("        {filteredProducts.length > 0 ? (", """        {loading ? (
          <div className="w-full flex items-center justify-center py-20 text-slate-400 animate-pulse">Loading products...</div>
        ) : filteredProducts.length > 0 ? (""")

with open('apps/web/src/app/search/page.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
