import { API_BASE_URL } from "@waw/config";

import { create } from "zustand";
import { logger } from "@/lib/logger";
import { fetchWithCsrf } from "@/lib/csrf";
import { addToWishlist, removeFromWishlist, fetchUserWishlist } from "@/lib/api";
import {
  calculateOrderSummary,
  MARKETPLACE_CONFIG,
  MarketplacePricingOverrides,
  OrderCalculationResult,
  OrderItemPricingInput,
  PaymentMethod,
  SellerType,
} from "@waw/types";


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
    // 24 base36 chars from crypto-quality randomness (~124 bits).
    // Format must match the server's guest token validation:
    // guest_<ms timestamp>_<10-32 base36 chars>
    let rand = "";
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      rand = Array.from(bytes)
        .map((b) => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 24);
    } catch {
      rand = Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14);
    }
    token = `guest_${Date.now()}_${rand}`;
    localStorage.setItem("waw_guest_token", token);
  }
  return token;
}

// - Wishlist persistence (guest fallback + server hydration) -
const WISHLIST_KEY = "waw_wishlist_local";

function loadLocalWishlist(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function persistLocalWishlist(items: CartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  } catch {}
}

/** Map the server wishlist rows (product embed) into CartItem shape. */
function mapServerWishlist(rows: any[]): CartItem[] {
  return (rows || []).map((w: any) => {
    const p = w.product || w.products;
    const activeOffer = (p?.offers || []).find((o: any) => o.status === "ACTIVE");
    return {
      productId: w.product_id,
      title: p?.title || "Product",
      imageUrl: p?.images?.[0] || p?.thumbnail || "",
      pricePkr: Number(activeOffer?.price_pkr ?? p?.price_pkr ?? 0),
      sellerType: "THIRD_PARTY" as SellerType,
      storeName: p?.store?.name || "Waw",
      quantity: 1,
    };
  });
}

async function syncCartToServer(items: CartItem[]): Promise<void> {
  try {
    const isLoggedIn = Boolean(useCartStore.getState().user);
    const guestToken = getOrCreateGuestToken();
    if (!isLoggedIn && !guestToken) return;

    // Atomic cart replacement (fixes race condition from clear-then-add).
    // Logged-in users sync to their user cart (no guestToken needed); the
    // API resolves the cart from the session cookie.
    const res = await fetchWithCsrf(`${API_BASE_URL}/api/cart`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(isLoggedIn ? {} : { guestToken }),
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
      }),
    });
    if (!res.ok) throw new Error(`Cart replace failed: ${res.status}`);
  } catch (err) {
    logger.error("Failed to sync cart to server", "CartStore", err);
  }
}

