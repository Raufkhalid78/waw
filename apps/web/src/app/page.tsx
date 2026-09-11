import { Metadata } from 'next';
import { fetchProducts, fetchCategories } from '@/lib/api';
import { logger } from '@/lib/logger';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'WAW - Premium Marketplace Pakistan',
  description: "Shop verified local products with fast nationwide delivery.",
  openGraph: {
    title: 'WAW - Premium Marketplace Pakistan',
    description: "Pakistan's premium online marketplace.",
    type: 'website',
  },
};

export const revalidate = 3600;

export default async function HomePage() {
  let initialProducts: any[] = [];
  let initialCategories: any[] = [];
  const initialContent: any = null;

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      fetchProducts(),
      fetchCategories('en'),
    ]);

    initialProducts = productsRes.items || [];

    const flat = categoriesRes.flatMap((c: any) => [c, ...(c.children || [])]);
    initialCategories = flat.map((c: any) => ({ name: c.name, slug: c.slug }));
  } catch (err) {
    logger.error('Failed to fetch initial home data', 'HomePage', err);
  }

  return (
    <HomeClient
      initialProducts={initialProducts}
      initialCategories={initialCategories}
      initialContent={initialContent}
    />
  );
}
