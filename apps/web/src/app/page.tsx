import { Metadata } from 'next';
import { fetchProducts, fetchCategories, fetchContent } from '@/lib/api';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'WAW — Premium Marketplace Pakistan',
  description: 'Shop verified local products with fast nationwide delivery.',
  openGraph: {
    title: 'WAW — Premium Marketplace Pakistan',
    description: 'Pakistan\'s premium online marketplace.',
    type: 'website',
  },
};

export const revalidate = 3600; // Cache for 1 hour

export default async function HomePage() {
  let initialProducts: any[] = [];
  let initialCategories: any[] = [];
  let initialContent: any = null;

  try {
    const [productsRes, categoriesRes, contentRes] = await Promise.all([
      fetchProducts(),
      fetchCategories('en'),
      fetchContent()
    ]);

    initialProducts = productsRes.items || [];
    
    // Flatten categories
    const flat = categoriesRes.flatMap((c: any) => [c, ...(c.children || [])]);
    initialCategories = flat.map((c: any) => ({ name: c.name, slug: c.slug }));

    if (Array.isArray(contentRes)) {
      initialContent = contentRes.find((c: any) => c.key_slug === 'buyer-protection-claim') || null;
    }
  } catch (err) {
    console.error('Failed to fetch initial home data:', err);
  }

  return (
    <HomeClient 
      initialProducts={initialProducts} 
      initialCategories={initialCategories} 
      initialContent={initialContent} 
    />
  );
}


