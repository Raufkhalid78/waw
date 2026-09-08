"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

interface PaymentResultState {
  status: "loading" | "paid" | "pending" | "failed" | "cancelled" | "notfound";
  orderNumber: string;
  totalPkr?: number;
}

function StatusIcon({ status }: { status: PaymentResultState["status"] }) {
  switch (status) {
    case "paid":
      return <CheckCircle2 className="w-16 h-16 text-green-500" />;
    case "failed":
      return <XCircle className="w-16 h-16 text-red-500" />;
    case "cancelled":
      return <XCircle className="w-16 h-16 text-slate-400" />;
    case "pending":
      return <Clock className="w-16 h-16 text-amber-500" />;
    default:
      return <Loader2 className="w-16 h-16 text-slate-300 animate-spin" />;
  }
}

function PaymentResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const [state, setState] = useState<PaymentResultState>({
    status: "loading",
    orderNumber: "",
  });

  const orderParam = searchParams.get("order") || "";
  const statusParam = searchParams.get("status");

  const finalize = useCallback(async () => {
    if (!orderParam) {
      setState({ status: "notfound", orderNumber: "" });
      return;
    }

    const API_BASE = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    ).replace(/\/+$/, "");

    // Look up the order by order number (or id) to learn its true payment state.
    try {
      // Try by order id first (works for logged-in buyers), then guest lookup
      // by order number + phone from the pending-payment record.
      const pending = (() => {
        try {
          const raw = sessionStorage.getItem("waw-pending-payment-order");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();

      let res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(orderParam)}`, {
        credentials: "include",
        cache: "no-store",
      });

      let order: any = null;
      if (res.ok) {
        order = await res.json();
      } else if (pending?.phone) {
        // Guest order: orderParam is the order number — ask the public lookup
        res = await fetch(
          `${API_BASE}/api/orders/lookup?orderNumber=${encodeURIComponent(orderParam)}&phone=${encodeURIComponent(pending.phone)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          order = data.order || data;
        }
      }

      if (!order) {
        setState({ status: "notfound", orderNumber: orderParam });
        return;
      }

      const paymentStatus = order.payment_status || "";
      setState({
        status:
          paymentStatus === "PAID" || paymentStatus === "COD_COLLECTED"
            ? "paid"
            : paymentStatus === "FAILED"
              ? "failed"
              : "pending",
        orderNumber: order.order_number || orderParam,
        totalPkr: order.total_amount_pkr,
      });

      // Clear the cart ONLY when payment is confirmed.
      if (paymentStatus === "PAID" || paymentStatus === "COD_COLLECTED") {
        try {
          sessionStorage.removeItem("waw-cart-coupon");
          sessionStorage.removeItem("waw-pending-payment-order");
        } catch {}
        clearCart();
      }
    } catch {
      setState({ status: "pending", orderNumber: orderParam });
    }
  }, [orderParam, clearCart]);

  useEffect(() => {
    finalize();
    // Re-check after a short delay in case the provider webhook is still in flight.
    const t = setTimeout(() => finalize(), 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pending = (() => {
    try {
      const raw = sessionStorage.getItem("waw-pending-payment-order");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const heading =
    state.status === "paid"
      ? "Payment Confirmed!"
      : state.status === "failed"
        ? "Payment Failed"
        : state.status === "cancelled"
          ? "Payment Cancelled"
          : state.status === "pending"
            ? "Confirming your payment…"
            : state.status === "notfound"
              ? "Order Not Found"
              : "Checking payment status…";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-lg p-8 text-center space-y-5">
        <div className="flex justify-center">
          <StatusIcon status={statusParam === "failed" || statusParam === "cancelled" ? statusParam as any : state.status} />
        </div>

        <h1 className="text-2xl font-black text-slate-900">{heading}</h1>

        {state.orderNumber && (
          <p className="text-sm text-slate-500 font-semibold">
            Order <span className="font-mono">{state.orderNumber}</span>
            {typeof state.totalPkr === "number" && state.totalPkr > 0 && (
              <> · PKR {state.totalPkr.toLocaleString()}</>
            )}
          </p>
        )}

        {state.status === "paid" && (
          <p className="text-xs text-slate-500 leading-relaxed">
            We&apos;ve sent your order confirmation to WhatsApp. Your items are
            being prepared for dispatch.
          </p>
        )}

        {(state.status === "pending" || state.status === "loading") && (
          <p className="text-xs text-slate-500 leading-relaxed">
            Your payment is being processed by the provider. This page updates
            automatically — you can also check your order status directly.
          </p>
        )}

        {state.status === "failed" && pending?.orderId && (
          <a
            href={pending ? `/orders/${pending.orderId}` : "/orders"}
            className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-950 text-white text-xs font-black rounded-2xl uppercase tracking-wider"
          >
            Retry Payment <ArrowRight className="w-3.5 h-3.5" />
          </a>
        )}

        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => router.push("/orders")}
            className="px-5 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            View Orders
          </button>
          <button
            onClick={() => router.push("/")}
            className="px-5 py-2.5 bg-[#FFEB00] hover:bg-amber-300 rounded-2xl text-xs font-black text-slate-900"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
