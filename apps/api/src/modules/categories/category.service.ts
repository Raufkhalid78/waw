import { supabaseAdmin } from "../../config/supabase.js";
import { Category } from "../../types/index.js";

// Standard approved baseline taxonomy for reliable initialization & fallback
export const APPROVED_BASELINE_TAXONOMY: Array<{
  id: string;
  name: string;
  nameUrdu: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string;
  description: string;
  descriptionUrdu?: string;
}> = [
  {
    id: "cat_electronics",
    name: "Electronics & Mobility",
    nameUrdu: "الیکٹرانکس اور موبائل",
    slug: "mobiles-tech",
    parentId: null,
    sortOrder: 1,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80",
    description: "Smartphones, ANC audio, wearables and chargers.",
  },
  {
    id: "cat_fashion",
    name: "Fashion & Apparel",
    nameUrdu: "فیشن اور ملبوسات",
    slug: "fashion",
    parentId: null,
    sortOrder: 2,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80",
    description:
      "Women unstitched lawn, festive silk, and ready-to-wear collections.",
  },
  {
    id: "cat_leather",
    name: "Leather Craft & Footwear",
    nameUrdu: "چمڑے کا سامان اور جوتے",
    slug: "leather-craft",
    parentId: null,
    sortOrder: 3,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&auto=format&fit=crop&q=80",
    description:
      "Pure cowhide leather wallets, bags, and handmade traditional footwear.",
  },
  {
    id: "cat_beauty",
    name: "Beauty & Fragrance",
    nameUrdu: "خوبصورتی اور عطر",
    slug: "beauty-fragrance",
    parentId: null,
    sortOrder: 4,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80",
    description:
      "Authentic non-alcoholic attar, pure oud, and grooming essentials.",
  },
  {
    id: "cat_sports",
    name: "Sports & Outdoors",
    nameUrdu: "کھیلوں کا سامان",
    slug: "sialkot-sports",
    parentId: null,
    sortOrder: 5,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&auto=format&fit=crop&q=80",
    description:
      "Sialkot export-grade match footballs, English willow bats and gear.",
  },
  {
    id: "cat_home",
    name: "Home & Living",
    nameUrdu: "گھریلو سجاوٹ اور سامان",
    slug: "home-living",
    parentId: null,
    sortOrder: 6,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300&auto=format&fit=crop&q=80",
    description: "Décor, lighting, bedsheets, and artisan kitchen essentials.",
  },
  {
    id: "cat_heritage",
    name: "Pakistani Heritage & Handmade",
    nameUrdu: "پاکستانی ثقافت اور دستکاری",
    slug: "home-heritage",
    parentId: null,
    sortOrder: 7,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=300&auto=format&fit=crop&q=80",
    description:
      "Multani blue pottery, handmade brass art, and cultural souvenirs.",
  },
  // Subcategories
  {
    id: "cat_audio",
    name: "Audio & Wireless Earbuds",
    nameUrdu: "وائرلیس ایئربڈز اور آڈیو",
    slug: "wireless-earbuds",
    parentId: "cat_electronics",
    sortOrder: 1,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80",
    description: "True wireless earbuds with ANC and deep bass.",
  },
  {
    id: "cat_watches",
    name: "Smart Watches & Wearables",
    nameUrdu: "سمارٹ واچز",
    slug: "smart-watches",
    parentId: "cat_electronics",
    sortOrder: 2,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=300&auto=format&fit=crop&q=80",
    description: "AMOLED display smart watches and health trackers.",
  },
  {
    id: "cat_lawn",
    name: "Women Unstitched & Lawn",
    nameUrdu: "خواتین کے ان سلے لان سوٹ",
    slug: "womens-lawn",
    parentId: "cat_fashion",
    sortOrder: 1,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=300&auto=format&fit=crop&q=80",
    description: "Pure lawn 3-piece embroidered suits.",
  },
  {
    id: "cat_shoes",
    name: "Handmade Peshawari Chappal",
    nameUrdu: "ہاتھ سے بنی پشاوری چپل",
    slug: "peshawari-chappal",
    parentId: "cat_leather",
    sortOrder: 1,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&auto=format&fit=crop&q=80",
    description: "Authentic Norozi and tyre sole Peshawari chappals.",
  },
  {
    id: "cat_attar",
    name: "Pure Attar & Concentrated Oils",
    nameUrdu: "خالص عطر اور پرفیوم آئلز",
    slug: "attar-fragrance",
    parentId: "cat_beauty",
    sortOrder: 1,
    isActive: true,
    imageUrl:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80",
    description: "Long lasting alcohol-free artisan attar.",
  },
];

