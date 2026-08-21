import Typesense from 'typesense';
import { ENV } from './env.js';

export const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: ENV.TYPESENSE_HOST,
      port: ENV.TYPESENSE_PORT,
      protocol: ENV.TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: ENV.TYPESENSE_API_KEY,
  connectionTimeoutSeconds: 3,
});

export const PRODUCT_SCHEMA = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string' as const },
    { name: 'title', type: 'string' as const },
    { name: 'titleUrdu', type: 'string' as const, optional: true },
    { name: 'description', type: 'string' as const },
    { name: 'slug', type: 'string' as const },
    { name: 'categoryId', type: 'string' as const, facet: true },
    { name: 'storeId', type: 'string' as const, optional: true, facet: true },
    { name: 'isFirstParty', type: 'bool' as const, facet: true },
    { name: 'isFeatured', type: 'bool' as const, facet: true },
    { name: 'isSponsored', type: 'bool' as const, facet: true },
    { name: 'basePricePkr', type: 'int32' as const, facet: true },
    { name: 'ratingAverage', type: 'float' as const, facet: true },
    { name: 'soldCount', type: 'int32' as const },
    { name: 'createdAt', type: 'int64' as const },
  ],
  default_sorting_field: 'soldCount',
};

export async function initTypesenseCollections() {
  try {
    const collections = await typesenseClient.collections().retrieve();
    const exists = collections.some((c) => c.name === 'products');
    if (!exists) {
      await typesenseClient.collections().create(PRODUCT_SCHEMA);
      console.log('✅ Typesense "products" collection initialized');
    }
  } catch (err: any) {
    console.warn('⚠️ Typesense initialization info (skipping if server not yet started):', err.message);
  }
}
