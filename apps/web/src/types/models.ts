import { SellerType } from "@waw/types";

export interface ProductDetail {
  productId: string;
  title: string;
  category: string;
  pricePkr: number;
  originalPricePkr: number;
  discountPercent: number;
  rating: number;
  reviewsCount: number;
  soldCount: number;
  isExpress: boolean;
  sellerType: SellerType;
  storeName: string;
  storeSlug: string;
  sellerCity: string;
  images: string[];
  description: string;
  highlights: string[];
  specifications: Record<string, string>;
  inStock: boolean;
  stockCount: number;
  sku: string;
  reviews: {
    id: string;
    author: string;
    city: string;
    rating: number;
    date: string;
    comment: string;
    verifiedPurchase: boolean;
  }[];
}

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