export class CategoryService {
  /**
   * Retrieves all active categories from Supabase (or structured baseline)
   * and returns a hierarchical tree of root categories with nested children.
   */
  static async getCategoryTree(locale = "en"): Promise<Category[]> {
    let categoriesRaw: any[] = [];

    try {
      const { data, error } = await supabaseAdmin
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        categoriesRaw = data;
      }
    } catch (e) {
      console.warn("Failed to query categories table, using baseline:", e);
    }

    if (categoriesRaw.length === 0) {
      categoriesRaw = APPROVED_BASELINE_TAXONOMY.map((c) => ({
        id: c.id,
        name: c.name,
        name_urdu: c.nameUrdu,
        slug: c.slug,
        parent_id: c.parentId,
        image_url: c.imageUrl,
        description: c.description,
        description_urdu: c.descriptionUrdu,
        sort_order: c.sortOrder,
        is_active: c.isActive,
      }));
    }

    // Map to camelCase Category models
    const allCategories: Category[] = categoriesRaw.map((c) => ({
      id: c.id,
      name: c.name,
      nameUrdu: c.name_urdu || undefined,
      slug: c.slug,
      parentId: c.parent_id || null,
      imageUrl: c.image_url || undefined,
      description: c.description || undefined,
      descriptionUrdu: c.description_urdu || undefined,
      sortOrder: c.sort_order || 0,
      isActive: c.is_active !== false,
      children: [],
    }));

    // Build hierarchy
    const rootCategories: Category[] = [];
    const categoryMap = new Map<string, Category>();

    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, cat);
      categoryMap.set(cat.slug, cat);
    });

    allCategories.forEach((cat) => {
      if (!cat.parentId) {
        rootCategories.push(cat);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(cat);
        } else {
          rootCategories.push(cat);
        }
      }
    });

    return rootCategories;
  }

  /**
   * Resolves a category by slug, returns its details, parent, and immediate children.
   */
  static async getCategoryBySlug(slug: string): Promise<Category | null> {
    const tree = await this.getCategoryTree();
    
    // Find category in tree (recursive)
    function findInTree(categories: Category[]): Category | null {
      for (const cat of categories) {
        if (cat.slug.toLowerCase() === slug.toLowerCase()) {
          return cat;
        }
        if (cat.children && cat.children.length > 0) {
          const found = findInTree(cat.children);
          if (found) return found;
        }
      }
      return null;
    }

    return findInTree(tree);
  }

  /**
   * Returns an array of category IDs representing the given category and all its descendants.
   */
  static async getCategoryDescendantIds(slugOrId: string): Promise<string[]> {
    const tree = await this.getCategoryTree();
    const resultIds: string[] = [];

    function collectIds(cat: Category) {
      resultIds.push(cat.id);
      if (cat.children && cat.children.length > 0) {
        cat.children.forEach(collectIds);
      }
    }

    function searchAndCollect(categories: Category[]): boolean {
      for (const cat of categories) {
        if (
          cat.slug.toLowerCase() === slugOrId.toLowerCase() ||
          cat.id.toLowerCase() === slugOrId.toLowerCase()
        ) {
          collectIds(cat);
          return true;
        }
        if (cat.children && cat.children.length > 0) {
          if (searchAndCollect(cat.children)) return true;
        }
      }
      return false;
    }

    searchAndCollect(tree);

    // Fallback to the slug/id itself if not found in tree
    return resultIds.length > 0 ? resultIds : [slugOrId];
  }
}
