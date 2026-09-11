import { supabaseAdmin } from "../../config/supabase.js";
import { typesenseClient } from "../../config/typesense.js";
import { logger } from "../../config/logger.js";

/**
 * Typesense catalog sync.
 *
 * Central mapper + backfill for the `products` search collection. Previously
 * documents were only upserted one-at-a-time from the queue worker (with a
 * partial field set and no backfill), so the index silently drifted from
 * Postgres. This module:
 *   1. Maps a catalog row to the exact PRODUCT_SCHEMA document shape.
 *   2. Reconciles the whole index from Postgres (upsert current, delete stale).
 */

export interface ProductSyncInput {
  id: string;
  title: string;
  titleUrdu?: string | null;
  description?: string | null;
  slug?: string | null;
  categoryId?: string | null;
  storeId?: string | null;
  isFirstParty?: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
  basePricePkr?: number;
  ratingAverage?: number;
  soldCount?: number;
  createdAt?: string;
}

export interface TypesenseProductDoc {
  id: string;
  title: string;
  titleUrdu: string;
  description: string;
  slug: string;
  categoryId: string;
  storeId: string;
  isFirstParty: boolean;
  isFeatured: boolean;
  isSponsored: boolean;
  basePricePkr: number;
  ratingAverage: number;
  soldCount: number;
  createdAt: number;
}

/** Maps a DB row / queue payload to the exact PRODUCT_SCHEMA shape. */
export function buildProductDocument(p: ProductSyncInput): TypesenseProductDoc {
  const createdAt =
    typeof p.createdAt === "string" && p.createdAt
      ? Math.floor(new Date(p.createdAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000);

  return {
    id: p.id,
    title: p.title || "Untitled",
    titleUrdu: p.titleUrdu || "",
    description: p.description || "",
    slug: p.slug || "",
    categoryId: p.categoryId || "",
    storeId: p.storeId || "waw-1p",
    isFirstParty: Boolean(p.isFirstParty),
    isFeatured: Boolean(p.isFeatured),
    isSponsored: Boolean(p.isSponsored),
    basePricePkr: Math.round(p.basePricePkr ?? 0),
    ratingAverage: Number(p.ratingAverage ?? 0),
    soldCount: Number(p.soldCount ?? 0),
    createdAt,
  };
}

const PAGE_SIZE = 100;
const SOLD_COUNT_RPC_LIMIT = 5000;

/** product_id -> units_sold for ranking (best-sellers keep meaningful counts). */
async function buildSoldCountMap(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const since = new Date();
    since.setFullYear(since.getFullYear() - 1); // trailing 12 months
    const { data } = await supabaseAdmin.rpc("aggregate_product_sales", {
      since_date: since.toISOString(),
      result_limit: SOLD_COUNT_RPC_LIMIT,
    });
    for (const row of data || []) {
      map.set(row.product_id, Number(row.units_sold) || 0);
    }
  } catch (err: any) {
    logger.warn("⚠️ Typesense sold-count RPC failed (defaulting to 0):", err?.message);
  }
  return map;
}

interface IndexedCatalogRow {
  catalog_product: {
    id: string;
    title: string;
    title_urdu?: string | null;
    slug?: string | null;
    description?: string | null;
    category_id?: string | null;
    rating_average?: number | null;
    created_at?: string | null;
  };
  store: {
    id: string;
    seller_type?: string;
  };
  price_pkr?: number;
}

/** Normalizes a Supabase many-to-one join (array or single object) to an object. */
function pick<T>(val: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(val)) return val[0];
  return (val as T) ?? undefined;
}

/** Fetches all active catalog products (via their best active offer + store). */
async function fetchAllIndexedRows(): Promise<IndexedCatalogRow[]> {
  const rows: IndexedCatalogRow[] = [];
  const from = { value: 0 };

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("seller_offers")
      .select(`
        price_pkr,
        catalog_product:catalog_products!inner(
          id, title, title_urdu, slug, description, category_id, rating_average, created_at
        ),
        store:stores!inner(id, seller_type)
      `, { count: "exact" })
      .eq("status", "ACTIVE")
      .eq("catalog_product.is_active", true)
      .order("price_pkr", { ascending: true })
      .range(from.value, from.value + PAGE_SIZE - 1);

    if (error) throw new Error(`Typesense reconcile query failed: ${error.message}`);
    const page = data || [];
    for (const raw of page) {
      const cp = pick(raw.catalog_product);
      const store = pick(raw.store);
      if (!cp) continue;
      rows.push({
        catalog_product: cp,
        store: store || { id: "" },
        price_pkr: raw.price_pkr,
      });
    }
    if (page.length < PAGE_SIZE) break;
    from.value += PAGE_SIZE;
  }

  // Keep only the cheapest active offer per catalog product (best listing).
  const bestPerProduct = new Map<string, IndexedCatalogRow>();
  for (const row of rows) {
    const productId = row.catalog_product?.id;
    if (!productId) continue;
    if (!bestPerProduct.has(productId)) bestPerProduct.set(productId, row);
  }
  return Array.from(bestPerProduct.values());
}

