import { create } from "zustand";
import { logger } from "@/lib/logger";
import {
  calculateOrderSummary,
  MARKETPLACE_CONFIG,
  OrderCalculationResult,
  OrderItemPricingInput,
  PaymentMethod,
  SellerType,
} from "@waw/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export interface CartItem {
  productId: string;
  variantId?: string;
  variantName?: string;
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

function getOrCreateGuestToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem("waw_guest_token");
  if (!token) {
    token = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("waw_guest_token", token);
  }
  return token;
}

async function syncCartToServer(items: CartItem[]): Promise<void> {
  try {
    const guestToken = getOrCreateGuestToken();
    if (!guestToken) return;

    // Clear server cart first
    const clearRes = await fetch(`${API_BASE_URL}/api/cart`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestToken }),
    });
    if (!clearRes.ok) throw new Error(`Cart clear failed: ${clearRes.status}`);

    // Add all items
    for (const item of items) {
      const addRes = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestToken,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        }),
      });
      if (!addRes.ok) throw new Error(`Cart add failed: ${addRes.status}`);
    }
  } catch (err) {
    logger.error("Failed to sync cart to server", "CartStore", err);
  }
}

async function loadCartFromServer(): Promise<CartItem[]> {
  try {
    const guestToken = getOrCreateGuestToken();
    if (!guestToken) return [];

    const res = await fetch(
      `${API_BASE_URL}/api/cart?guestToken=${encodeURIComponent(guestToken)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: any) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      title: item.products?.title || "Product",
      pricePkr: item.products?.base_price_pkr || 0,
      quantity: item.quantity,
      sellerType: item.products?.is_first_party
        ? SellerType.FIRST_PARTY
        : SellerType.THIRD_PARTY,
      storeName: item.products?.stores?.name || "Waw Store",
      imageUrl: item.products?.images?.[0] || "",
      storeId: item.products?.store_id,
    }));
  } catch (err) {
    logger.error("Failed to load cart from server", "CartStore", err);
    return [];
  }
}

interface CartStore {
  user: UserProfile | null;
  items: CartItem[];
  wishlist: CartItem[];
  paymentMethod: PaymentMethod;
  selectedCity: string;
  language: "EN" | "UR";
  guestToken: string;
  isSyncing: boolean;
  login: (user: UserProfile) => void;
  logout: () => void;
  setSelectedCity: (city: string) => void;
  setLanguage: (lang: "EN" | "UR") => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string,
  ) => void;
  clearCart: () => void;
  toggleWishlist: (item: CartItem) => void;
  isInWishlist: (productId: string) => boolean;
  setPaymentMethod: (method: PaymentMethod) => void;
  getSummary: () => OrderCalculationResult;
  initGuestCart: () => Promise<void>;
  syncCart: () => Promise<void>;
}

export const useCartStore = create<CartStore>((set, get) => ({
  user: null,
  items: [],
  wishlist: [],
  paymentMethod: PaymentMethod.COD,
  selectedCity: "Lahore",
  language: "EN",
  guestToken: "",
  isSyncing: false,

  login: (user) => {
    set({ user });
    // Sync guest cart to user after login
    const guestToken = get().guestToken;
    if (guestToken) {
      fetch(`${API_BASE_URL}/api/cart/merge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("waw_auth_token") || ""}`,
        },
        body: JSON.stringify({ guestToken }),
      }).catch((err) => logger.error("Failed to merge guest cart on logout", "CartStore", err));
    }
  },
  logout: () => set({ user: null }),

  setSelectedCity: (selectedCity) => set({ selectedCity }),
  setLanguage: (language) => set({ language }),

  initGuestCart: async () => {
    const token = getOrCreateGuestToken();
    set({ guestToken: token });

    // Load cart from server
    const serverItems = await loadCartFromServer();
    if (serverItems.length > 0) {
      set({ items: serverItems });
    }
  },

  syncCart: async () => {
    const { items, guestToken } = get();
    if (!guestToken) return;
    set({ isSyncing: true });
    await syncCartToServer(items);
    set({ isSyncing: false });
  },

  toggleWishlist: (item) =>
    set((state) => {
      const exists = state.wishlist.some((w) => w.productId === item.productId);
      if (exists) {
        return {
          wishlist: state.wishlist.filter(
            (w) => w.productId !== item.productId,
          ),
        };
      }
      return { wishlist: [...state.wishlist, item] };
    }),

  isInWishlist: (productId) =>
    get().wishlist.some((w) => w.productId === productId),

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId,
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === item.productId && i.variantId === item.variantId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, item] };
    });
    // Sync to server in background
    setTimeout(() => get().syncCart(), 100);
  },

  removeItem: (productId, variantId) => {
    set((state) => ({
      items: state.items.filter(
        (i) => !(i.productId === productId && i.variantId === variantId),
      ),
    }));
    setTimeout(() => get().syncCart(), 100);
  },

  updateQuantity: (productId, quantity, variantId) => {
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter(
              (i) => !(i.productId === productId && i.variantId === variantId),
            )
          : state.items.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity }
                : i,
            ),
    }));
    setTimeout(() => get().syncCart(), 100);
  },

  clearCart: () => {
    set({ items: [] });
    setTimeout(() => get().syncCart(), 100);
  },

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
