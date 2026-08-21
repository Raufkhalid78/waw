import { create } from 'zustand';
import { calculateOrderSummary, MARKETPLACE_CONFIG, OrderCalculationResult, OrderItemPricingInput, PaymentMethod, SellerType } from '@waw/types';

export interface CartItem {
  productId: string;
  variantId?: string;
  title: string;
  titleUrdu?: string;
  imageUrl?: string;
  pricePkr: number;
  quantity: number;
  storeId?: string | null;
  sellerType: SellerType;
  storeName?: string;
}

interface CartStore {
  items: CartItem[];
  wishlist: CartItem[];
  paymentMethod: PaymentMethod;
  selectedCity: string;
  language: 'EN' | 'UR';
  setSelectedCity: (city: string) => void;
  setLanguage: (lang: 'EN' | 'UR') => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  toggleWishlist: (item: CartItem) => void;
  isInWishlist: (productId: string) => boolean;
  setPaymentMethod: (method: PaymentMethod) => void;
  getSummary: () => OrderCalculationResult;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [
    // Pre-loaded realistic demo items for quick preview
    {
      productId: 'prod_1',
      title: 'Waw Signature Premium Leather Wallet',
      titleUrdu: 'واو پریمیم چمڑے کا بٹوا',
      imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
      pricePkr: 2499,
      quantity: 1,
      storeId: null,
      sellerType: SellerType.FIRST_PARTY,
      storeName: 'Waw Official Retail',
    },
    {
      productId: 'prod_2',
      title: 'Wireless Noise Cancelling Earbuds (Active Bass)',
      titleUrdu: 'وائرلیس نائز کینسلیشن ائیربڈز',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
      pricePkr: 3200,
      quantity: 1,
      storeId: 'store_lahore_tech',
      sellerType: SellerType.THIRD_PARTY,
      storeName: 'Lahore Tech Hub',
    },
  ],
  wishlist: [
    {
      productId: 'prod_m3',
      title: 'Handmade Traditional Norozi Peshawari Chappal (Pure Mustard Leather)',
      titleUrdu: 'اصلی چمڑے کی روایتی پشاوری چپل',
      imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
      pricePkr: 3800,
      quantity: 1,
      sellerType: SellerType.THIRD_PARTY,
      storeName: 'Khyber Artisans',
    },
  ],
  paymentMethod: PaymentMethod.SAFEPAY_CARD,
  selectedCity: 'Lahore',
  language: 'EN',

  setSelectedCity: (city) => set({ selectedCity: city }),
  setLanguage: (language) => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language === 'UR' ? 'rtl' : 'ltr';
      document.documentElement.lang = language === 'UR' ? 'ur' : 'en';
    }
    set({ language });
  },

  toggleWishlist: (item) =>
    set((state) => {
      const exists = state.wishlist.some((w) => w.productId === item.productId);
      if (exists) {
        return { wishlist: state.wishlist.filter((w) => w.productId !== item.productId) };
      }
      return { wishlist: [...state.wishlist, item] };
    }),

  isInWishlist: (productId) => {
    return get().wishlist.some((w) => w.productId === productId);
  },

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId && i.variantId === item.variantId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, item] };
    }),

  removeItem: (productId, variantId) =>
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.variantId === variantId)
      ),
    })),

  updateQuantity: (productId, quantity, variantId) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => !(i.productId === productId && i.variantId === variantId))
          : state.items.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity }
                : i
            ),
    })),

  clearCart: () => set({ items: [] }),

  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),

  getSummary: () => {
    const { items, paymentMethod } = get();
    const pricingInputs: OrderItemPricingInput[] = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      sellerId: i.storeId,
      sellerType: i.sellerType,
      unitPricePkr: i.pricePkr,
      quantity: i.quantity,
    }));
    return calculateOrderSummary(pricingInputs, paymentMethod);
  },
}));
