import { prisma } from '../../config/supabase.js';
import { typesenseClient } from '../../config/typesense.js';

export class ProductService {
  /**
   * Fetches paginated product catalog with category & store filters.
   */
  static async listProducts(query: { categoryId?: string; storeId?: string; isFirstParty?: boolean; limit?: number; page?: number }) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.storeId) where.storeId = query.storeId;
    if (query.isFirstParty !== undefined) where.isFirstParty = query.isFirstParty;

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: true,
          store: {
            select: { id: true, name: true, logoUrl: true, ratingAverage: true },
          },
          category: true,
        },
        skip,
        take: limit,
        orderBy: [{ isSponsored: 'desc' }, { soldCount: 'desc' }],
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Fetches a product by slug or ID.
   */
  static async getProductBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        variants: true,
        store: true,
        category: true,
        reviews: {
          include: { buyer: { select: { fullName: true, avatarUrl: true } } },
          take: 10,
        },
      },
    });
  }

  /**
   * Creates a product (either 1P Waw item or 3P Marketplace vendor listing).
   */
  static async createProduct(data: {
    storeId?: string | null;
    categoryId: string;
    title: string;
    titleUrdu?: string;
    slug: string;
    description: string;
    descriptionUrdu?: string;
    basePricePkr: number;
    compareAtPricePkr?: number;
    costPricePkr?: number;
    images: string[];
    isFirstParty?: boolean;
    variants?: { sku: string; title: string; pricePkr: number; stockQuantity: number; attributes: any }[];
  }) {
    const product = await prisma.product.create({
      data: {
        storeId: data.storeId || null,
        categoryId: data.categoryId,
        title: data.title,
        titleUrdu: data.titleUrdu,
        slug: data.slug,
        description: data.description,
        descriptionUrdu: data.descriptionUrdu,
        basePricePkr: data.basePricePkr,
        compareAtPricePkr: data.compareAtPricePkr,
        costPricePkr: data.costPricePkr,
        images: data.images,
        isFirstParty: data.isFirstParty ?? !data.storeId,
        variants: {
          create: data.variants || [],
        },
      },
      include: { variants: true },
    });

    // Sync to Typesense
    try {
      await typesenseClient.collections('products').documents().upsert({
        id: product.id,
        title: product.title,
        titleUrdu: product.titleUrdu || '',
        description: product.description,
        slug: product.slug,
        categoryId: product.categoryId,
        storeId: product.storeId || '',
        isFirstParty: product.isFirstParty,
        isFeatured: product.isFeatured,
        isSponsored: product.isSponsored,
        basePricePkr: product.basePricePkr,
        ratingAverage: product.ratingAverage,
        soldCount: product.soldCount,
        createdAt: Math.floor(product.createdAt.getTime() / 1000),
      });
    } catch (err: any) {
      console.warn('⚠️ Typesense sync deferred:', err.message);
    }

    return product;
  }
}
