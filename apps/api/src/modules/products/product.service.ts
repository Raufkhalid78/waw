import { supabaseAdmin } from '../../config/supabase.js';
import { typesenseClient } from '../../config/typesense.js';

export class ProductService {
  /**
   * Fetches paginated product catalog with category & store filters from Supabase.
   */
  static async listProducts(query: { categoryId?: string; storeId?: string; isFirstParty?: boolean; limit?: number; page?: number }) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dbQuery = supabaseAdmin
      .from('products')
      .select('*, variants:product_variants(*), store:stores(id, name, logo_url, rating_average), category:categories(*)', { count: 'exact' });

    if (query.categoryId) dbQuery = dbQuery.eq('category_id', query.categoryId);
    if (query.storeId) dbQuery = dbQuery.eq('store_id', query.storeId);
    if (query.isFirstParty !== undefined) dbQuery = dbQuery.eq('is_first_party', query.isFirstParty);

    const { data: items, count, error } = await dbQuery
      .order('is_sponsored', { ascending: false })
      .order('sold_count', { ascending: false })
      .range(from, to);

    const total = count || 0;
    return { items: items || [], total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Fetches a product by slug from Supabase.
   */
  static async getProductBySlug(slug: string) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('*, variants:product_variants(*), store:stores(*), category:categories(*), reviews(*)')
      .eq('slug', slug)
      .maybeSingle();

    return product;
  }

  /**
   * Creates a product in Supabase.
   */
  static async createProduct(
    data: {
      storeId?: string | null;
      title: string;
      titleUrdu?: string;
      slug: string;
      description: string;
      pricePkr: number;
      compareAtPricePkr?: number;
      categoryId: string;
      images: string[];
      isFirstParty?: boolean;
      variants?: { sku: string; title: string; pricePkr: number; stock: number }[];
    },
    user?: { id: string; role: string; phone?: string }
  ) {
    // Enforce store ownership check for sellers
    if (user && user.role === 'SELLER') {
      const { data: store } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!store) {
        throw new Error('Seller does not have an active registered store');
      }
      if (data.storeId && store.id !== data.storeId) {
        throw new Error('Unauthorized: Sellers can only create products under their own store');
      }
      data.storeId = store.id;
      data.isFirstParty = false;
    }

    const isFirstParty = data.isFirstParty ?? (data.storeId === null || data.storeId === undefined);

    const { data: product, error } = await supabaseAdmin
      .from('products')
      .insert({
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        store_id: isFirstParty ? null : data.storeId,
        title: data.title,
        title_urdu: data.titleUrdu,
        slug: data.slug,
        description: data.description,
        price_pkr: data.pricePkr,
        compare_at_price_pkr: data.compareAtPricePkr,
        category_id: data.categoryId,
        images: data.images,
        is_first_party: isFirstParty,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Supabase product creation failed: ${error.message}`);

    // Insert variants if provided
    if (data.variants && data.variants.length > 0) {
      const variantInserts = data.variants.map((v) => ({
        id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        product_id: product.id,
        sku: v.sku,
        title: v.title,
        price_pkr: v.pricePkr,
        stock: v.stock,
      }));
      await supabaseAdmin.from('product_variants').insert(variantInserts);
    }

    return product;
  }
}
