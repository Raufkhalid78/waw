"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ChevronRight,
  Upload,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Package,
  Truck,
  HelpCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { ReturnReason, ReturnStatus } from "@waw/types";
import { fetchOrderById, submitOrderReturn } from "@/lib/api";

export default function OrderReturnPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedReason, setSelectedReason] = useState<ReturnReason>(
    ReturnReason.SIZE_OR_FIT_MISMATCH,
  );
  const [comments, setComments] = useState("");
  const [refundPreference, setRefundPreference] = useState<
    "WALLET" | "ORIGINAL_PAYMENT"
  >("ORIGINAL_PAYMENT");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real order data — the API requires `items` (orderItemId + quantity) for
  // every return request; the previous form never sent them so 100% of
  // return attempts failed.
  const [order, setOrder] = useState<any>(null);
  const [orderLoadError, setOrderLoadError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [refundTotalPkr, setRefundTotalPkr] = useState(0);
  const [returnTracking, setReturnTracking] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchOrderById(orderId)
      .then((data) => {
        if (!alive || !data) return;
        setOrder(data);
        const allItems: any[] = (data.store_orders || []).flatMap(
          (so: any) => so.order_items || [],
        );
        // Preselect every item at its delivered quantity.
        const ids = new Set<string>(allItems.map((i: any) => i.id));
        setSelectedItemIds(ids);
        setItemQuantities(
          Object.fromEntries(allItems.map((i: any) => [i.id, i.quantity ?? 1])),
        );
        setPickupCity(data.shipping_city || "");
        setPickupAddress(data.shipping_address || "");
      })
      .catch((err: any) => {
        if (alive) setOrderLoadError(err?.message || "Failed to load the order");
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  const allOrderItems = useMemo<any[]>(
    () => (order?.store_orders || []).flatMap((so: any) => so.order_items || []),
    [order],
  );

  // Refund estimate from the selected items only (server recomputes
  // authoritatively at submission).
  useEffect(() => {
    const total = allOrderItems
      .filter((i) => selectedItemIds.has(i.id))
      .reduce(
        (sum, i) => sum + Number(i.total_price_pkr ?? i.unit_price_pkr ?? 0) * (itemQuantities[i.id] ?? 1),
        0,
      );
    setRefundTotalPkr(total);
  }, [selectedItemIds, itemQuantities, allOrderItems]);

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const setQty = (itemId: string, qty: number, max: number) => {
    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(1, Math.min(max, qty)),
    }));
  };

  const returnReasonsList = [
    {
      key: ReturnReason.SIZE_OR_FIT_MISMATCH,
      label: "Size / Fit Mismatch",
      desc: "The product does not fit as expected or measurement guide was inaccurate.",
    },
    {
      key: ReturnReason.DAMAGED_OR_DEFECTIVE,
      label: "Damaged / Defective Item",
      desc: "Item arrived damaged, torn, broken, or has manufacturing defect.",
    },
    {
      key: ReturnReason.ITEM_NOT_AS_DESCRIBED,
      label: "Item Not As Described",
      desc: "Color, fabric, or specifications differ significantly from catalog listing.",
    },
    {
      key: ReturnReason.CHANGED_MIND,
      label: "Changed Mind / No Longer Needed",
      desc: "Item is unused with original tags intact (eligible within 7 days).",
    },
  ];

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const items = allOrderItems
      .filter((i) => selectedItemIds.has(i.id))
      .map((i) => ({
        orderItemId: i.id,
        quantity: Math.max(1, Math.min(i.quantity ?? 1, itemQuantities[i.id] ?? 1)),
      }));

    if (items.length === 0) {
      setErrorMsg("Select at least one item to return.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await submitOrderReturn(orderId, {
        reason: selectedReason,
        comments,
        refundPreference,
        pickupCity,
        pickupAddress,
        items,
      });

      // Only ever show a tracking number the courier actually issued.
      const trackingCn =
        res.reverseShipment?.reverseTrackingNumber ||
        res.returnRequest?.reverse_courier_cn ||
        null;
      setReturnTracking(trackingCn);
      setStep(4);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit return request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link
          href={`/orders/${orderId}`}
          className="hover:text-amber-600 transition-colors"
        >
          Order {orderId}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">7-Day Return</span>
      </nav>

      {/* ── Top Guarantee Header ────────────────────────────────────────────── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>State Bank Escrow 7-Day Protection</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Easy Doorstep Return & Refund
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Order <strong className="text-amber-400">{orderId}</strong> • PostEx
            Free Doorstep Pickup across Pakistan
          </p>
        </div>

        <div className="shrink-0 bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10 text-right">
          <div className="text-[10px] text-slate-300 font-bold uppercase">
            Est. Refund (Selected Items)
          </div>
          <div className="text-sm font-black text-amber-400 flex items-center gap-1 mt-0.5 justify-end">
            <Clock className="w-4 h-4" />
            <span>PKR {refundTotalPkr.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Wizard Progress Bar ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs font-black">
        <div
          className={`p-2 rounded-xl border ${step >= 1 ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-slate-100 text-slate-400 border-slate-200"}`}
        >
          1. Reason
        </div>
        <div
          className={`p-2 rounded-xl border ${step >= 2 ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-slate-100 text-slate-400 border-slate-200"}`}
        >
          2. Details & Photos
        </div>
        <div
          className={`p-2 rounded-xl border ${step >= 3 ? "bg-amber-400 text-slate-950 border-amber-500" : "bg-slate-100 text-slate-400 border-slate-200"}`}
        >
          3. Pickup & Refund
        </div>
        <div
          className={`p-2 rounded-xl border ${step >= 4 ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-100 text-slate-400 border-slate-200"}`}
        >
          4. PostEx Label
        </div>
      </div>

      {/* ── STEP 1: Select Return Reason ────────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {orderLoadError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {orderLoadError}
            </div>
          ) : !order ? (
            <div className="py-10 text-center text-xs text-slate-400 font-bold">
              Loading your order…
            </div>
          ) : (
            <>
          <div>
            <h3 className="text-lg font-black text-slate-950">
              Which items are you returning?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Choose the items and quantities — the refund covers exactly what
              you send back.
            </p>
          </div>

          <div className="space-y-2">
            {allOrderItems.map((item) => {
              const selected = selectedItemIds.has(item.id);
              const qty = itemQuantities[item.id] ?? 1;
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    selected
                      ? "border-amber-400 bg-amber-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleItem(item.id)}
                    className="accent-amber-500 w-4 h-4"
                  />
                  <Package className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {item.product_title ||
                        item.offer_variants?.seller_offers?.catalog_products?.title ||
                        "Item"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      PKR {Number(item.total_price_pkr ?? item.unit_price_pkr ?? 0).toLocaleString()}
                    </div>
                  </div>
                  {selected && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQty(item.id, qty - 1, item.quantity ?? 1)}
                        className="w-7 h-7 rounded-lg border border-slate-200 font-black text-slate-600 hover:bg-slate-100"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-xs font-black">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(item.id, qty + 1, item.quantity ?? 1)}
                        className="w-7 h-7 rounded-lg border border-slate-200 font-black text-slate-600 hover:bg-slate-100"
                      >
                        +
                      </button>
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-950 text-white px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Estimated Refund
            </span>
            <span className="text-lg font-black text-amber-400">
              PKR {refundTotalPkr.toLocaleString()}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-950">
              Why are you returning {selectedItemIds.size > 1 ? "these items" : "this item"}?
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select the primary reason to expedite your PostEx return approval.
            </p>
          </div>

          <div className="space-y-3">
            {returnReasonsList.map((reason) => (
              <label
                key={reason.key}
                onClick={() => setSelectedReason(reason.key)}
                className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedReason === reason.key
                    ? "border-amber-400 bg-amber-50/50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="returnReason"
                  checked={selectedReason === reason.key}
                  onChange={() => setSelectedReason(reason.key)}
                  className="mt-1 accent-amber-500"
                />
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-slate-900">
                    {reason.label}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {reason.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => selectedItemIds.size > 0 && setStep(2)}
              disabled={selectedItemIds.size === 0}
              className="bg-slate-950 hover:bg-slate-900 disabled:bg-slate-300 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-md text-xs disabled:cursor-not-allowed"
            >
              <span>Continue to Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
            </>
          )}
        </div>
      )}

      {/* ── STEP 2: Details & Evidence ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              Provide Details & Unboxing Proof
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Adding photos helps our escrow team approve returns within 4
              hours.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                Detailed Description (Optional)
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Explain any defects, size problems, or feedback for the seller..."
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-amber-400 text-xs"
              />
            </div>

            {/* Photo Upload Zone */}
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800">
                Upload Product & Tag Photos
              </div>
              <div className="text-[11px] text-slate-400">
                Drag and drop PNG/JPG up to 10MB (Tags & packaging)
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="bg-slate-950 hover:bg-slate-900 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-md text-xs"
            >
              <span>Continue to Pickup & Refund</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Pickup Location & Refund Option ─────────────────────────── */}
      {step === 3 && (
        <form
          onSubmit={handleSubmitReturn}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
        >
          <div>
            <h3 className="text-lg font-black text-slate-950">
              PostEx Doorstep Collection & Refund Method
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              A PostEx courier rider will collect the package from your address.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                Pickup Address in Pakistan
              </label>
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-amber-400 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700">
                Refund Destination
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setRefundPreference("ORIGINAL_PAYMENT")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    refundPreference === "ORIGINAL_PAYMENT"
                      ? "border-amber-400 bg-amber-50/50"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="refund"
                    checked={refundPreference === "ORIGINAL_PAYMENT"}
                    onChange={() => setRefundPreference("ORIGINAL_PAYMENT")}
                    className="accent-amber-500 mr-2"
                  />
                  <span className="font-bold text-slate-900">
                    Original Payment Method / Bank
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Direct refund to your Card, Raast, or JazzCash (2-3 business
                    days).
                  </p>
                </label>

                <label
                  onClick={() => setRefundPreference("WALLET")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    refundPreference === "WALLET"
                      ? "border-amber-400 bg-amber-50/50"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="refund"
                    checked={refundPreference === "WALLET"}
                    onChange={() => setRefundPreference("WALLET")}
                    className="accent-amber-500 mr-2"
                  />
                  <span className="font-bold text-slate-900">
                    Waw Wallet Store Credit (Instant)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Instant store credit credited immediately upon PostEx
                    pickup.
                  </p>
                </label>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 cursor-pointer transition-all shadow-md text-xs"
            >
              <Truck className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? "Booking PostEx Pickup..."
                  : "Confirm Return & Generate PostEx Label"}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 4: Success & PostEx Return Consignment ──────────────────────── */}
      {step === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-black uppercase tracking-widest text-emerald-600">
              Return Request Confirmed
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
              PostEx Doorstep Pickup Scheduled!
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto font-medium">
              Your 7-day return request has been registered in the Return
              ledger. A PostEx pickup rider has been dispatched.
            </p>
          </div>

          {/* Consignment Badge */}
          <div className="bg-slate-50 rounded-2xl p-5 max-w-md mx-auto border border-slate-200 text-left space-y-3">
            {returnTracking ? (
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  PostEx Reverse Tracking #
                </span>
                <span className="font-mono font-black text-slate-950 text-sm bg-amber-400 px-2 py-0.5 rounded-md">
                  {returnTracking}
                </span>
              </div>
            ) : null}

            <div className="text-xs space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">
                  Pickup Courier:
                </span>
                <strong className="font-black text-slate-900">
                  PostEx Express Logistics PK
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">
                  Refund Amount:
                </span>
                <strong className="font-black text-slate-950">
                  PKR {refundTotalPkr.toLocaleString()} (Escrow Protected)
                </strong>
              </div>
            </div>
          </div>

          {returnTracking ? (
            <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
              Reverse tracking <span className="font-mono font-bold text-slate-600">{returnTracking}</span> — live status
              updates will appear on your order page.
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 font-medium max-w-md mx-auto">
              A PostEx courier booking has been queued — your tracking number
              will appear on the order page once the rider is assigned.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href={`/orders/${orderId}`}
              className="bg-slate-950 hover:bg-slate-900 text-white font-black px-6 py-3 rounded-2xl text-xs transition-all shadow-md"
            >
              Return to Order Tracking
            </Link>
            <Link
              href="/"
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-6 py-3 rounded-2xl text-xs transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