async function existingIndexedIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  let page = 1;
  try {
    while (page <= 100) {
      const result: any = await typesenseClient
        .collections("products")
        .documents()
        .search({ q: "*", query_by: "title", per_page: 250, page, include_fields: "id" });
      const hits = result?.hits || [];
      for (const h of hits) ids.add(h.document?.id);
      if (hits.length < 250) break;
      page += 1;
    }
  } catch (err: any) {
    // Collection may not exist yet — treat as empty, not an error.
    logger.warn("⚠️ Typesense existing-id scan failed (treating as empty):", err?.message);
  }
  return ids;
}

export interface ReconcileReport {
  indexed: number;
  staleDeleted: number;
  failed: number;
  collectionEnsured: boolean;
  timestamp: string;
}

/** Full reconcile: upsert current catalog docs, delete stale ones. */
export async function reconcileTypesenseIndex(): Promise<ReconcileReport> {
  const report: ReconcileReport = {
    indexed: 0,
    staleDeleted: 0,
    failed: 0,
    collectionEnsured: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // Ensure the collection exists (idempotent — matches initTypesenseCollections).
    const collections = await typesenseClient.collections().retrieve();
    if (!collections.some((c: any) => c.name === "products")) {
      const { PRODUCT_SCHEMA } = await import("../../config/typesense.js");
      await typesenseClient.collections().create(PRODUCT_SCHEMA);
    }
    report.collectionEnsured = true;

    const [rows, soldCounts] = await Promise.all([
      fetchAllIndexedRows(),
      buildSoldCountMap(),
    ]);

    const docs = rows.map((row) => {
      const cp = row.catalog_product || {};
      const store = pick(row.store) ?? ({} as IndexedCatalogRow["store"]);
      return buildProductDocument({
        id: cp.id,
        title: cp.title,
        titleUrdu: cp.title_urdu ?? undefined,
        description: cp.description ?? undefined,
        slug: cp.slug ?? undefined,
        categoryId: cp.category_id ?? undefined,
        storeId: store.id,
        isFirstParty: store.seller_type === "FIRST_PARTY",
        isFeatured: false,
        isSponsored: false,
        basePricePkr: row.price_pkr,
        ratingAverage: cp.rating_average ?? undefined,
        soldCount: soldCounts.get(cp.id) || 0,
        createdAt: cp.created_at ?? undefined,
      });
    });

    // Upsert current docs in batches.
    for (let i = 0; i < docs.length; i += PAGE_SIZE) {
      const batch = docs.slice(i, i + PAGE_SIZE);
      try {
        await typesenseClient
          .collections("products")
          .documents()
          .import(batch, { action: "upsert" });
        report.indexed += batch.length;
      } catch (err: any) {
        report.failed += batch.length;
        logger.error("⚠️ Typesense import batch failed:", err?.message);
      }
    }

    // Delete docs no longer in the catalog (stale removal).
    const currentIds = new Set(docs.map((d) => d.id));
    const existingIds = await existingIndexedIds();
    const staleIds = Array.from(existingIds).filter((id) => !currentIds.has(id));
    for (let i = 0; i < staleIds.length; i += PAGE_SIZE) {
      const chunk = staleIds.slice(i, i + PAGE_SIZE);
      try {
        await typesenseClient
          .collections("products")
          .documents()
          .delete({ filter_by: `id:=[${chunk.join(",")}]` });
        report.staleDeleted += chunk.length;
      } catch (err: any) {
        logger.warn("⚠️ Typesense stale-doc delete failed:", err?.message);
      }
    }

    logger.info(
      `✅ Typesense reconcile complete: ${report.indexed} indexed, ` +
        `${report.staleDeleted} stale deleted, ${report.failed} failed`,
    );
  } catch (err: any) {
    logger.error("❌ Typesense reconcile failed:", err?.message || err);
    throw err;
  }

  return report;
}