async function loadCartFromServer(): Promise<CartItem[]> {
  try {
    // Authenticated users get their server cart (cookie-authenticated);
    // guests pass the guestToken. After a login+merge the old guest token
    // maps to a fresh empty cart — the merged items live under the user's
    // cart, which the guest-only fetch could never see.
    const isLoggedIn = Boolean(useCartStore.getState().user);
    const guestToken = getOrCreateGuestToken();
    if (!isLoggedIn && !guestToken) return [];

    const url = isLoggedIn
      ? `${API_BASE_URL}/api/cart`
      : `${API_BASE_URL}/api/cart?guestToken=${encodeURIComponent(guestToken)}`;
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    // The API returns cart_items with NESTED offer_variants → seller_offers
    // → catalog_products/stores (cart.service.ts). The old flat
    // item.products?.* reads never matched, so the server cart always
    // mapped to empty rows.
    return data.items.map((item: any) => {
      const offerVariant = item.offer_variant || {};
      const offer = offerVariant.offer || item.offer || {};
      const catalog = offer.catalog_product || item.catalog_product || {};
      const store = offer.store || item.store || {};
      const pricePkr = Number(
        offer.price_pkr ?? item.unit_price_pkr ?? item.price_pkr ?? 0,
      );
      return {
        productId: item.product_id ?? item.productId,
        variantId: item.variant_id ?? item.variantId,
        variantName: offerVariant.variant_name,
        title: catalog.title || item.title || "Product",
        pricePkr,
        quantity: item.quantity ?? 1,
        sellerType: offer.is_first_party
          ? SellerType.FIRST_PARTY
          : SellerType.THIRD_PARTY,
        storeName: store.name || offer.store_name || "Waw Store",
        imageUrl: catalog.images?.[0] || item.image_url || "",
        storeId: offer.store_id ?? store.id ?? null,
      } as CartItem;
    });
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
  pricingOverrides: MarketplacePricingOverrides | null;
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
  setPricingOverrides: (overrides: MarketplacePricingOverrides | null) => void;
  getSummary: () => OrderCalculationResult;
  initGuestCart: () => Promise<void>;
  syncCart: () => Promise<void>;
}

export const useCartStore = create<CartStore>((set, get) => ({
  user: null,
  items: [],
  wishlist: [],
  paymentMethod: PaymentMethod.COD,
  selectedCity: "",
  language: "EN",
  guestToken: "",
  isSyncing: false,
  pricingOverrides: null,

  login: (user) => {
    set({ user });
    // Sync guest cart to user after login, then reload the MERGED user cart —
    // previously the client kept reading the (now-recreated) guest cart, so
    // items "vanished" right after login.
    const guestToken = get().guestToken;
    const mergeAndReload = async () => {
      try {
        if (guestToken) {
          await fetchWithCsrf(`${API_BASE_URL}/api/cart/merge`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guestToken }),
          });
        }
        const serverItems = await loadCartFromServer();
        set({ items: serverItems.length > 0 ? serverItems : get().items });
      } catch (err) {
        logger.error("Failed to merge/reload cart on login", "CartStore", err);
      }

      // Wishlist: push locally-saved hearts to the server (guest toggles),
      // then hydrate from the authoritative server list so the PDP hearts
      // and the wishlist page agree across devices.
      try {
        const local = get().wishlist;
        if (local.length > 0) {
          await Promise.all(
            local.map((w) => addToWishlist(w.productId).catch(() => {})),
          );
        }
        const serverRows = await fetchUserWishlist().catch(() => []);
        if (serverRows.length > 0) {
          const hydrated = mapServerWishlist(serverRows);
          set({ wishlist: hydrated });
          persistLocalWishlist(hydrated);
        }
      } catch (err) {
        logger.error("Failed to sync wishlist on login", "Wishlist", err);
      }
    };
    void mergeAndReload();
  },
  logout: () => {
    set({ user: null });
    // The synced wishlist is now inaccessible (server list requires the
    // session) — reset the local copy so stale hearts don't linger.
    set({ wishlist: [] });
    persistLocalWishlist([]);
    // Destroy the server session too — clearing client state alone leaves the
    // httpOnly session cookie valid and the buyer fully logged in server-side.
    fetchWithCsrf(`${API_BASE_URL}/api/auth/session/revoke`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    }).catch((err) => logger.error("Failed to revoke session on logout", "CartStore", err));
  },

  setSelectedCity: (selectedCity) => set({ selectedCity }),
  setLanguage: (language) => set({ language }),

  initGuestCart: async () => {
    const token = getOrCreateGuestToken();
    set({ guestToken: token });

    // Hydrate locally-persisted wishlist (hearts survive refresh for guests).
    if (get().wishlist.length === 0) {
      const local = loadLocalWishlist();
      if (local.length > 0) set({ wishlist: local });
    }

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

  toggleWishlist: (item) => {
    const wasInWishlist = get().wishlist.some((w) => w.productId === item.productId);
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
    });
    // Local persistence so hearts survive refresh for guests and logged-out
    // users alike.
    persistLocalWishlist(get().wishlist);

    // Server sync: authenticated users get hearts persisted across sessions
    // and devices; on failure the optimistic local change is reverted so the
    // UI never lies about what the server accepted.
    if (get().user) {
      const serverCall = wasInWishlist
        ? removeFromWishlist(item.productId)
        : addToWishlist(item.productId);
      serverCall.catch((err) => {
        logger.error("Wishlist server sync failed — reverting local change", "Wishlist", err);
        set((state) => ({
          wishlist: wasInWishlist
            ? [...state.wishlist, item]
            : state.wishlist.filter((w) => w.productId !== item.productId),
        }));
        persistLocalWishlist(get().wishlist);
      });
    }
  },

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

  // Store runtime fee config from the server (marketplace_settings) so
  // cart-page display math matches the server-authoritative quote even
  // after an admin changes pricing without a redeploy.
  setPricingOverrides: (pricingOverrides) => set({ pricingOverrides }),

  getSummary: () => {
    const { items, paymentMethod, pricingOverrides } = get();
    const pricingInputs: OrderItemPricingInput[] = items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      sellerId: i.storeId,
      sellerType: i.sellerType,
      unitPricePkr: i.pricePkr,
      quantity: i.quantity,
    }));
    return calculateOrderSummary(
      pricingInputs,
      paymentMethod,
      pricingOverrides?.shippingFeePkr ?? MARKETPLACE_CONFIG.DEFAULT_SHIPPING_FEE_PKR,
      pricingOverrides?.codFeePkr ?? MARKETPLACE_CONFIG.DEFAULT_COD_FEE_PKR,
      0,
      false,
      pricingOverrides ?? undefined,
    );
  },
}));
