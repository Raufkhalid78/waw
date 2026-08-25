'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Package,
  Truck,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Tag,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { fetchSellerOrders, fetchSellerStore, fetchSellerProducts, SellerOrder, SellerStore, SellerProduct } from '../lib/api';
import { OrderStatus } from '@waw/types';

export default function SellerDashboardPage() {
  const [store, setStore] = useState<SellerStore | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [s, o, p] = await Promise.all([
        fetchSellerStore(),
        fetchSellerOrders(),
        fetchSellerProducts(),
      ]);
      setStore(s);
      setOrders(o);
      setProducts(p);
      setLoading(false);
    }
    loadData();
  }, []);

  const totalGrossPkr = orders.reduce((sum, o) => sum + o.subtotalPkr, 0);
  const netEarningsPkr = orders.reduce((sum, o) => sum + o.sellerPayoutPkr, 0);
  const pendingShipments = orders.filter(o => o.orderStatus === OrderStatus.CONFIRMED).length;

  return (
    <div className="space-y-8">
      {/* ── Welcome Banner ────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Welcome back, {store?.name || 'Seller'}!
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Store ID: <span className="font-mono text-amber-400">{store?.id}</span> • Multi-Vendor Split Dispatch Active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/products/bulk-upload"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
          >
            Bulk CSV Upload
          </Link>
          <Link
            href="/orders"
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-colors"
          >
            Fulfill Orders ({pendingShipments})
          </Link>
        </div>
      </div>

      {/* ── Guided Merchant Onboarding Checklist ──────────────────── */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Merchant Launch Checklist</h2>
              <p className="text-xs text-slate-400">Complete these steps to ensure smooth dispatch and weekly payouts.</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400">
            {products.length > 0 ? '4/4 Completed' : '3/4 Completed'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">1. Store Profile</div>
              <div className="text-[11px] text-slate-400">Name & warehouse city registered</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">2. CNIC & Business</div>
              <div className="text-[11px] text-slate-400">Verified for multi-vendor selling</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">3. Payout Channel</div>
              <div className="text-[11px] text-slate-400">Bank account / Raast ID active</div>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl bg-slate-900/80 border flex items-start gap-3 ${products.length > 0 ? 'border-emerald-500/30' : 'border-amber-500/40 bg-amber-500/5'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${products.length > 0 ? 'bg-emerald-500 text-slate-950' : 'bg-amber-400 text-slate-950 font-black text-[10px]'}`}>
              {products.length > 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '4'}
            </div>
            <div>
              <div className="text-xs font-bold text-white">4. Add Products</div>
              <div className="text-[11px] text-slate-400">
                {products.length > 0 ? `${products.length} listed in catalog` : 'Publish first product to start'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 High-Impact KPI Metric Cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Gross Sales</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><TrendingUp className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-black text-white font-mono">PKR {totalGrossPkr.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 font-medium">Authoritative transaction revenue</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Net Seller Earnings</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><CreditCard className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">PKR {netEarningsPkr.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 font-medium">After platform fee</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Dispatch</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><Truck className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{pendingShipments} Packages</div>
          <div className="text-[11px] text-amber-400 font-medium">Requires PostEx Air Waybill</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Active Listings</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><Package className="w-4 h-4" /></div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{products.length} Products</div>
          <div className="text-[11px] text-slate-400 font-medium">Indexed in Typesense</div>
        </div>
      </div>

      {/* ── Recent Store Orders (Multi-Vendor Split Sub-Orders) ──── */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Recent Split-Orders Assigned to You</h2>
            <p className="text-xs text-slate-400">Items purchased from your store requiring independent fulfillment</p>
          </div>
          {orders.length > 0 && (
            <Link href="/orders" className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              View All ({orders.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-white">No sub-orders received yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When customers buy products from your store on Waw Marketplace, your split packages will automatically appear here for dispatch.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-400/10"
              >
                <span>Add Products to Store</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Sub-Order Ref</th>
                  <th className="py-3 px-4">Customer & City</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Your Payout</th>
                  <th className="py-3 px-4">Courier CN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{order.orderNumber}</td>
                    <td className="py-3 px-4">
                      <div className="text-white font-semibold">{order.buyerName}</div>
                      <div className="text-[10px] text-slate-400">{order.shippingCity}</div>
                    </td>
                    <td className="py-3 px-4">
                      {order.items?.map(i => (
                        <div key={i.id} className="truncate max-w-[200px] text-[11px]">
                          {i.quantity}x {i.productTitle}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 font-bold text-white font-mono">PKR {order.sellerPayoutPkr.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {order.trackingNumber ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {order.trackingNumber}
                        </span>
                      ) : 'Pending'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        order.orderStatus === 'DELIVERED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : order.orderStatus === 'SHIPPED'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href="/orders"
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold transition-colors"
                      >
                        Print Label
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
