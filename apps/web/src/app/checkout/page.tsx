"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { PaymentMethod, CheckoutQuoteResponse } from "@waw/types";
import { API_BASE_URL } from "@waw/config";
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Lock,
  ArrowLeft,
  AlertCircle,
  X,
  UserPlus,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/Motion";
import { fetchWithCsrf } from "@/lib/csrf";
import { AuthModal } from "@/components/layout/AuthModal";
import { AlfaOnsiteModal } from "@/components/payments/AlfaOnsiteModal";
import {




  fetchCheckoutQuote,
  createOrderApi,
  createGuestOrderApi,
  createUserAddress,
  initiatePaymentApi,
  fetchServiceableCities,
  ServiceableCity,
  fetchCities,
  fetchMarketplaceConfig,
  getApiBaseUrl,
  type City,
  type MarketplaceConfig,
} from "@/lib/api";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, paymentMethod, setPaymentMethod, clearCart, selectedCity } =
    useCartStore();

  const [serviceableCities, setServiceableCities] = useState<ServiceableCity[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [config, setConfig] = useState<MarketplaceConfig | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: selectedCity || "",
    province: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<CheckoutQuoteResponse | null>(
    null,
  );
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountPkr: number;
    description: string;
  } | null>(() => {
    // Restore coupon carried over from the cart page
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("waw-cart-coupon");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.code) return { code: parsed.code, discountPkr: parsed.discountPkr || 0, description: `Promo Code ${parsed.code}` };
        }
      } catch {}
    }
    return null;
  });
  const [voucherError, setVoucherError] = useState("");
  const [guestConfirmation, setGuestConfirmation] = useState<{
    orderNumber: string;
    totalPkr: number;
  } | null>(null);

  // Onsite Bank Alfalah checkout (Alfa Wallet / Alfalah Account) — the
  // buyer completes OTP inside this modal without ever leaving the page.
  const [alfaModal, setAlfaModal] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
    amountPkr: number;
    method: PaymentMethod.ALFA_WALLET | PaymentMethod.ALFALAH_ACCOUNT;
  } | null>(null);

  // Loyalty points
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [useLoyalty, setUseLoyalty] = useState(false);

  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Guest checkout: offer sign-up (with its benefits) but never force it.
  // The choice persists for the browser session so it doesn't nag.
  const [authOpen, setAuthOpen] = useState(false);
  const [guestPromptDismissed, setGuestPromptDismissed] = useState(true);
  // Account buyers: auto-save the delivery address they type (opt-out).
  const [saveAddressChecked, setSaveAddressChecked] = useState(true);

  useEffect(() => {
    try {
      setGuestPromptDismissed(sessionStorage.getItem("waw-guest-checkout-prompt") === "1");
    } catch {}
  }, []);

  const dismissGuestPrompt = () => {
    setGuestPromptDismissed(true);
    try { sessionStorage.setItem("waw-guest-checkout-prompt", "1"); } catch {}
  };

  // After sign-in/sign-up the saved addresses (if any) become available —
  // prefill only when the buyer hasn't typed their details yet.
  const handleAuthSuccess = () => {
    setAuthOpen(false);
    setIsLoggedIn(true);
    setGuestPromptDismissed(true);
    import("@/lib/api").then((api) =>
      api.fetchUserAddresses().then((data) => {
        setSavedAddresses(data);
        setAddressesLoading(false);
        const defaultAddr = data.find((a: any) => a.is_default) || data[0];
        if (defaultAddr && !formData.fullName && !formData.address) {
          setFormData((prev) => ({
            ...prev,
            fullName: defaultAddr.full_name,
            phone: defaultAddr.phone,
            address: defaultAddr.street_address,
            city: defaultAddr.city,
            province: defaultAddr.province,
          }));
        }
      }),
    );
  };

  useEffect(() => {
    import('@/lib/api').then(api => {
      api.fetchUserAddresses().then(data => {
        setSavedAddresses(data);
        setAddressesLoading(false);
        const defaultAddr = data.find(a => a.is_default) || data[0];
        if (defaultAddr) {
          setFormData({
            fullName: defaultAddr.full_name,
            phone: defaultAddr.phone,
            email: "",
            address: defaultAddr.street_address,
            city: defaultAddr.city,
            province: defaultAddr.province,
            notes: ''
          });
        }
      });
    });
  }, []);

  // Check auth session via API instead of cookie sniffing
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/api/auth/session/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsLoggedIn(Boolean(data?.user?.id)))
      .catch(() => setIsLoggedIn(false));
  }, []);

  // Fetch serviceable cities from API
  useEffect(() => {
    fetchServiceableCities()
      .then((cities) => setServiceableCities(cities))
      .catch(() => setServiceableCities([]));
  }, []);

  // When the serviceability list is unavailable the city select falls back to
  // the full city list — show an honest warning instead of silently implying
  // every city is deliverable.
  const serviceabilityUnknown = serviceableCities.length === 0;

  // Fetch cities and config from API
  useEffect(() => {
    fetchCities().then((c) => {
      setCities(c);
      if (!selectedCity && c.length > 0) {
        setFormData((prev) => ({ ...prev, city: c[0].name, province: c[0].province }));
      }
    }).catch(() => {});
    fetchMarketplaceConfig().then(setConfig).catch(() => {});
  }, [selectedCity]);

  // Fetch loyalty balance
  useEffect(() => {
    fetch(`${getApiBaseUrl()}/api/loyalty/balance`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setLoyaltyBalance(data?.points_balance || 0))
      .catch(() => setLoyaltyBalance(0));
  }, []);

  // 1. Fetch Server-Authoritative Quote on Cart / Form change
  useEffect(() => {
    if (items.length === 0) return;

    let isMounted = true;
    async function loadQuote() {
      try {
        setQuoteLoading(true);
        setQuoteError(null);
        const quote = await fetchCheckoutQuote({
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
          shippingCity: formData.city,
          paymentMethod,
          couponCode: appliedVoucher?.code,
          useLoyaltyPoints: useLoyalty,
        });
        if (isMounted) {
          setQuoteData(quote);
          if (quote.couponDiscountPkr > 0 && appliedVoucher) {
            setAppliedVoucher((prev) =>
              prev ? { ...prev, discountPkr: quote.couponDiscountPkr } : null,
            );
          }
        }
      } catch (err: any) {
        if (isMounted)
          setQuoteError(err.message || "Unable to calculate live pricing");
      } finally {
        if (isMounted) setQuoteLoading(false);
      }
    }

    loadQuote();
    return () => {
      isMounted = false;
    };
  }, [items, formData.city, paymentMethod, appliedVoucher, useLoyalty]);

  const handleApplyVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setVoucherError("");
    const code = voucherInput.trim().toUpperCase();

    if (!code) return;
    try {
      const res = await fetchWithCsrf(`${getApiBaseUrl()}/api/checkout/apply-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          couponCode: code,
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Invalid coupon" }));
        setVoucherError(err.error || "Invalid coupon code");
        return;
      }
      const data = await res.json();
      setAppliedVoucher({
        code,
        discountPkr: data.discountPkr || 0,
        description: `Promo Code ${code}`,
      });
      setVoucherInput("");
    } catch {
      setVoucherError("Failed to validate coupon. Try again.");
    }
  };

  const finalTotalPkr = Math.max(0, (quoteData?.totalPkr || 0));
  const subtotalPkr = quoteData?.subtotalPkr || 0;
  const shippingFeePkr = quoteData?.shippingFeePkr || 0;
  const codFeePkr = quoteData?.codFeePkr || 0;
  const discountAmount = quoteData?.couponDiscountPkr || 0;
  const loyaltyDiscount = quoteData?.loyaltyDiscountPkr || 0;

  // Handle loyalty redemption toggle — quote re-fetches with useLoyaltyPoints
  const handleLoyaltyToggle = () => {
    setUseLoyalty(!useLoyalty);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteData?.quoteToken) {
      setQuoteError(
        "Please wait for the live price quote to finish calculating.",
      );
      return;
    }
    if (isSubmitting) return;

    setFormError(null);

    const normalizedPhone = formData.phone.replace(/[\s-]/g, "");
    if (!formData.fullName.trim()) {
      setFormError("Please enter the recipient's full name.");
      return;
    }
    // PK mobile only: 03XXXXXXXXX (11 digits) or +92 3XXXXXXXXX / 923XXXXXXXXX
    const isPkMobile = /^(?:0|92|\+92)?3[0-9]{9}$/.test(normalizedPhone);
    if (!isPkMobile) {
      setFormError("Please enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567).");
      return;
    }
    if (!formData.address?.trim() || formData.address.trim().length < 10) {
      setFormError("Please enter a complete street address (at least 10 characters).");
      return;
    }
    if (!formData.city?.trim()) {
      setFormError("Please select a delivery city.");
      return;
    }

    setIsSubmitting(true);
    setQuoteError(null);

    try {
      // Stable idempotency key per quote: retrying a failed submit after the
      // order WAS created (e.g. payment initiation failed) must replay the
      // same order instead of minting a fresh one per click.
      const idempotencyKey =
        quoteData.quoteToken || crypto.randomUUID();
      const orderPayload = {
        quoteToken: quoteData.quoteToken,
        buyerName: formData.fullName,
        buyerPhone: formData.phone,
        shippingAddress: formData.address,
        shippingCity: formData.city,
        shippingProvince: formData.province,
        paymentMethod,
        notes: formData.notes,
        idempotencyKey,
      };

      const orderResult = isLoggedIn
        ? await createOrderApi(orderPayload)
        : await createGuestOrderApi(orderPayload);

      const orderId = orderResult.orderId;

      // Auto-save delivery details for account buyers so the next checkout
      // pre-fills them. Fire-and-forget — must never fail the order flow.
      if (isLoggedIn && saveAddressChecked && !savedAddresses.some((a: any) => a.street_address === formData.address)) {
        const provinceForSave =
          formData.province || cities.find((c) => c.name === formData.city)?.province || "Punjab";
        createUserAddress({
          full_name: formData.fullName,
          phone: formData.phone,
          street_address: formData.address,
          city: formData.city,
          province: provinceForSave,
        })
          .then(() =>
            import("@/lib/api").then((api) =>
              api.fetchUserAddresses().then((data) => setSavedAddresses(data)),
            ),
          )
          .catch(() => {});
      }

      // - Bank Alfalah APG: onsite wallet/account -
      // No redirect: open the embedded OTP modal instead.
      if (
        paymentMethod === PaymentMethod.ALFA_WALLET ||
        paymentMethod === PaymentMethod.ALFALAH_ACCOUNT
      ) {
        try {
          sessionStorage.setItem(
            "waw-pending-payment-order",
            JSON.stringify({
              orderId,
              orderNumber: orderResult.orderNumber || "",
              totalPkr: orderResult.totalAmountPkr || 0,
              phone: formData.phone,
              createdAt: Date.now(),
            }),
          );
        } catch {}
        setIsSubmitting(false);
        setAlfaModal({
          open: true,
          orderId,
          orderNumber: orderResult.orderNumber || "",
          amountPkr: orderResult.totalAmountPkr || quoteData?.totalPkr || 0,
          method: paymentMethod,
        });
        return;
      }

      // - Bank Alfalah APG: card (hosted page, PCI-mandated redirect) -
      if (paymentMethod === PaymentMethod.ALFA_CARD) {
        try {
          const res = await fetchWithCsrf(
            `${API_BASE_URL}/api/payments/apg/card/checkout`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                orderId,
                customerPhone: formData.phone,
                customerEmail: formData.email || undefined,
              }),
            },
          );
          const card = await res.json().catch(() => ({}));
          if (!res.ok || !card.postUrl) {
            throw new Error(card.error || "Card checkout could not be started");
          }
          // Auto-submit the bank's hosted-page form
          const form = document.createElement("form");
          form.method = "POST";
          form.action = card.postUrl;
          for (const [name, value] of Object.entries(card.fields || {})) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = String(value);
            form.appendChild(input);
          }
          try {
            sessionStorage.setItem(
              "waw-pending-payment-order",
              JSON.stringify({
                orderId,
                orderNumber: orderResult.orderNumber || "",
                totalPkr: orderResult.totalAmountPkr || 0,
                phone: formData.phone,
                createdAt: Date.now(),
              }),
            );
          } catch {}
          document.body.appendChild(form);
          form.submit();
          return;
        } catch (err: any) {
          setIsSubmitting(false);
          setQuoteError(err.message || "Card checkout could not be started.");
          return;
        }
      }

      // - Raast P2M QR (SBP instant payment) -
      if (paymentMethod === PaymentMethod.RAAST_P2M_QR) {
        const paymentSession = await initiatePaymentApi({
          orderId,
          paymentMethod,
          customerPhone: formData.phone,
          returnUrl: `${window.location.origin}/orders/${orderId}`,
        });

        if (paymentSession.qrPayload) {
          // Do NOT clear the cart yet — payment is not confirmed. The cart is
          // cleared only after the payment result page sees the order PAID.
          // Persist the pending order so /payment/result can recover state.
          try {
            sessionStorage.setItem(
              "waw-pending-payment-order",
              JSON.stringify({
                orderId,
                orderNumber: orderResult.orderNumber || "",
                totalPkr: orderResult.totalAmountPkr || 0,
                phone: formData.phone,
                createdAt: Date.now(),
              }),
            );
          } catch {}
          window.location.href = `/payment/raast?order=${encodeURIComponent(orderResult.orderNumber || "")}&payload=${encodeURIComponent(paymentSession.qrPayload)}`;
          return;
        }

        // A digital order without a payment session must NEVER be presented
        // as a completed purchase — the gateway initiation failed (outage or
        // misconfiguration). The order IS saved: show its number and a retry
        // path so the buyer doesn't re-place it (duplicate orders). The cart
        // is intentionally NOT cleared.
        setIsSubmitting(false);
        if (isLoggedIn) {
          setQuoteError(
            "Payment could not be started. Your order is saved — open it to retry payment.",
          );
          router.push(`/orders/${orderId}`);
        } else {
          setGuestConfirmation({
            orderNumber: orderResult.orderNumber || "",
            totalPkr: orderResult.totalAmountPkr || 0,
          });
          setQuoteError(
            `Payment could not be started, but your order ${orderResult.orderNumber || ""} is saved. Contact WhatsApp support with this order number to complete payment.`,
          );
        }
        return;
      }

      // COD or default success — payment state is final at creation time.
      try { sessionStorage.removeItem("waw-cart-coupon"); } catch {}
      clearCart();
      if (isLoggedIn) {
        router.push(`/orders/${orderId}`);
      } else {
        // Guests have no account to view order history — show inline confirmation
        setGuestConfirmation({
          orderNumber: orderResult.orderNumber || "",
          totalPkr: orderResult.totalAmountPkr || 0,
        });
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setQuoteError(
        err.message || "Failed to complete order placement. Please try again.",
      );
      setIsSubmitting(false);
    }
  };
  if (guestConfirmation) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-600">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Order Placed!</h1>
        <p className="text-sm text-slate-500">
          Thank you for shopping with Waw. Your order
          {guestConfirmation.orderNumber ? (
            <> <span className="font-bold text-slate-900">{guestConfirmation.orderNumber}</span></>
          ) : null}
          {guestConfirmation.totalPkr > 0 ? (
            <> totalling <span className="font-bold text-slate-900">PKR {guestConfirmation.totalPkr.toLocaleString()}</span></>
          ) : null}{" "}
          has been confirmed. You&apos;ll receive a WhatsApp confirmation shortly.
        </p>


        {/* Guest conversion: sign-up benefits, never blocking */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 space-y-2 max-w-sm mx-auto text-left">
          <div className="font-black text-sm">Want faster checkout next time?</div>
          <p className="font-medium text-amber-800">
            Create a free account to save your delivery details, track this and
            future orders in one place, and earn loyalty points on everything
            you buy.
          </p>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Create free account
          </button>
        </div>
        <Link
          href="/"
          className="inline-block bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold py-3 px-8 rounded-xl text-sm transition-all cursor-pointer"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">
          Your Cart is Empty
        </h1>
        <p className="text-sm text-slate-500">
          Explore thousands of verified products from top artisans and brands
          across Pakistan.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-500 transition-colors text-xs"
        >
          Return to Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
      {/* ── Breadcrumb & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Cart</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
          <Lock className="w-6 h-6 text-emerald-600" />
          <span>Secure Checkout</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          100% Secure Payments & PostEx Delivery
        </p>
      </div>

      {/* Guest choice: sign in for a faster checkout, or continue as guest.
          Never blocks the form — dismissible for the browser session. */}
      {!isLoggedIn && !guestPromptDismissed && (
        <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 sm:p-6">
          <button
            type="button"
            onClick={dismissGuestPrompt}
            aria-label="Dismiss"
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-amber-100 text-amber-700"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-slate-950" />
            </div>
            <div className="flex-1 pr-8">
              <h3 className="font-black text-sm text-slate-950">
                Sign in for a faster checkout
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-slate-600 font-medium">
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Your saved addresses fill in automatically — no retyping
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Order history, live tracking and easy returns in one place
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Earn loyalty points and check out in one tap next time
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Sign in / Sign up
                </button>
                <button
                  type="button"
                  onClick={dismissGuestPrompt}
                  className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Continue as guest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FadeIn delay={100}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form & Payment (7 Cols) */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-6">
          {/* Shipping Address */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="font-black text-base text-slate-950 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-500" />
              <span>1. Delivery Details (Pakistan)</span>
            </h2>

            {!addressesLoading && savedAddresses.length > 0 && (
              <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
                <label className="text-xs font-bold text-slate-700">Saved Addresses</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {savedAddresses.map((addr: any) => (
                    <button
                      type="button"
                      key={addr.id}
                      onClick={() => {
                        setFormData({
                          fullName: addr.full_name,
                          phone: addr.phone,
                          email: formData.email,
                          address: addr.street_address,
                          city: addr.city,
                          province: addr.province,
                          notes: formData.notes
                        });
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${formData.address === addr.street_address ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-slate-200 hover:border-amber-300'}`}
                    >
                      <div className="font-bold text-sm text-slate-900">{addr.full_name}</div>
                      <div className="text-xs text-slate-600 mt-1 truncate">{addr.street_address}</div>
                      <div className="text-xs text-slate-500">{addr.city}, {addr.province}</div>
                      <div className="text-xs text-slate-500">{addr.phone}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Recipient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  WhatsApp Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+92 300 1234567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Email (optional — for Bank Alfalah payment notifications)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Complete Street Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">City</label>
                <select
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium cursor-pointer"
                >
                  {serviceableCities.length > 0
                    ? serviceableCities.map((c) => (
                        <option key={c.cityName} value={c.cityName}>
                          {c.cityName}
                        </option>
                      ))
                    : cities.length > 0
                      ? cities.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))
                      : <option value="">Select a city</option>
                  }
                </select>
                {serviceabilityUnknown && cities.length > 0 && (
                  <p className="text-[11px] text-amber-700 font-medium">
                    Delivery availability could not be verified right now - we&apos;ll confirm serviceability for your city after you place the order.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Province
                </label>
                <select
                  value={formData.province}
                  onChange={(e) =>
                    setFormData({ ...formData, province: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-medium"
                >
                  {(() => {
                    const provinces = [...new Set(cities.map((c) => c.province).filter(Boolean))];
                    if (provinces.length === 0) {
                      return (
                        <>
                          <option value="Punjab">Punjab</option>
                          <option value="Sindh">Sindh</option>
                          <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                          <option value="Balochistan">Balochistan</option>
                          <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                        </>
                      );
                    }
                    return provinces.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ));
                  })()}
                </select>
              </div>
            </div>

            {/* Account buyers: save the typed address for next time */}
            {isLoggedIn && (
              <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={saveAddressChecked}
                  onChange={(e) => setSaveAddressChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-500"
                />
                <span className="text-xs text-slate-600 font-medium">
                  Save this address to my account for faster checkout next time
                </span>
              </label>
            )}
          </div>

          {/* Payment Selection */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="font-black text-base text-slate-950 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <span>2. State Bank Regulated Payment Options</span>
            </h2>

            <div className="space-y-3">
              {/* Option 1: Bank Alfalah — Alfa Wallet (ONSITE checkout) */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.ALFA_WALLET
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.ALFA_WALLET}
                  onChange={() => setPaymentMethod(PaymentMethod.ALFA_WALLET)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#EC1C24] inline-block" />
                      Alfa Wallet — Bank Alfalah
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Onsite · No Redirect
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pay with your Alfa Wallet — OTP confirmation right here on this page.
                  </p>
                </div>
              </label>

              {/* Option 1b: Bank Alfalah — Bank Account (ONSITE checkout) */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.ALFALAH_ACCOUNT
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.ALFALAH_ACCOUNT}
                  onChange={() => setPaymentMethod(PaymentMethod.ALFALAH_ACCOUNT)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#EC1C24] inline-block" />
                      Alfalah Bank Account
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Onsite · No Redirect
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pay directly from your Alfalah account with an OTAC code on this page.
                  </p>
                </div>
              </label>

              {/* Option 1c: Bank Alfalah — Credit/Debit Card (hosted page) */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.ALFA_CARD
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.ALFA_CARD}
                  onChange={() => setPaymentMethod(PaymentMethod.ALFA_CARD)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#EC1C24] inline-block" />
                      Debit / Credit Card (Visa · Mastercard)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bank Alfalah secure card checkout — you&apos;ll be taken to the bank&apos;s page, then returned here.
                  </p>
                </div>
              </label>

              {/* Option 2: Raast P2M QR (SBP instant payment) */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.RAAST_P2M_QR
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.RAAST_P2M_QR}
                  onChange={() => setPaymentMethod(PaymentMethod.RAAST_P2M_QR)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>Raast QR — Instant Bank Payment</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      0% Fee
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Scan the Raast QR from any Pakistani banking app — instant
                    settlement via State Bank.
                  </p>
                </div>
              </label>

              {/* Option 3: Cash on Delivery */}
              <label
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === PaymentMethod.COD
                    ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === PaymentMethod.COD}
                  onChange={() => setPaymentMethod(PaymentMethod.COD)}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <span>Cash on Delivery (PostEx Rider Collection)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      +PKR 100 Handling
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pay cash directly to the PostEx delivery rider upon parcel
                    inspection.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-3">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Processing Order...</span>
              ) : (
                <span>Confirm Order (PKR {finalTotalPkr.toLocaleString()})</span>
              )}
            </button>
          </div>
        </form>

        {/* Right Column: Order Summary (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <h2 className="font-black text-base text-slate-950 border-b border-slate-100 pb-3">
              Order Summary ({items.length}{" "}
              {items.length === 1 ? "item" : "items"})
            </h2>

            {/* Item Mini List */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className="font-bold text-slate-900 shrink-0">
                      {item.quantity}x
                    </span>
                    <span className="text-slate-700 truncate">
                      {item.title}
                    </span>
                  </div>
                  <span className="font-black text-slate-900 shrink-0">
                    PKR {(item.pricePkr * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Voucher Box */}
            <form
              onSubmit={handleApplyVoucher}
              className="space-y-2 pt-2 border-t border-slate-100"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Promo Code (AZADI2026)"
                  value={voucherInput}
                  onChange={(e) => setVoucherInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-bold outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-colors"
                >
                  Apply
                </button>
              </div>
              {voucherError && (
                <div className="text-[11px] font-bold text-rose-600">
                  {voucherError}
                </div>
              )}
              {appliedVoucher && appliedVoucher.discountPkr > 0 && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 p-2 rounded-lg flex items-center justify-between">
                  <span>✅ {appliedVoucher.description} — PKR {appliedVoucher.discountPkr.toLocaleString()} off</span>
                  <button
                    type="button"
                    onClick={() => setAppliedVoucher(null)}
                    className="text-slate-400 hover:text-slate-600 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}
            </form>

            {/* Breakdown */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs text-slate-600">
              {quoteLoading ? (
                <div className="py-4 text-center text-slate-400 animate-pulse text-xs">
                  Calculating live server quote & PostEx delivery fees...
                </div>
              ) : (
                <>
                  {quoteError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{quoteError}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-slate-900">
                      PKR {subtotalPkr.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>PostEx Express Delivery</span>
                    {shippingFeePkr === 0 ? (
                      <span className="font-black text-emerald-600">
                        FREE (Orders &gt; {(config?.freeDeliveryThresholdPkr ?? 5000).toLocaleString()})
                      </span>
                    ) : (
                      <span className="font-bold text-slate-900">
                        PKR {shippingFeePkr}
                      </span>
                    )}
                  </div>

                  {codFeePkr > 0 && (
                    <div className="flex justify-between text-amber-800">
                      <span>COD Handling Surcharge</span>
                      <span className="font-bold">+PKR {codFeePkr}</span>
                    </div>
                  )}

                  {(quoteData?.gstPkr || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({config?.gstRatePercentage ?? 18}%)</span>
                      <span className="font-bold text-slate-900">
                        PKR {quoteData!.gstPkr.toLocaleString()}
                      </span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Voucher Discount</span>
                      <span>-PKR {discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {loyaltyBalance > 0 && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">⭐ Use Loyalty Points</span>
                        <span className="text-xs text-gray-400">
                          ({loyaltyBalance.toLocaleString()} available)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleLoyaltyToggle}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          useLoyalty ? "bg-amber-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            useLoyalty ? "translate-x-4.5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-amber-700 font-bold">
                      <span>Loyalty Discount</span>
                      <span>-PKR {loyaltyDiscount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline text-sm">
                    <span className="font-black text-slate-950">
                      Total Payable
                    </span>
                    <span className="text-xl font-black text-slate-950">
                      PKR {finalTotalPkr.toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Guarantee Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 space-y-1">
              <div className="font-black flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Secure Payments</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium">
                Your payment is processed securely via our trusted payment
                gateway.
              </p>
            </div>
          </div>
        </div>
      </div>
      </FadeIn>

      {/* ── Bank Alfalah Onsite Checkout (no redirect) ──────────────────── */}
      {alfaModal && (
        <AlfaOnsiteModal
          open={alfaModal.open}
          orderId={alfaModal.orderId}
          orderNumber={alfaModal.orderNumber}
          amountPkr={alfaModal.amountPkr}
          method={alfaModal.method}
          buyerPhone={formData.phone}
          buyerEmail={formData.email}
          onClose={() => {
            setAlfaModal(null);
            if (isLoggedIn) {
              // Keep the pending order — buyer can retry payment from orders page
              router.push(`/orders/${alfaModal.orderId}`);
            } else {
              // Guests have no order history: persist the pending order so
              // /payment/result can resolve it via the guest phone lookup.
              try {
                sessionStorage.setItem(
                  "waw-pending-payment-order",
                  JSON.stringify({
                    orderId: alfaModal.orderId,
                    orderNumber: alfaModal.orderNumber || "",
                    totalPkr: alfaModal.amountPkr || 0,
                    phone: formData.phone,
                    createdAt: Date.now(),
                  }),
                );
              } catch {}
              router.push(
                `/payment/result?order=${encodeURIComponent(alfaModal.orderNumber || "")}`,
              );
            }
          }}
          onPaid={(orderNumber) => {
            setAlfaModal(null);
            try { sessionStorage.removeItem("waw-cart-coupon"); } catch {}
            clearCart();
            router.push(`/payment/result?order=${orderNumber}`);
          }}
        />
      )}

      {/* ── State Bank Raast P2M Dynamic QR Modal ─────────────────────────── */}

      {/* ── Sign in / Sign up (guest checkout option) ──────────────────── */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess} />
    </div>
  );
}


