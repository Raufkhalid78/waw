"use client";

import { useState, useEffect } from "react";
import { statsApi, type AdminStats } from "@/lib/api";
import { BarChart3, ShoppingCart, Package, Store, DollarSign, RefreshCw } from "lucide-react";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await statsApi.get();
        setStats(data);
      } catch (err) {
        console.error("Failed to load stats", err);
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

  if (!stats) return null;

  const cards = [
    { label: "Gross Merchandise Value", value: `PKR ${stats.gmvPkr.toLocaleString()}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), icon: ShoppingCart, color: "bg-blue-50 text-blue-600" },
    { label: "Active Sellers", value: stats.totalSellers.toLocaleString(), icon: Store, color: "bg-purple-50 text-purple-600" },
    { label: "Total Products", value: stats.totalProducts.toLocaleString(), icon: Package, color: "bg-amber-50 text-amber-600" },
    { label: "Platform Commissions", value: `PKR ${stats.totalCommissionsPkr.toLocaleString()}`, icon: DollarSign, color: "bg-green-50 text-green-600" },
    { label: "COD Fees Collected", value: `PKR ${stats.codFeesCollectedPkr.toLocaleString()}`, icon: DollarSign, color: "bg-orange-50 text-orange-600" },
    { label: "Net Platform Revenue", value: `PKR ${stats.netPlatformRevenuePkr.toLocaleString()}`, icon: DollarSign, color: "bg-sky-50 text-sky-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Platform performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.slice(0, 4).map((c, i) => (
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.slice(4).map((c, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{c.value}</div>
              <div className="text-xs text-gray-500 font-medium">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Breakdown</h2>
        <div className="space-y-3">
          {[
            { label: "GMV", value: stats.gmvPkr, color: "bg-gray-900" },
            { label: "Commissions", value: stats.totalCommissionsPkr, color: "bg-emerald-500" },
            { label: "COD Fees", value: stats.codFeesCollectedPkr, color: "bg-amber-500" },
            { label: "Net Revenue", value: stats.netPlatformRevenuePkr, color: "bg-blue-500" },
          ].map((item) => {
            const pct = stats.gmvPkr > 0 ? (item.value / stats.gmvPkr) * 100 : 0;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span className="font-mono text-gray-500">PKR {item.value.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
