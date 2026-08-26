"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Package,
  MapPin,
  CreditCard,
  Bell,
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  Plus,
  ShieldCheck,
  Phone,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { fetchUserOrders } from "@/lib/api";

function getStatusBadge(status: string) {
  switch (status) {
    case "CONFIRMED":
    case "PROCESSING":
      return {
        label: "Processing",
        color: "bg-blue-50 text-blue-900 border-blue-200",
      };
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return {
        label: "In Transit with PostEx",
        color: "bg-amber-50 text-amber-900 border-amber-200",
      };
    case "DELIVERED":
      return {
        label: "Delivered",
        color: "bg-emerald-50 text-emerald-900 border-emerald-200",
      };
    case "RETURN_REQUESTED":
      return {
        label: "Return Requested",
        color: "bg-purple-50 text-purple-900 border-purple-200",
      };
    case "CANCELLED":
      return {
        label: "Cancelled",
        color: "bg-rose-50 text-rose-900 border-rose-200",
      };
    default:
      return {
        label: status,
        color: "bg-slate-50 text-slate-900 border-slate-200",
      };
  }
}

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<
    "orders" | "addresses" | "payments" | "settings"
  >("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("waw_user");
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (e) {
          // ignore
        }
      }
    }

    async function loadOrders() {
      try {
        const data = await fetchUserOrders();
        setOrders(data);
      } catch (err) {
        console.error("Failed to load user orders:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  const totalSpent = orders.reduce(
    (sum, o) => sum + (Number(o.total_pkr) || 0),
    0,
  );

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
      {/* ── Breadcrumb Navigation ────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">My Account</span>
      </nav>

      {/* ── User Profile Header Card ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-3xl bg-slate-950 text-amber-400 font-black text-2xl flex items-center justify-center shadow-md shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "WA"}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                {user?.name || user?.fullName || "Waw Customer"}
              </h1>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-black">
                ★ Waw Verified Buyer
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {user?.email || "customer@waw.pk"} • {user?.phone || "+92 300 1234567"} • Primary City:{" "}
              <strong className="text-slate-900">{user?.city || "Pakistan"}</strong>
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="text-center">
            <div className="text-xl font-black text-slate-950">{orders.length}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Total Orders
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-emerald-600">
              PKR {totalSpent > 1000 ? `${(totalSpent / 1000).toFixed(1)}k` : totalSpent.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">
              Total Spent
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          { key: "orders", label: "Order History & Tracking", icon: Package },
          { key: "addresses", label: "Saved Addresses", icon: MapPin },
          {
            key: "payments",
            label: "Payment Wallets & Cards",
            icon: CreditCard,
          },
          { key: "settings", label: "WhatsApp Alerts & Security", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black whitespace-nowrap transition-all border-b-2 -mb-0.5 cursor-pointer ${
                activeTab === tab.key
                  ? "border-amber-500 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Order History ─────────────────────────────────────────── */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-950">No Past Orders Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You haven&apos;t placed any orders yet. Discover authentic artisan products handcrafted across Pakistan.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-xs transition-all"
              >
                <span>Start Shopping</span>
              </Link>
            </div>
          ) : (
            orders.map((ord) => {
              const badge = getStatusBadge(ord.order_status);
              const items =
                ord.order_items ||
                ord.store_orders?.flatMap((so: any) => so.order_items || []) ||
                [];

              return (
                <div
                  key={ord.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4"
                >
                  {/* Order Meta Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-950">
                            {ord.order_number || ord.id}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Placed on{" "}
                          {new Date(ord.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          • {ord.payment_method}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right sm:block">
                        <div className="text-base font-black text-slate-950">
                          PKR {(ord.total_pkr || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {ord.shipping_fee_pkr === 0 ? "Free Delivery" : `Shipping: PKR ${ord.shipping_fee_pkr}`}
                        </div>
                      </div>

                      <Link
                        href={`/orders/${ord.id}`}
                        className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Track Live</span>
                      </Link>
                    </div>
                  </div>

                  {/* Order Items List */}
                  {items.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {items.map((item: any, idx: number) => (
                        <div
                          key={item.id || idx}
                          className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100"
                        >
                          <div className="w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400">
                            {item.product_image || item.image ? (
                              <img
                                src={item.product_image || item.image}
                                alt={item.product_title || item.title || "Product"}
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
                              Qty: {item.quantity || item.qty || 1}
                            </div>
                            <div className="text-xs font-black text-slate-950 mt-0.5">
                              PKR {(item.unit_price_pkr || item.unitPricePkr || item.price || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab 2: Saved Addresses ───────────────────────────────────────── */}
      {activeTab === "addresses" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 shadow-xs space-y-3 relative">
            <span className="absolute top-4 right-4 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
              PRIMARY DEFAULT
            </span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-sm text-slate-950">
                Home Residence
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              House 42, Street 8, Phase 5, DHA, Lahore, Punjab, 54000
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold pt-2 border-t border-slate-100">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>+92 300 1234567</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <h3 className="font-black text-sm text-slate-950">
                Office / Workplace
              </h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Level 4, Arfa Software Technology Park, Ferozepur Road, Lahore,
              54600
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold pt-2 border-t border-slate-100">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>+92 321 9876543</span>
            </div>
          </div>

          <button className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-3xl p-6 text-center flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-900 transition-all cursor-pointer bg-slate-50/50 min-h-[160px]">
            <Plus className="w-6 h-6 text-amber-500" />
            <span className="text-xs font-black">Add New Address</span>
          </button>
        </div>
      )}

      {/* ── Tab 3: Payment Methods ───────────────────────────────────────── */}
      {activeTab === "payments" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-950">
                  State Bank Raast Instant ID
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Linked
              </span>
            </div>
            <p className="font-mono text-sm font-black text-slate-900">
              03001234567@raast
            </p>
            <p className="text-[11px] text-slate-500">
              Zero surcharge fee on all nationwide marketplace purchases.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm text-slate-950">
                  Debit / Credit Card (HBL)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Primary
              </span>
            </div>
            <p className="font-mono text-sm font-black text-slate-900">
              •••• •••• •••• 4892 (Visa)
            </p>
            <p className="text-[11px] text-slate-500">
              Secured by 3D-Secure OTP verification.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab 4: Settings & Alerts ─────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 max-w-2xl">
          <h3 className="text-base font-black text-slate-950">
            Communication & Privacy
          </h3>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="font-bold text-slate-900">
                  WhatsApp Dispatch & Delivery Receipts
                </div>
                <div className="text-slate-500">
                  Get courier tracking links and digital invoices on +92 300
                  1234567
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="font-bold text-slate-900">
                  Flash Deal & Price Drop Notifications
                </div>
                <div className="text-slate-500">
                  Receive alerts when saved wishlist items go on discount
                </div>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
