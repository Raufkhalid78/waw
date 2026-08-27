import { SellerType, StoreStatus } from "@waw/types";

export interface ProductDetail {
  id?: string;
  productId: string;
  title: string;
  titleUrdu?: string;
  slug?: string;
  category: string;
  categorySlug?: string;
  categoryId?: string;
  pricePkr: number;
  originalPricePkr: number;
  discountPercent: number;
  rating: number;
  reviewsCount: number;
  soldCount: number;
  isExpress: boolean;
  sellerType: SellerType;
  storeId?: string;
  storeName: string;
  storeSlug: string;
  sellerCity: string;
  imageUrl?: string;
  images: string[];
  description: string;
  highlights: string[];
  specifications: Record<string, string>;
  inStock: boolean;
  stockCount: number;
  sku: string;
  reviews: {
    id: string;
    author?: string;
    city?: string;
    rating: number;
    date?: string;
    comment?: string;
    verifiedPurchase?: boolean;
    is_verified_purchase?: boolean;
    created_at?: string;
  }[];
}

export interface StoreDetail {
  id?: string;
  slug: string;
  name: string;
  city: string;
  location?: string;
  category?: string;
  rating?: number;
  rating_average?: number;
  ratingAverage?: number;
  reviewsCount?: number;
  rating_count?: number;
  ratingCount?: number;
  salesCount?: number;
  responseRate?: string;
  joinedYear?: string;
  bannerImage?: string;
  banner_url?: string;
  logoImage?: string;
  logo_url?: string;
  about?: string;
  description?: string;
  kycVerified?: boolean;
  is_verified?: boolean;
  isVerified?: boolean;
  status?: StoreStatus | string;
  seller_type?: SellerType;
  sellerType?: SellerType;
  specialties?: string[];
  created_at?: string;
}

