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

export interface UserProfile {
  id?: string;
  name: string;
  emailOrPhone: string;
  avatarUrl?: string;
}

interface CartStore {
  user: UserProfile | null;
  items: CartItem[];
  wishlist: CartItem[];
  paymentMethod: PaymentMethod;
  selectedCity: string;
  language: 'EN' | 'UR';
  login: (user: UserProfile) => void;
  logout: () => void;
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
  user: null, // Initial unauthenticated state
  items: [
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
      productId: 'prod_wish_1',
      title: 'Khyber Master Artisan Peshawari Norozi Chappal',
      titleUrdu: 'خیبر دستکار نوروزی پشاوری چپل',
      imageUrl: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
      pricePkr: 3800,
      quantity: 1,
      storeId: 'store_khyber_leather',
      sellerType: SellerType.THIRD_PARTY,
      storeName: 'Khyber Leather Craft',
    },
  ],
  paymentMethod: PaymentMethod.RAAST_P2M_QR,
  selectedCity: 'Lahore',
  language: 'EN',

  login: (user) => set({ user }),
  logout: () => set({ user: null }),

  setSelectedCity: (selectedCity) => set({ selectedCity }),
  setLanguage: (language) => set({ language }),

  toggleWishlist: (item) =>
    set((state) => {
      const exists = state.wishlist.some((w) => w.productId === item.productId);
      if (exists) {
        return { wishlist: state.wishlist.filter((w) => w.productId !== item.productId) };
      }
      return { wishlist: [...state.wishlist, item] };
    }),

  isInWishlist: (productId) => get().wishlist.some((w) => w.productId === productId),

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
