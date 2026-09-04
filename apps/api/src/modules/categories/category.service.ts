import { supabaseAdmin } from "../../config/supabase.js";
import { redis } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { Category } from "../../types/index.js";

const CATEGORY_CACHE_KEY = "categories:tree";
const CATEGORY_CACHE_TTL = 300; // 5 minutes

export class CategoryService {
  /**
   * Retrieves all active categories from Supabase
   * and returns a hierarchical tree of root categories with nested children.
   * Uses Redis cache with 5-minute TTL.
   */
  static async getCategoryTree(locale = "en"): Promise<Category[]> {
    // Try cache first
    try {
      const cached = await redis.get(CATEGORY_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      logger.warn("Failed to read category cache", { error: (err as Error).message });
    }

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
      logger.warn("Failed to query categories table:", e);
    }

    if (categoriesRaw.length === 0) {
      return [];
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

    // Cache the result
    try {
      await redis.set(CATEGORY_CACHE_KEY, JSON.stringify(rootCategories), { ex: CATEGORY_CACHE_TTL });
    } catch (err) {
      logger.warn("Failed to cache category tree", { error: (err as Error).message });
    }

    return rootCategories;
  }

  /**
   * Invalidates the category tree cache. Call after category CRUD operations.
   */
  static async invalidateCache(): Promise<void> {
    try {
      await redis.del(CATEGORY_CACHE_KEY);
    } catch (err) {
      logger.warn("Failed to invalidate category cache", { error: (err as Error).message });
    }
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
