"use client";

import { useState, useEffect } from "react";
import {
  ShoppingBag,
  Truck,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  ExternalLink,
  MapPin,
  Phone,
  Package,
  Download,
} from "lucide-react";
import {
  fetchSellerOrders,
  updateStoreOrderStatus,
  SellerOrder,
} from "../../lib/api";
import { OrderStatus } from "@waw/types";

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  useEffect(() => {
    fetchSellerOrders().then(setOrders);
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesTab =
      selectedTab === "ALL" || order.orderStatus === selectedTab;
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingCity.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: OrderStatus,
  ) => {
    await updateStoreOrderStatus(orderId, newStatus);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, orderStatus: newStatus } : o,
      ),
    );
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, orderStatus: newStatus } : null,
      );
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Store Fulfillment & Sub-Orders
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Pack and manifest courier shipments for items purchased from your
          shop.
        </p>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 text-xs font-semibold">
          {["ALL", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  selectedTab === tab
                    ? "bg-amber-400 text-slate-950 font-black shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search CN, buyer, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                selectedOrder?.id === order.id
                  ? "bg-slate-800/60 border-amber-400/80 shadow-lg"
                  : "bg-[#0f172a] border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-sm">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      order.orderStatus === "DELIVERED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : order.orderStatus === "SHIPPED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                </div>
                <div className="text-xs font-black text-white">
                  PKR {order.sellerPayoutPkr.toLocaleString()}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <div className="text-[10px] text-slate-500">BUYER</div>
                  <div className="text-white font-medium">
                    {order.buyerName} ({order.shippingCity})
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">
                    COURIER TRACKING
                  </div>
                  <div className="text-emerald-400 font-mono flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />{" "}
                    {order.trackingNumber || "Awaiting PostEx Pickup"}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-300">
                {order.items?.map((i) => (
                  <div key={i.id} className="flex justify-between py-0.5">
                    <span>
                      {i.quantity}x {i.productTitle}
                    </span>
                    <span className="font-bold text-white">
                      PKR {i.totalPricePkr.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Selected Order Detailed Action Panel */}
        <div className="sticky top-20 h-fit">
          {selectedOrder ? (
            <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-white text-sm">
                  Fulfillment Actions
                </span>
                <span className="font-mono text-amber-400">
                  {selectedOrder.orderNumber}
                </span>
              </div>

              {/* Delivery Address */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {selectedOrder.shippingCity}, Pakistan
                </div>
                <p className="text-[11px] text-slate-400">
                  {selectedOrder.shippingAddress}
                </p>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {selectedOrder.buyerPhone}
                </div>
              </div>

              {/* Payout Breakdown */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>PKR {selectedOrder.subtotalPkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Waw Platform Take (10%)</span>
                  <span className="text-red-400">
                    - PKR {selectedOrder.commissionPkr.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1.5 border-t border-slate-800">
                  <span>Your Net Payout</span>
                  <span className="text-amber-400">
                    PKR {selectedOrder.sellerPayoutPkr.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* PostEx Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (selectedOrder.trackingNumber) {
                      navigator.clipboard.writeText(selectedOrder.trackingNumber);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Printer className="w-4 h-4 text-amber-400" /> Copy Tracking #
                </button>

                <button
                  onClick={() => {
                    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                    window.open(`${API}/api/orders/${selectedOrder.id}/invoice`, "_blank");
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-amber-400" /> Download Invoice
                </button>

                {selectedOrder.orderStatus === OrderStatus.CONFIRMED && (
                  <button
                    onClick={() =>
                      handleStatusUpdate(selectedOrder.id, OrderStatus.SHIPPED)
                    }
                    className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20"
                  >
                    <Truck className="w-4 h-4" /> Mark Dispatched to Courier
                  </button>
                )}

                {selectedOrder.orderStatus === OrderStatus.SHIPPED && (
                  <button
                    onClick={() =>
                      handleStatusUpdate(
                        selectedOrder.id,
                        OrderStatus.DELIVERED,
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Confirm Delivered
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#0f172a] border border-slate-800 text-center text-slate-500 text-xs">
              Select an order on the left to view packing slips and print PostEx
              labels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
