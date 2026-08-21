export interface StoreDetail {
  slug: string;
  name: string;
  city: string;
  location: string;
  category: string;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  responseRate: string;
  joinedYear: string;
  bannerImage: string;
  logoImage: string;
  about: string;
  kycVerified: boolean;
  specialties: string[];
}

export const STORES_CATALOG: Record<string, StoreDetail> = {
  'lahore-tech-hub': {
    slug: 'lahore-tech-hub',
    name: 'Lahore Tech Hub',
    city: 'Lahore',
    location: 'Hafeez Centre, Main Boulevard Gulberg, Lahore',
    category: 'Consumer Electronics & Gadgets',
    rating: 4.8,
    reviewsCount: 1840,
    salesCount: 6500,
    responseRate: '99% (Under 15 mins)',
    joinedYear: '2023',
    bannerImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&auto=format&fit=crop&q=80',
    about:
      'Premier electronic accessory distributor located in Hafeez Centre, Lahore. Specializing in high-performance wireless earbuds, GaN fast chargers, AMOLED smartwatches, and verified smartphone gadgets with official local warranty support.',
    kycVerified: true,
    specialties: ['Wireless Audio', '65W Fast Chargers', 'Smart Watches', 'Waw Express Partner'],
  },
  'khyber-artisans': {
    slug: 'khyber-artisans',
    name: 'Khyber Artisans',
    city: 'Peshawar',
    location: 'Namak Mandi Bazaar, Peshawar, KPK',
    category: 'Handcrafted Heritage Footwear',
    rating: 5.0,
    reviewsCount: 920,
    salesCount: 3100,
    responseRate: '98% (Under 30 mins)',
    joinedYear: '2022',
    bannerImage: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80',
    about:
      'Master craftsmen preserving the 100-year traditional heritage of authentic Peshawari Norozi and Zalmi chappals. Every pair is cut and stitched by hand from pure full-grain cow leather with durable recycled tyre rubber soles.',
    kycVerified: true,
    specialties: ['Norozi Double Sole', 'Zalmi Chappal', 'Mustard Cow Leather', 'Custom Sizing'],
  },
  'waw-official-hub': {
    slug: 'waw-official-hub',
    name: 'Waw Official Hub',
    city: 'Islamabad',
    location: 'Waw Central Fulfillment Center, Islamabad',
    category: '1P Direct Flagship Store',
    rating: 4.9,
    reviewsCount: 4200,
    salesCount: 18500,
    responseRate: '100% (Instant)',
    joinedYear: '2021',
    bannerImage: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://images.unsplash.com/photo-1606503829059-86644f1c93a0?w=200&auto=format&fit=crop&q=80',
    about:
      "Waw's direct retail arm, managing centralized 1P inventory, next-day nationwide dispatch, premium signature leather goods, and certified electronics under SBP-regulated consumer protection.",
    kycVerified: true,
    specialties: ['Next-Day Waw Express', 'Full-Grain Wallets', '7-Day Instant Returns', '2-Year Warranty'],
  },
  'sialkot-sports-direct': {
    slug: 'sialkot-sports-direct',
    name: 'Sialkot Sports Direct',
    city: 'Sialkot',
    location: 'Small Industrial Estate, Sialkot, Punjab',
    category: 'Export Grade Sporting Goods',
    rating: 4.9,
    reviewsCount: 650,
    salesCount: 2800,
    responseRate: '97% (Under 1 hr)',
    joinedYear: '2023',
    bannerImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=200&auto=format&fit=crop&q=80',
    about:
      'Direct factory outlet from the world capital of football manufacturing. Producing FIFA Pro grade thermally bonded match balls, English willow cricket bats, and professional sports equipment.',
    kycVerified: true,
    specialties: ['Thermally Bonded Footballs', 'English Willow Bats', 'Export Certified', 'Direct Factory Price'],
  },
  'royal-fragrances': {
    slug: 'royal-fragrances',
    name: 'Royal Fragrances',
    city: 'Karachi',
    location: 'Tariq Road Perfume Plaza, Karachi, Sindh',
    category: 'Oriental Perfumes & Pure Attar',
    rating: 4.9,
    reviewsCount: 480,
    salesCount: 1600,
    responseRate: '99% (Under 20 mins)',
    joinedYear: '2024',
    bannerImage: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1200&auto=format&fit=crop&q=80',
    logoImage: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=200&auto=format&fit=crop&q=80',
    about:
      'Artisanal perfumers crafting 100% non-alcoholic oriental concentrated attar oils and fine luxury perfumes using Cambodian agarwood, royal Taif rose, and crystalline amber.',
    kycVerified: true,
    specialties: ['Pure Agarwood Oudh', 'Non-Alcoholic Attar', 'Long-Lasting Projection', 'Halal Certified'],
  },
};

export function getStoreBySlug(slug: string): StoreDetail | undefined {
  return STORES_CATALOG[slug] || STORES_CATALOG['lahore-tech-hub'];
}
