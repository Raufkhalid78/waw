'use client';

import { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Truck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Package,
  Banknote,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Building2,
  CreditCard,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface Seller {
  id: string;
  name: string;
  city: string;
  cnic: string;
  ntn: string;
  category: string;
  productsCount: number;
  status: 'PENDING_KYC' | 'ACTIVE' | 'REJECTED';
  appliedDate: string;
  commissionRate: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  city: string;
  itemsCount: number;
  totalPkr: number;
  paymentMethod: 'SBP Raast / Prepaid' | 'Cash on Delivery (COD)';
  status: 'CONFIRMED' | 'PACKED' | 'DISPATCHED' | 'DELIVERED';
  courier: 'PostEx' | 'Leopards' | 'Trax' | 'Unassigned';
  trackingNumber: string;
  orderDate: string;
}

interface Payout {
  id: string;
  storeName: string;
  bankName: string;
  accountTitle: string;
  iban: string;
  grossAmountPkr: number;
  commissionPkr: number;
  netPayoutPkr: number;
  status: 'HELD_IN_ESCROW' | 'READY_FOR_SETTLEMENT' | 'PAID';
  orderRef: string;
}

interface InventoryItem {
  id: string;
  title: string;
  category: string;
  sku: string;
  stock: number;
  pricePkr: number;
  sellerType: '1P_WAW' | '3P_VERIFIED';
  storeName: string;
}

interface ReturnItem {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  city: string;
  reason: string;
  amountPkr: number;
  postexTrackingNumber: string;
  status: 'PENDING_REVIEW' | 'PICKUP_DISPATCHED' | 'REFUNDED' | 'REJECTED';
  requestedDate: string;
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'sellers' | 'payouts' | 'inventory' | 'returns'>('overview');

  // ── 1. Sellers State ──────────────────────────────────────────────────
  const [sellers, setSellers] = useState<Seller[]>([
    {
      id: 'store_1',
      name: 'Karachi Leather Goods',
      city: 'Karachi',
      cnic: '42101-9876543-1',
      ntn: 'NTN-8921491-0',
      category: 'Fashion & Accessories',
      productsCount: 48,
      status: 'PENDING_KYC',
      appliedDate: '2 hours ago',
      commissionRate: '10%',
    },
    {
      id: 'store_2',
      name: 'Lahore Tech Hub',
      city: 'Lahore (Hafeez Centre)',
      cnic: '35202-1234567-9',
      ntn: 'NTN-7341029-4',
      category: 'Electronics & Audio',
      productsCount: 120,
      status: 'ACTIVE',
      appliedDate: 'Yesterday',
      commissionRate: '10%',
    },
    {
      id: 'store_3',
      name: 'Peshawar Artisans',
      city: 'Peshawar (Namak Mandi)',
      cnic: '17301-4433221-5',
      ntn: 'NTN-6291043-8',
      category: 'Handmade Footwear',
      productsCount: 19,
      status: 'PENDING_KYC',
      appliedDate: '3 hours ago',
      commissionRate: '10%',
    },
    {
      id: 'store_4',
      name: 'Multan Handlooms & Pottery',
      city: 'Multan',
      cnic: '36302-8877665-3',
      ntn: 'NTN-5401928-2',
      category: 'Home & Heritage',
      productsCount: 35,
      status: 'ACTIVE',
      appliedDate: '3 days ago',
      commissionRate: '10%',
    },
  ]);

  // ── 2. Orders State ───────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'WAW-PK-98213',
      customerName: 'Ali Khan',
      customerPhone: '+92 300 1234567',
      city: 'Lahore (DHA Phase 5)',
      itemsCount: 2,
      totalPkr: 5699,
      paymentMethod: 'SBP Raast / Prepaid',
      status: 'PACKED',
      courier: 'PostEx',
      trackingNumber: 'PTX-98213-401',
      orderDate: 'Today, 11:30 AM',
    },
    {
      id: 'WAW-PK-88492',
      customerName: 'Bilal Ahmed',
      customerPhone: '+92 321 7654321',
      city: 'Karachi (Clifton)',
      itemsCount: 1,
      totalPkr: 3800,
      paymentMethod: 'Cash on Delivery (COD)',
      status: 'CONFIRMED',
      courier: 'PostEx',
      trackingNumber: 'PTX-88492-910',
      orderDate: 'Today, 10:15 AM',
    },
    {
      id: 'WAW-PK-77210',
      customerName: 'Fatima Noor',
      customerPhone: '+92 333 9988776',
      city: 'Islamabad (F-7)',
      itemsCount: 3,
      totalPkr: 8900,
      paymentMethod: 'SBP Raast / Prepaid',
      status: 'DISPATCHED',
      courier: 'PostEx',
      trackingNumber: 'PTX-77210-883',
      orderDate: 'Yesterday',
    },
  ]);

  // ── 3. Payouts State ──────────────────────────────────────────────────
  const [payouts, setPayouts] = useState<Payout[]>([
    {
      id: 'PAY-8923',
      storeName: 'Karachi Leather Goods',
      bankName: 'Meezan Bank Limited',
      accountTitle: 'Karachi Leather PVT LTD',
      iban: 'PK36MEZN0001234567890123',
      grossAmountPkr: 5699,
      commissionPkr: 569,
      netPayoutPkr: 5130,
      status: 'READY_FOR_SETTLEMENT',
      orderRef: 'WAW-PK-98213',
    },
    {
      id: 'PAY-8922',
      storeName: 'Khyber Artisans',
      bankName: 'Habib Bank Limited (HBL)',
      accountTitle: 'Namak Mandi Crafts',
      iban: 'PK45HABB0009876543210987',
      grossAmountPkr: 3800,
      commissionPkr: 380,
      netPayoutPkr: 3420,
      status: 'READY_FOR_SETTLEMENT',
      orderRef: 'WAW-PK-88492',
    },
  ]);

  // ── 4. Inventory State ────────────────────────────────────────────────
  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      id: 'prod_m1',
      title: 'Waw Signature Slim Bifold Pure Cow Leather Wallet',
      category: 'Leather & Footwear',
      sku: 'WAW-LTH-WLT-001',
      stock: 45,
      pricePkr: 2499,
      sellerType: '1P_WAW',
      storeName: 'Waw Official Hub',
    },
    {
      id: 'prod_m2',
      title: 'Pro ANC Wireless Earbuds with Heavy Bass & 40h Battery',
      category: 'Mobiles & Tech',
      sku: 'LTH-AUD-EP-502',
      stock: 82,
      pricePkr: 3200,
      sellerType: '3P_VERIFIED',
      storeName: 'Lahore Tech Hub',
    },
  ]);

  // ── 5. Returns & Disputes State ───────────────────────────────────────
  const [returns, setReturns] = useState<ReturnItem[]>([
    {
      id: 'RET-001',
      orderId: 'WAW-PK-88492',
      customerName: 'Bilal Ahmed',
      customerPhone: '+92 321 7654321',
      city: 'Karachi (Clifton)',
      reason: 'Size / Fit Mismatch (Ordered 9, needs 10)',
      amountPkr: 3800,
      postexTrackingNumber: 'REV-PTX-88492-91',
      status: 'PICKUP_DISPATCHED',
      requestedDate: 'Today, 2:15 PM',
    },
    {
      id: 'RET-002',
      orderId: 'WAW-PK-65209',
      customerName: 'Zainab Tariq',
      customerPhone: '+92 300 5544332',
      city: 'Lahore (Model Town)',
      reason: 'Damaged packaging during transit',
      amountPkr: 2499,
      postexTrackingNumber: 'REV-PTX-65209-12',
      status: 'PENDING_REVIEW',
      requestedDate: 'Yesterday',
    },
  ]);

  const handleApproveSeller = (id: string) => {
    setSellers(sellers.map((s) => (s.id === id ? { ...s, status: 'ACTIVE' } : s)));
  };

  const handleRejectSeller = (id: string) => {
    setSellers(sellers.map((s) => (s.id === id ? { ...s, status: 'REJECTED' } : s)));
  };

  const handleUpdateOrderStatus = (orderId: string, nextStatus: Order['status'], courierName?: Order['courier']) => {
    setOrders(
      orders.map((ord) => {
        if (ord.id === orderId) {
          const courier = courierName || ord.courier === 'Unassigned' ? 'PostEx' : ord.courier;
          const trackingNumber = ord.trackingNumber === 'Pending Dispatch' ? `PTX-${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(100 + Math.random() * 900)}` : ord.trackingNumber;
          return {
            ...ord,
            status: nextStatus,
            courier,
            trackingNumber,
          };
        }
        return ord;
      })
    );
  };

  const handleSettlePayout = (payoutId: string) => {
    setPayouts(payouts.map((p) => (p.id === payoutId ? { ...p, status: 'PAID' } : p)));
  };

  const handleApproveReturnRefund = (returnId: string) => {
    setReturns(returns.map((r) => (r.id === returnId ? { ...r, status: 'REFUNDED' } : r)));
  };

  const handleStockChange = (id: string, delta: number) => {
    setInventory(
      inventory.map((item) => (item.id === id ? { ...item, stock: Math.max(0, item.stock + delta) } : item))
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Top Header Strip ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Executive Control Center</span>
            <span className="text-xs bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-mono">
              Pakistan Operations
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time management for 1P inventory, 3P vendor KYC, PostEx logistics dispatch, and SBP escrow settlements.
          </p>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl overflow-x-auto text-xs font-bold">
          {[
            { key: 'overview', label: 'Executive Overview', icon: DollarSign },
            { key: 'orders', label: `Orders (${orders.filter((o) => o.status !== 'DELIVERED').length})`, icon: ShoppingBag },
            { key: 'sellers', label: `KYC Queue (${sellers.filter((s) => s.status === 'PENDING_KYC').length})`, icon: Users },
            { key: 'payouts', label: 'Escrow Payouts', icon: Banknote },
            { key: 'returns', label: `Returns & Escrow (${returns.filter((r) => r.status !== 'REFUNDED').length})`, icon: RotateCcw },
            { key: 'inventory', label: '1P/3P Inventory', icon: Package },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB 1: EXECUTIVE OVERVIEW ────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Total GMV (PKR)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">PKR 1,482,900</div>
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+28.4% this week</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>SBP Escrow Balance</span>
                <ShieldCheck className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black text-sky-400">PKR 412,500</div>
              <div className="text-[11px] text-slate-400 font-medium">100% SBP Regulated Vault</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>PostEx Courier Dispatches</span>
                <Truck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">128 Shipments</div>
              <div className="text-[11px] text-emerald-400 font-bold">98.2% on-time 24h delivery</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Platform Commission</span>
                <Banknote className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400">PKR 148,290</div>
              <div className="text-[11px] text-slate-400 font-medium">Blended 10% take-rate</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ORDERS & POSTEX DISPATCH ─────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-sky-400" />
                <span>Orders & PostEx Logistics Dispatch Center</span>
              </h2>
              <p className="text-xs text-slate-400">Automated PostEx consignment creation and milestone tracking across Pakistan</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{orders.length} Total Orders Loaded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Customer & City</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Courier & Tracking</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Dispatch Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{ord.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200">{ord.customerName}</div>
                      <div className="text-[11px] text-slate-400">{ord.city} • {ord.customerPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{ord.paymentMethod}</td>
                    <td className="py-3.5 px-4 font-black text-white">PKR {ord.totalPkr.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-sky-400">{ord.courier}</div>
                      <div className="font-mono text-[10px] text-slate-400">{ord.trackingNumber}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ord.status === 'DELIVERED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : ord.status === 'DISPATCHED'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : ord.status === 'PACKED'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {ord.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'PACKED')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Mark Packed
                        </button>
                      )}
                      {ord.status === 'PACKED' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'DISPATCHED', 'PostEx')}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Dispatch (PostEx)
                        </button>
                      )}
                      {ord.status === 'DISPATCHED' && (
                        <button
                          onClick={() => handleUpdateOrderStatus(ord.id, 'DELIVERED')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors"
                        >
                          Confirm Delivery
                        </button>
                      )}
                      {ord.status === 'DELIVERED' && (
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: RETURNS & DISPUTES (SBP ESCROW) ──────────────────────── */}
      {activeTab === 'returns' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <span>7-Day SBP Escrow Return & Reverse Logistics Arbitrator</span>
              </h2>
              <p className="text-xs text-slate-400">Review buyer return claims, track PostEx doorstep pickups, and authorize escrow refunds</p>
            </div>
            <span className="text-xs font-bold text-slate-400">{returns.length} Total Claims</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Claim ID & Order</th>
                  <th className="py-3 px-4">Buyer & City</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Refund Amount</th>
                  <th className="py-3 px-4">PostEx Reverse CN</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Escrow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-black text-amber-400">{ret.id}</div>
                      <div className="text-[11px] text-slate-400">{ret.orderId}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200">{ret.customerName}</div>
                      <div className="text-[11px] text-slate-400">{ret.city} • {ret.customerPhone}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium max-w-xs truncate">{ret.reason}</td>
                    <td className="py-3.5 px-4 font-black text-white">PKR {ret.amountPkr.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[10px] bg-slate-800 text-sky-400 px-2 py-0.5 rounded-md border border-slate-700">
                        {ret.postexTrackingNumber}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ret.status === 'REFUNDED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : ret.status === 'PICKUP_DISPATCHED'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {ret.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ret.status !== 'REFUNDED' ? (
                        <button
                          onClick={() => handleApproveReturnRefund(ret.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors shadow-xs"
                        >
                          Approve Refund
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Refunded</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: SELLERS KYC QUEUE ─────────────────────────────────────── */}
      {activeTab === 'sellers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Vendor Verification & KYC Queue</span>
              </h2>
              <p className="text-xs text-slate-400">Review NADRA CNIC, FBR NTN & banking credentials before granting marketplace listing rights</p>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {sellers.filter((s) => s.status === 'PENDING_KYC').length} Pending Verification
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Store Name</th>
                  <th className="py-3 px-4">City / Region</th>
                  <th className="py-3 px-4">NADRA CNIC</th>
                  <th className="py-3 px-4">FBR NTN</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{s.name}</td>
                    <td className="py-3.5 px-4 text-slate-300">{s.city}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{s.cnic}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{s.ntn}</td>
                    <td className="py-3.5 px-4 text-slate-300">{s.category}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : s.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {s.status === 'PENDING_KYC' && (
                        <>
                          <button
                            onClick={() => handleApproveSeller(s.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectSeller(s.id)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {s.status === 'ACTIVE' && (
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approved</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: ESCROW PAYOUTS ────────────────────────────────────────── */}
      {activeTab === 'payouts' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-sky-400" />
                <span>State Bank Escrow & 1Link Merchant Disbursements</span>
              </h2>
              <p className="text-xs text-slate-400">Releases escrowed funds to 3P merchants after PostEx physical delivery & return period</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">Payout ID</th>
                  <th className="py-3 px-4">Store & Bank Account</th>
                  <th className="py-3 px-4">Gross Sales</th>
                  <th className="py-3 px-4">Waw Commission (10%)</th>
                  <th className="py-3 px-4">Net Merchant Payout</th>
                  <th className="py-3 px-4">Escrow Status</th>
                  <th className="py-3 px-4 text-right">Settlement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{p.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-200">{p.storeName}</div>
                      <div className="text-[11px] text-slate-400">{p.bankName} • {p.accountTitle}</div>
                      <div className="font-mono text-[10px] text-sky-400">{p.iban}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">PKR {p.grossAmountPkr.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-rose-400 font-bold">- PKR {p.commissionPkr.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                      PKR {p.netPayoutPkr.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {p.status === 'READY_FOR_SETTLEMENT' ? (
                        <button
                          onClick={() => handleSettlePayout(p.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] transition-colors shadow-xs"
                        >
                          Settle via 1Link / Raast
                        </button>
                      ) : (
                        <span className="text-emerald-400 font-bold text-[11px] flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: INVENTORY MANAGEMENT ──────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                <span>1P Direct & 3P Vendor Inventory</span>
              </h2>
              <p className="text-xs text-slate-400">Manage real-time stock levels across regional Pakistani fulfillment hubs</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Fulfillment Type</th>
                  <th className="py-3 px-4">Price (PKR)</th>
                  <th className="py-3 px-4">Current Stock</th>
                  <th className="py-3 px-4 text-right">Quick Stock Adjustment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{item.sku}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400">{item.storeName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{item.category}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.sellerType === '1P_WAW'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        }`}
                      >
                        {item.sellerType === '1P_WAW' ? '⚡ 1P Waw Express' : '🏬 3P Verified Store'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-white">PKR {item.pricePkr.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-black text-sky-400 text-sm">{item.stock} Units</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleStockChange(item.id, -5)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px]"
                      >
                        -5
                      </button>
                      <button
                        onClick={() => handleStockChange(item.id, +10)}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[11px]"
                      >
                        +10
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
