"use client";

import { useState, useEffect } from "react";
import { fetchSellerAnalytics, type SellerAnalytics } from "@/lib/api";
import { BarChart3, ShoppingCart, Package, DollarSign, Store } from "lucide-react";

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSellerAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const cards = [
    { label: "Total Revenue", value: `PKR ${analytics.totalRevenuePkr.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Orders", value: analytics.totalOrders.toLocaleString(), icon: ShoppingCart, color: "bg-blue-50 text-blue-600" },
    { label: "Active Products", value: analytics.activeProducts.toLocaleString(), icon: Package, color: "bg-purple-50 text-purple-600" },
    { label: "Pending Payouts", value: `PKR ${analytics.pendingPayoutsPkr.toLocaleString()}`, icon: DollarSign, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{c.value}</div>
              <div className="text-xs text-gray-500 font-medium">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Performance Summary</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">Average Order Value</span>
            <span className="text-sm font-bold text-gray-900">
              PKR {analytics.totalOrders > 0 ? Math.round(analytics.totalRevenuePkr / analytics.totalOrders).toLocaleString() : "0"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">Revenue per Product</span>
            <span className="text-sm font-bold text-gray-900">
              PKR {analytics.activeProducts > 0 ? Math.round(analytics.totalRevenuePkr / analytics.activeProducts).toLocaleString() : "0"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-sm text-gray-600">Pending Payout Ratio</span>
            <span className="text-sm font-bold text-gray-900">
              {analytics.totalRevenuePkr > 0 ? Math.round((analytics.pendingPayoutsPkr / analytics.totalRevenuePkr) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm text-gray-600">Store Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              analytics.storeStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}>
              {analytics.storeStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
