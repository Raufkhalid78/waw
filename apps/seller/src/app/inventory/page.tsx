"use client";

import { useState, useEffect } from "react";
import { fetchSellerProducts, sellerFetch, SellerProduct } from "@/lib/api";
import {
  Package, AlertTriangle, TrendingUp, TrendingDown,
  RotateCcw, Search, Filter,
} from "lucide-react";

interface InventoryMetrics {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<"restock" | "damage">("restock");
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchSellerProducts();
      const items = data || [];
      setProducts(items);
      const totalStock = items.reduce((s, p) => s + (p.stockQuantity || 0), 0);
      const lowStockCount = items.filter((p) => (p.stockQuantity || 0) > 0 && (p.stockQuantity || 0) <= 5).length;
      const outOfStockCount = items.filter((p) => (p.stockQuantity || 0) === 0).length;
      setMetrics({
        totalProducts: items.length,
        totalStock,
        lowStockCount,
        outOfStockCount,
      });
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async (productId: string) => {
    try {
      await sellerFetch("/api/seller/inventory/adjust", {
        method: "POST",
        body: JSON.stringify({
          product_id: productId,
          adjustment_type: adjustType,
          quantity: adjustType === "damage" ? -adjustQty : adjustQty,
          reason: adjustReason,
        }),
      });
      setAdjustingId(null);
      setAdjustQty(1);
      setAdjustReason("");
      loadProducts();
    } catch (err) {
      console.error("Failed to adjust inventory", err);
      alert("Adjustment failed. The backend may not support this endpoint yet.");
    }
  };

  const filtered = products.filter((p) => {
    const stock = p.stockQuantity || 0;
    if (filter === "low" && (stock === 0 || stock > 5)) return false;
    if (filter === "out" && stock > 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.title?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    }
    return true;
  });

  const getStockColor = (qty: number) => {
    if (qty === 0) return "text-red-500 bg-red-50 border-red-200";
    if (qty <= 5) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Package className="w-6 h-6 text-amber-400" />
          Inventory Management
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track stock levels, restock products, and record damage adjustments
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: metrics.totalProducts, icon: Package, color: "text-blue-400" },
          { label: "Total Stock Units", value: metrics.totalStock, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Low Stock (≤5)", value: metrics.lowStockCount, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Out of Stock", value: metrics.outOfStockCount, icon: TrendingDown, color: "text-red-400" },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl bg-[#0f172a] border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="text-[11px] text-slate-400 font-medium">{m.label}</span>
            </div>
            <span className="text-2xl font-black text-white">{m.value}</span>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 text-xs font-semibold">
          {[
            { key: "all", label: "All Products" },
            { key: "low", label: "Low Stock" },
            { key: "out", label: "Out of Stock" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as "all" | "low" | "out")}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                filter === f.key
                  ? "bg-amber-400 text-slate-950 font-black shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[#0f172a] border border-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-sm">
          No products match your filters.
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-4 py-3 font-bold">Product</th>
                  <th className="text-left px-4 py-3 font-bold">SKU</th>
                  <th className="text-center px-4 py-3 font-bold">Stock</th>
                  <th className="text-right px-4 py-3 font-bold">Price</th>
                  <th className="text-center px-4 py-3 font-bold">Status</th>
                  <th className="text-center px-4 py-3 font-bold">Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((p) => {
                  const stock = p.stockQuantity || 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden shrink-0">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate max-w-[200px]">{p.title}</p>
                            <p className="text-[10px] text-slate-500">{p.categoryName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">{p.sku || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${getStockColor(stock)}`}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-white">
                        PKR {p.basePricePkr?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stock === 0 ? (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">OUT OF STOCK</span>
                        ) : stock <= 5 ? (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">LOW STOCK</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">IN STOCK</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => { setAdjustingId(p.id); setAdjustType("restock"); setAdjustQty(1); setAdjustReason(""); }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-colors"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-black text-gray-900">Adjust Inventory</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setAdjustType("restock")}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  adjustType === "restock"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-1" /> Restock
              </button>
              <button
                onClick={() => setAdjustType("damage")}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  adjustType === "damage"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                }`}
              >
                <TrendingDown className="w-4 h-4 inline mr-1" /> Damage
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">Quantity</label>
              <input
                type="number"
                min="1"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700">Reason (optional)</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder={adjustType === "restock" ? "e.g., New shipment received" : "e.g., Damaged in transit"}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setAdjustingId(null)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdjustment(adjustingId)}
                disabled={adjustQty <= 0}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 ${
                  adjustType === "restock"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                    : "bg-red-500 hover:bg-red-400 text-white"
                }`}
              >
                Confirm {adjustType === "restock" ? "Restock" : "Damage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
