"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getApiBaseUrl, type ApiError } from "@/lib/api";

interface LookupResult {
  order: {
    id: string;
    order_number: string;
    payment_status: string;
    global_status: string;
    total_amount_pkr: number;
    payment_method?: string;
    created_at: string;
  };
}

const STATUS_STEPS = [
  { key: "PENDING", label: "Order Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Packed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

function statusRank(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx;
}

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<LookupResult["order"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/orders/lookup?orderNumber=${encodeURIComponent(
          orderNumber.trim(),
        )}&phone=${encodeURIComponent(phone.replace(/[\s-]/g, ""))}`,
        { cache: "no-store" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (res.status === 404
              ? "No order matches that order number and phone combination."
              : "Could not look up the order right now."),
        );
      }
      setResult(data.order);
    } catch (err: any) {
      setError(err.message || "Lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const currentStep = result ? statusRank(result.global_status) : -1;
  const cancelled = result?.global_status === "CANCELLED";

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <Package className="w-10 h-10 text-amber-500 mx-auto" />
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
          Track Your Order
        </h1>
        <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
          Placed as a guest? Enter your order number (e.g. WAW-260914-12345) and
          the phone number you used at checkout — no account needed.
        </p>
      </div>

      <form
        onSubmit={handleLookup}
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs"
      >
        <div className="space-y-1.5">
          <label htmlFor="orderNumber" className="text-xs font-black text-slate-700 uppercase tracking-wide">
            Order Number
          </label>
          <input
            id="orderNumber"
            type="text"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="WAW-260914-12345"
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-amber-400 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-black text-slate-700 uppercase tracking-wide">
            Phone used at checkout
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 1234567"
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-amber-400 text-sm"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !orderNumber.trim() || !phone.trim()}
          className="w-full bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-black py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Searching…" : "Track Order"}
        </button>
      </form>

      {result && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="font-mono font-black text-slate-950">
                {result.order_number}
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                Placed{" "}
                {new Date(result.created_at).toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-slate-950">
                PKR {Number(result.total_amount_pkr).toLocaleString()}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                {result.payment_status === "PAID" ? "Paid" : result.payment_method === "COD" ? "Cash on Delivery" : "Payment Pending"}
              </div>
            </div>
          </div>

          {cancelled ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-bold text-center">
              This order was cancelled. Contact WhatsApp support if this is unexpected.
            </div>
          ) : (
            <ol className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const done = currentStep >= i;
                const isCurrent = currentStep === i;
                return (
                  <li key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          done
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-100 text-slate-300"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-current" />
                        )}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`w-0.5 flex-1 min-h-[24px] ${
                            currentStep > i ? "bg-emerald-400" : "bg-slate-100"
                          }`}
                        />
                      )}
                    </div>
                    <div className="pb-5">
                      <div
                        className={`text-sm font-bold ${
                          isCurrent ? "text-slate-950" : done ? "text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {step.label}
                        {isCurrent && (
                          <Truck className="w-3.5 h-3.5 inline-block ml-1.5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <p className="text-[11px] text-slate-400 text-center">
            Need help with this order?{" "}
            <Link href="/help" className="text-amber-600 font-bold hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}