"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Clock,
  MessageSquare,
  Copy,
  Download,
  ArrowRight,
  ShieldCheck,
  Phone,
  Store,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { fetchOrderById } from "@/lib/api";

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params.id as string) || "WAW-PK-88492";
  const [copied, setCopied] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        const data = await fetchOrderById(orderId);
        setOrder(data);
      } catch (err) {
        console.warn("Could not load order details:", err);
      } finally {
        setLoading(false);
      }
    }
    if (orderId) loadOrder();
  }, [orderId]);

  const handleCopyOrderId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentStatus =
    order?.order_status || order?.orderStatus || "CONFIRMED";

  const trackingNumber =
    order?.tracking_number ||
    order?.store_orders?.[0]?.shipments?.[0]?.tracking_number ||
    order?.shipments?.[0]?.tracking_number ||
    null;

  const steps = [
    {
      title: "Order Confirmed",
      desc: "Payment authorized & order logged into Waw Secure Payments",
      time: order?.created_at
        ? new Date(order.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Just now",
      status: "completed",
    },
    {
      title: "Packed & Quality Verified",
      desc: "Merchant inspected & sealed with Waw tamper-proof tape",
      time: currentStatus === "CONFIRMED" ? "In Progress" : "Completed",
      status: currentStatus === "CONFIRMED" ? "active" : "completed",
    },
    {
      title: "Handed to Courier",
      desc: "Dispatched via PostEx Express Logistics",
      time: trackingNumber ? `CN: ${trackingNumber}` : "Pending",
      status: ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
        currentStatus,
      )
        ? "completed"
        : "upcoming",
    },
    {
      title: "Out for Delivery",
      desc: "Local courier rider assigned for final doorstep drop",
      time: currentStatus === "OUT_FOR_DELIVERY" ? "Out on bike" : "Pending dispatch",
      status: ["OUT_FOR_DELIVERY", "DELIVERED"].includes(currentStatus)
        ? "active"
        : "upcoming",
    },
    {
      title: "Delivered & Completed",
      desc: "Package handed over to recipient",
      time: currentStatus === "DELIVERED" ? "Completed" : "Est. 24-48h",
      status: currentStatus === "DELIVERED" ? "completed" : "upcoming",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Loading order tracking...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Package className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-950">Order Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            We could not find any active or past order with reference <strong className="text-slate-900 font-mono">{orderId}</strong>.
          </p>
        </div>
        <Link
          href="/account"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all shadow-xs"
        >
          <span>View All Orders</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const items =
    order.order_items ||
    order.store_orders?.flatMap((so: any) => so.order_items || []) ||
    [];

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
      {/* ── Breadcrumb Navigation ────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link
          href="/account"
          className="hover:text-amber-600 transition-colors"
        >
          My Orders
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">{order.order_number || orderId}</span>
      </nav>

      {/* ── Top Success Header Banner ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-emerald-200">
                Order {currentStatus.replace(/_/g, " ")}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {currentStatus === "DELIVERED"
                  ? "Order Delivered!"
                  : "Thank You for Your Order!"}
              </h1>
            </div>
          </div>

          {/* Copyable Order Number */}
          <div className="flex items-center gap-2 bg-black/30 backdrop-blur px-4 py-2.5 rounded-2xl border border-white/20 self-start sm:self-auto">
            <span className="text-xs font-mono font-bold">
              {order.order_number || orderId}
            </span>
            <button
              onClick={handleCopyOrderId}
              className="hover:text-amber-300 transition-colors cursor-pointer"
              title="Copy Order ID"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            {copied && (
              <span className="text-[10px] text-amber-300 font-bold">
                Copied!
              </span>
            )}
          </div>
        </div>

        {/* WhatsApp Notification Alert */}
        <div className="flex items-center gap-3 p-3.5 bg-white/10 backdrop-blur rounded-2xl text-xs font-medium border border-white/15">
          <MessageSquare className="w-4 h-4 text-emerald-200 shrink-0" />
          <span>
            Real-time delivery updates, courier tracking link & digital receipt
            have been dispatched via <strong>WhatsApp ({order.buyer_phone})</strong>.
          </span>
        </div>
      </div>

      {/* ── Main Order Grid: Logistics Tracking + Financial Summary ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Logistics Stepper (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-500" />
                  <span>Live Courier Status</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Partner: PostEx Express Logistics PK
                </p>
              </div>
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                {trackingNumber ? `Tracking: ${trackingNumber}` : "Dispatch in Queue"}
              </span>
            </div>

            {/* Stepper Timeline */}
            <div className="space-y-6 pl-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4 relative">
                  {/* Vertical Connecting Line */}
                  {idx < steps.length - 1 && (
                    <div
                      className={`absolute left-3.5 top-8 bottom-0 w-0.5 -mb-6 ${
                        step.status === "completed"
                          ? "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                  )}

                  {/* Step Dot */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 z-10 ${
                      step.status === "completed"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : step.status === "active"
                          ? "bg-amber-400 text-slate-950 ring-4 ring-amber-200 shadow-sm"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  {/* Step Text */}
                  <div className="space-y-0.5 pt-0.5">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-xs sm:text-sm font-black ${
                          step.status === "completed"
                            ? "text-emerald-900"
                            : step.status === "active"
                              ? "text-slate-950"
                              : "text-slate-400"
                        }`}
                      >
                        {step.title}
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400">
                        {step.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>Delivery Address</span>
            </h3>
            <div className="text-xs text-slate-700 font-medium space-y-1">
              <div className="font-bold text-slate-900 text-sm">
                {order.buyer_name || "Recipient"}
              </div>
              <div>{order.shipping_address}, {order.shipping_city}, Pakistan</div>
              <div className="flex items-center gap-1.5 text-slate-500 pt-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{order.buyer_phone} (WhatsApp Verified)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-950 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-5 h-5 text-amber-500" />
              <span>Package Breakdown</span>
            </h2>

            {/* Items List */}
            <div className="space-y-3">
              {items.map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                    {item.product_image || item.image ? (
                      <img
                        src={item.product_image || item.image}
                        alt={item.product_title || item.title || "Item"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {item.product_title || item.title || "Marketplace Product"}
                    </h4>
                    <div className="text-[10px] text-slate-500 font-medium">
                      Qty: {item.quantity || item.qty || 1} • {item.store_name || "Verified Merchant"}
                    </div>
                    <div className="text-xs font-black text-slate-950 mt-0.5">
                      PKR {(item.unit_price_pkr || item.unitPricePkr || item.price || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-slate-900">
                  PKR {(order.subtotal_pkr || order.total_pkr || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="font-bold text-emerald-700">
                  {order.shipping_fee_pkr === 0 ? "FREE (Standard Dispatch)" : `PKR ${order.shipping_fee_pkr}`}
                </span>
              </div>
              {order.cod_fee_pkr > 0 && (
                <div className="flex justify-between">
                  <span>COD Handling Fee</span>
                  <span className="font-bold text-slate-900">
                    PKR {order.cod_fee_pkr}
                  </span>
                </div>
              )}
              {order.coupon_discount_pkr > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon Discount</span>
                  <span className="font-bold">
                    - PKR {order.coupon_discount_pkr}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Payment Mode</span>
                <span className="font-bold text-slate-900">{order.payment_method}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-sm font-black text-slate-950">
                <span>Total Amount</span>
                <span className="text-base text-amber-600">
                  PKR {(order.total_pkr || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Escrow Protected Guarantee */}
            <div className="flex items-center gap-2 p-3 bg-sky-50 text-sky-900 rounded-2xl text-[11px] font-bold border border-sky-200">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                Protected by Waw Buyer Protection until delivery is confirmed.
              </span>
            </div>

            {/* Buttons */}
            <div className="space-y-2 pt-2">
              {currentStatus !== "CANCELLED" && currentStatus !== "RETURN_REQUESTED" && (
                <Link
                  href={`/orders/${orderId}/return`}
                  className="w-full py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>Request Return / Exchange (7-Day Guarantee)</span>
                </Link>
              )}

              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download / Print Receipt</span>
              </button>

              <Link
                href="/"
                className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Continue Shopping</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
