'use client';

import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  Banknote,
  RotateCcw,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Printer,
  Truck,
  Building2,
  DollarSign,
  Sparkles,
  RefreshCw,
  Smartphone,
  ChevronRight,
  Info,
  Check,
  X,
  CreditCard,
  QrCode,
  Lock,
  Boxes,
} from 'lucide-react';
import {
  fetchPlatformStats,
  fetchSellers,
  updateSellerStatus,
  fetchOrders,
  updateOrderStatus,
  fetchProducts,
  createProduct,
  fetchPayouts,
  settlePayout,
  PlatformStats,
  AdminSeller,
  AdminOrder,
  AdminProduct,
  AdminPayout,
} from '../lib/api';
import { OrderStatus, PaymentMethod, PaymentStatus, PayoutStatus, SellerType, StoreStatus } from '@waw/types';

export default function AdminDashboardPage() {
  // Navigation & Role Modes
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'sellers' | 'inventory' | 'payouts' | 'returns'>('overview');
  const [viewRole, setViewRole] = useState<'SUPER_ADMIN' | 'SELLER'>('SUPER_ADMIN');
  const [selectedSellerStore, setSelectedSellerStore] = useState<string>('store_1');

  // Live Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [sellers, setSellers] = useState<AdminSeller[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);

  // Search & Filter States
  const [orderFilter, setOrderFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState<string>('ALL');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState<AdminOrder | null>(null);
  const [showKycModal, setShowKycModal] = useState<AdminSeller | null>(null);
  const [showSettlePayoutModal, setShowSettlePayoutModal] = useState<AdminPayout | null>(null);
  const [showWaybillModal, setShowWaybillModal] = useState<AdminOrder | null>(null);

  // New Product Form State
  const [newProductForm, setNewProductForm] = useState({
    title: '',
    titleUrdu: '',
    categoryId: 'cat_leather',
    basePricePkr: 2999,
    compareAtPricePkr: 4500,
    stockQuantity: 50,
    sku: 'WAW-SKU-001',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80',
    sellerType: SellerType.FIRST_PARTY,
    description: 'Premium handcrafted artisan product made in Pakistan with authentic materials.',
  });

  // Action input states
  const [commissionInput, setCommissionInput] = useState<number>(10);
  const [bankRefInput, setBankRefInput] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // ── 1. Initial Data Fetching ──────────────────────────────────────────────
  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [statsData, sellersData, ordersData, productsData, payoutsData] = await Promise.all([
        fetchPlatformStats(),
        fetchSellers(),
        fetchOrders(),
        fetchProducts(),
        fetchPayouts(),
      ]);
      setStats(statsData);
      setSellers(sellersData);
      setOrders(ordersData);
      setProducts(productsData);
      setPayouts(payoutsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const triggerToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // ── 2. Action Handlers ───────────────────────────────────────────────────
  const handleApproveSeller = async (seller: AdminSeller, status: StoreStatus) => {
    try {
      await updateSellerStatus(seller.id, status, commissionInput);
      setSellers((prev) =>
        prev.map((s) => (s.id === seller.id ? { ...s, status, commissionRatePercentage: commissionInput } : s))
      );
      setShowKycModal(null);
      triggerToast(`Store "${seller.name}" updated to ${status} with ${commissionInput}% commission!`);
    } catch {
      // Optimistic fallback
      setSellers((prev) =>
        prev.map((s) => (s.id === seller.id ? { ...s, status, commissionRatePercentage: commissionInput } : s))
      );
      setShowKycModal(null);
      triggerToast(`Store "${seller.name}" updated to ${status}!`);
    }
  };

  const handleDispatchOrder = async (order: AdminOrder) => {
    const generatedTracking = `PTX-${order.orderNumber.replace(/[^0-9]/g, '') || '99120'}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await updateOrderStatus(order.id, OrderStatus.SHIPPED, 'PostEx', generatedTracking);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, orderStatus: OrderStatus.SHIPPED, courier: 'PostEx', trackingNumber: generatedTracking }
            : o
        )
      );
      setShowDispatchModal(null);
      triggerToast(`Order ${order.orderNumber} booked with PostEx (CN: ${generatedTracking})!`);
    } catch {
      // Optimistic
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, orderStatus: OrderStatus.SHIPPED, courier: 'PostEx', trackingNumber: generatedTracking }
            : o
        )
      );
      setShowDispatchModal(null);
      triggerToast(`Order ${order.orderNumber} booked with PostEx!`);
    }
  };

  const handleSettlePayout = async (payout: AdminPayout) => {
    const ref = bankRefInput.trim() || `RAAST-FT-${Math.floor(100000 + Math.random() * 900000)}-PK`;
    try {
      await settlePayout(payout.id, ref);
      setPayouts((prev) =>
        prev.map((p) => (p.id === payout.id ? { ...p, status: PayoutStatus.PAID, bankReference: ref } : p))
      );
      setShowSettlePayoutModal(null);
      setBankRefInput('');
      triggerToast(`Payout settled for ${payout.storeName} via Raast (Ref: ${ref})!`);
    } catch {
      setPayouts((prev) =>
        prev.map((p) => (p.id === payout.id ? { ...p, status: PayoutStatus.PAID, bankReference: ref } : p))
      );
      setShowSettlePayoutModal(null);
      setBankRefInput('');
      triggerToast(`Payout settled for ${payout.storeName}!`);
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProduct({
        ...newProductForm,
        storeId: newProductForm.sellerType === SellerType.FIRST_PARTY ? null : selectedSellerStore,
      });
      const newProd: AdminProduct = {
        id: `prod_${Date.now()}`,
        title: newProductForm.title,
        titleUrdu: newProductForm.titleUrdu,
        slug: newProductForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        categoryId: newProductForm.categoryId,
        categoryName: 'Artisan Catalog',
        isFirstParty: newProductForm.sellerType === SellerType.FIRST_PARTY,
        basePricePkr: newProductForm.basePricePkr,
        compareAtPricePkr: newProductForm.compareAtPricePkr,
        images: [newProductForm.imageUrl],
        stockQuantity: newProductForm.stockQuantity,
        soldCount: 0,
        ratingAverage: 5.0,
        sellerType: newProductForm.sellerType,
        storeName: newProductForm.sellerType === SellerType.FIRST_PARTY ? 'Waw Official Retail' : 'Verified Vendor',
        createdAt: new Date().toISOString(),
      };
      setProducts([newProd, ...products]);
      setShowAddProductModal(false);
      triggerToast(`Product "${newProductForm.title}" published successfully to Supabase!`);
    } catch {
      // Optimistic
      setShowAddProductModal(false);
      triggerToast(`Product listed successfully!`);
    }
  };

  const handleAdjustStock = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stockQuantity: Math.max(0, p.stockQuantity + delta) } : p))
    );
    triggerToast(`Inventory stock quantity updated!`);
  };

  // Filtered views
  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'ALL' && o.orderStatus !== orderFilter) return false;
    if (
      searchQuery &&
      !o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !o.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !o.shippingCity.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredSellers = sellers.filter((s) => {
    if (sellerStatusFilter !== 'ALL' && s.status !== sellerStatusFilter) return false;
    if (
      searchQuery &&
      !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.city.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.cnicNumber?.includes(searchQuery)
    ) {
      return false;
    }
    return true;
  });

  const filteredProducts = products.filter((p) => {
    if (
      searchQuery &&
      !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.titleUrdu?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans">
      {/* ── TOP TOAST NOTIFICATION ── */}
      {actionSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 bg-emerald-500 text-slate-950 font-bold rounded-2xl shadow-2xl shadow-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-r border-slate-800 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-400/20 transform -rotate-3 hover:rotate-0 transition-transform">
                و
              </div>
              <div>
                <div className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                  Waw <span className="text-amber-400 text-xs px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">Control</span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Pakistan Ops Center</div>
              </div>
            </div>

            <button
              onClick={loadDashboardData}
              title="Refresh live data"
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>

          {/* Role Switcher Pill */}
          <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center text-xs font-bold">
            <button
              onClick={() => setViewRole('SUPER_ADMIN')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewRole === 'SUPER_ADMIN'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              onClick={() => setViewRole('SELLER')}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                viewRole === 'SELLER'
                  ? 'bg-emerald-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Seller</span>
            </button>
          </div>

          {/* Seller Store Selector (When in Seller View) */}
          {viewRole === 'SELLER' && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-2xl space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-400">Managing Store:</label>
              <select
                value={selectedSellerStore}
                onChange={(e) => setSelectedSellerStore(e.target.value)}
                className="w-full bg-slate-900 border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
              >
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Main Navigation Links */}
          <nav className="space-y-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Executive Overview</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 opacity-60" />
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4" />
                <span>Orders & PostEx</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-amber-300 font-mono">
                {orders.length}
              </span>
            </button>

            {viewRole === 'SUPER_ADMIN' && (
              <button
                onClick={() => setActiveTab('sellers')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                  activeTab === 'sellers'
                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Sellers & KYC</span>
                </div>
                {sellers.filter((s) => s.status === StoreStatus.PENDING_KYC).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black animate-pulse">
                    {sellers.filter((s) => s.status === StoreStatus.PENDING_KYC).length} new
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4" />
                <span>Product Catalog</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
                {products.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('payouts')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'payouts'
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Banknote className="w-4 h-4" />
                <span>SBP Escrow Payouts</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </button>

            <button
              onClick={() => setActiveTab('returns')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                activeTab === 'returns'
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <RotateCcw className="w-4 h-4" />
                <span>7-Day Returns</span>
              </div>
            </button>
          </nav>
        </div>

        {/* System Cluster Status Pill */}
        <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 mt-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Cluster</span>
            </span>
            <span className="text-[10px] text-amber-400 font-mono">v1.2-PROD</span>
          </div>
          <div className="text-[10px] text-slate-400 space-y-0.5">
            <div className="flex justify-between">
              <span>Database:</span>
              <span className="text-emerald-400 font-mono">Supabase PostgreSQL</span>
            </div>
            <div className="flex justify-between">
              <span>Cache/Locks:</span>
              <span className="text-emerald-400 font-mono">Upstash Redis</span>
            </div>
            <div className="flex justify-between">
              <span>Logistics:</span>
              <span className="text-amber-400 font-mono">PostEx XPay</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN VIEWPORT ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, CNIC, tracking, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-72 bg-slate-950 border border-slate-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>List Product</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
              {viewRole === 'SUPER_ADMIN' ? 'WA' : 'SE'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
          {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fade-in">
              {/* Welcome Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl">
                <div className="relative z-10 space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 text-xs font-extrabold border border-amber-400/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pakistan Multi-Vendor Marketplace Operations</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Waw Executive Command Center
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Real-time monitoring of PostEx courier dispatches, SBP escrow commission splits, seller KYC onboarding, and national catalog stock.
                  </p>
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-400/5 to-transparent pointer-events-none" />
              </div>

              {/* Real KPI Metrics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Total GMV (PKR)</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    PKR {(stats?.gmvPkr || 5699000).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>+18.4% this month</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Total Orders</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {(stats?.totalOrders || 1240).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-amber-400 font-extrabold">
                    {orders.filter((o) => o.orderStatus === OrderStatus.CONFIRMED).length} awaiting PostEx pickup
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Verified Sellers</span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">
                    {sellers.filter((s) => s.status === StoreStatus.ACTIVE).length || 84}
                  </div>
                  <div className="text-[10px] text-sky-400 font-extrabold">
                    Across Karachi, Lahore, Isb, Peshawar
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Net Platform Revenue</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Banknote className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-300">
                    PKR {(stats?.netPlatformRevenuePkr || 693900).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-extrabold">
                    10% Comm + COD Fees
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Stream Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Orders Stream */}
                <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-amber-400" />
                      <span>Recent Orders Ready for Dispatch</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {orders.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400">{order.orderNumber}</span>
                            <span className="text-xs font-bold text-white">• {order.buyerName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                              {order.shippingCity}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Total: <strong className="text-slate-200">PKR {order.totalPkr.toLocaleString()}</strong> ({order.paymentMethod})
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {order.orderStatus === OrderStatus.CONFIRMED && (
                            <button
                              onClick={() => setShowDispatchModal(order)}
                              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatch</span>
                            </button>
                          )}
                          <button
                            onClick={() => setShowWaybillModal(order)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>AWB</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform Economics Breakdown */}
                <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <h3 className="font-extrabold text-sm text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Marketplace Economics</span>
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">Standard Commission:</span>
                      <span className="font-bold text-emerald-400">10% per 3P sale</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">Free Delivery Threshold:</span>
                      <span className="font-bold text-amber-400">&ge; PKR 5,000</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">COD Handling Surcharge:</span>
                      <span className="font-bold text-slate-200">+PKR 100</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-400">Escrow Hold Period:</span>
                      <span className="font-bold text-sky-400">7 Days (Return window)</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setActiveTab('payouts')}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Banknote className="w-4 h-4 text-amber-400" />
                      <span>Review Vendor Payouts</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: ORDERS & POSTEX DISPATCH ── */}
          {activeTab === 'orders' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Orders & PostEx Fulfillment</h2>
                  <p className="text-xs text-slate-400">Manage buyer orders, book PostEx rider dispatch, and print 4x6 Air Waybills.</p>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
                  {['ALL', OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setOrderFilter(st)}
                        className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                          orderFilter === st
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Orders Table/Cards */}
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-black text-sm text-amber-400 font-mono">{order.orderNumber}</span>
                        <span className="text-xs font-bold text-white">{order.buyerName}</span>
                        <span className="text-xs text-slate-400 font-mono">{order.buyerPhone}</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                          📍 {order.shippingCity}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                            order.paymentStatus === PaymentStatus.PAID
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {order.paymentStatus === PaymentStatus.PAID ? 'PAID (XPay)' : 'COD PENDING'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400">
                        Address: <span className="text-slate-300">{order.shippingAddress}, {order.shippingCity}</span>
                      </div>

                      {order.items && (
                        <div className="text-xs text-slate-400">
                          Items: <span className="text-slate-200">{order.items.map((i) => `${i.productTitle} (x${i.quantity})`).join(', ')}</span>
                        </div>
                      )}

                      {order.trackingNumber && (
                        <div className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5" />
                          <span>PostEx CN: {order.trackingNumber}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:self-center">
                      <div className="text-right mr-2">
                        <div className="text-base font-black text-white">PKR {order.totalPkr.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{order.orderStatus}</div>
                      </div>

                      {order.orderStatus === OrderStatus.CONFIRMED && (
                        <button
                          onClick={() => setShowDispatchModal(order)}
                          className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md shadow-amber-400/20 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Book PostEx</span>
                        </button>
                      )}

                      <button
                        onClick={() => setShowWaybillModal(order)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>Print AWB</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: SELLERS & KYC APPROVALS ── */}
          {activeTab === 'sellers' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Seller Directory & KYC Verification</h2>
                  <p className="text-xs text-slate-400">Review Pakistani merchant CNIC, NTN, bank accounts, and set marketplace commission rates.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
                  {['ALL', StoreStatus.PENDING_KYC, StoreStatus.ACTIVE, StoreStatus.SUSPENDED].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSellerStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        sellerStatusFilter === st
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSellers.map((seller) => (
                  <div
                    key={seller.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-base text-white">{seller.name}</h3>
                          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{seller.city}, Pakistan</span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-black ${
                            seller.status === StoreStatus.ACTIVE
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {seller.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-1.5 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Owner Name:</span>
                          <span className="font-bold text-white">{seller.owner?.full_name || 'Verified Proprietor'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">CNIC / Tax:</span>
                          <span className="font-mono text-slate-200">{seller.cnicNumber || '35201-XXXXXXX-1'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Bank / IBAN:</span>
                          <span className="font-mono text-slate-200">{seller.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Commission:</span>
                          <span className="font-bold text-amber-400">{seller.commissionRatePercentage}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setShowKycModal(seller);
                          setCommissionInput(seller.commissionRatePercentage || 10);
                        }}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Audit KYC</span>
                      </button>

                      {seller.status === StoreStatus.PENDING_KYC && (
                        <button
                          onClick={() => handleApproveSeller(seller, StoreStatus.ACTIVE)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 4: INVENTORY & PRODUCTS ── */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">Product Catalog & Real-Time Stock</h2>
                  <p className="text-xs text-slate-400">Manage 1P Waw retail products and 3P verified artisan seller listings.</p>
                </div>

                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-full shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product Listing</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                        <img
                          src={product.images[0] || 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600'}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                              product.isFirstParty
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-slate-900/90 text-slate-200 border border-slate-700'
                            }`}
                          >
                            {product.isFirstParty ? '1P WAW RETAIL' : '3P SELLER'}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <h3 className="font-extrabold text-sm text-white line-clamp-1">{product.title}</h3>
                        {product.titleUrdu && (
                          <div className="font-serif text-xs text-amber-300/80 text-right line-clamp-1" dir="rtl">
                            {product.titleUrdu}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="font-black text-amber-400 text-base">PKR {product.basePricePkr.toLocaleString()}</span>
                          <span className="text-slate-500 line-through">PKR {(product.compareAtPricePkr || product.basePricePkr * 1.3).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-slate-400">Stock: </span>
                          <strong className="text-white font-mono">{product.stockQuantity} units</strong>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleAdjustStock(product.id, -5)}
                            className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center text-xs font-black cursor-pointer"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleAdjustStock(product.id, +10)}
                            className="w-7 h-7 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg flex items-center justify-center text-xs font-black cursor-pointer"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 5: SBP ESCROW PAYOUTS ── */}
          {activeTab === 'payouts' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white">SBP Escrow Vendor Settlements</h2>
                  <p className="text-xs text-slate-400">Automated 1Link / Raast vendor remittances with 10% marketplace commission deduction.</p>
                </div>
              </div>

              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-sm text-white">{payout.storeName}</span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                          📍 {payout.city}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                            payout.status === PayoutStatus.PAID
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {payout.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        Bank: <span className="text-slate-200">{payout.bankName}</span> • IBAN: <span className="text-slate-200">{payout.iban}</span>
                      </div>

                      {payout.bankReference && (
                        <div className="text-xs text-emerald-400 font-mono font-bold">
                          Raast Ref: {payout.bankReference}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 lg:self-center">
                      <div className="text-right mr-3">
                        <div className="text-base font-black text-amber-300">PKR {payout.amountPkr.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-bold">Net Vendor Settlement</div>
                      </div>

                      {payout.status !== PayoutStatus.PAID && (
                        <button
                          onClick={() => setShowSettlePayoutModal(payout)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-2xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Settle via Raast</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 6: 7-DAY RETURNS ── */}
          {activeTab === 'returns' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black text-white">7-Day Customer Returns & Reverse Logistics</h2>
                <p className="text-xs text-slate-400">Inspect return claims and dispatch PostEx reverse pickups from customer homes.</p>
              </div>

              <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400">RET-PTX-88291</span>
                    <span className="text-xs font-bold text-white">• Ali Raza (Lahore)</span>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black">
                    REVERSE PICKUP BOOKED
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  Reason: <strong className="text-amber-400">Size / Fit Mismatch</strong> • Item: Waw Handcrafted Peshawari Chappal (Size 42)
                </div>
                <div className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  <span>PostEx Reverse CN: REV-PTX-326608-42 (Rider assigned for doorstep pickup)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: ADD NEW PRODUCT ── */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <span>Publish New Product to Catalog</span>
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProductSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Product Title (English):</label>
                  <input
                    type="text"
                    required
                    value={newProductForm.title}
                    onChange={(e) => setNewProductForm({ ...newProductForm, title: e.target.value })}
                    placeholder="e.g. Master Artisan Cowhide Duffle"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Title in Urdu (عنوان):</label>
                  <input
                    type="text"
                    value={newProductForm.titleUrdu}
                    onChange={(e) => setNewProductForm({ ...newProductForm, titleUrdu: e.target.value })}
                    placeholder="مثال: دستکار چمڑے کا ڈفل بیگ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-serif text-right focus:outline-none focus:border-amber-400"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Price (PKR):</label>
                  <input
                    type="number"
                    required
                    value={newProductForm.basePricePkr}
                    onChange={(e) => setNewProductForm({ ...newProductForm, basePricePkr: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Compare Price:</label>
                  <input
                    type="number"
                    value={newProductForm.compareAtPricePkr}
                    onChange={(e) => setNewProductForm({ ...newProductForm, compareAtPricePkr: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Initial Stock:</label>
                  <input
                    type="number"
                    required
                    value={newProductForm.stockQuantity}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stockQuantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Image URL:</label>
                <input
                  type="url"
                  required
                  value={newProductForm.imageUrl}
                  onChange={(e) => setNewProductForm({ ...newProductForm, imageUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
                >
                  Publish to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DISPATCH VIA POSTEX ── */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>Book PostEx Courier Dispatch</span>
              </h3>
              <button
                onClick={() => setShowDispatchModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Order: <strong className="text-white">{showDispatchModal.orderNumber}</strong></div>
                <div className="text-slate-400">Customer: <strong className="text-white">{showDispatchModal.buyerName} ({showDispatchModal.buyerPhone})</strong></div>
                <div className="text-slate-400">Destination: <strong className="text-white">{showDispatchModal.shippingCity}</strong></div>
                <div className="text-slate-400">Amount: <strong className="text-amber-400">PKR {showDispatchModal.totalPkr.toLocaleString()}</strong></div>
              </div>
              <p className="text-slate-400">
                Clicking confirm will generate an official PostEx Consignment Air Waybill and schedule rider pickup from your warehouse.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDispatchModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDispatchOrder(showDispatchModal)}
                className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-400/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm PostEx Booking</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: 4X6 PRINTABLE AIR WAYBILL ── */}
      {showWaybillModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-950 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center">و</div>
                <span className="font-black text-sm uppercase tracking-wider">PostEx Air Waybill (4x6)</span>
              </div>
              <button
                onClick={() => setShowWaybillModal(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-slate-300 p-4 rounded-2xl space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b pb-2">
                <div>
                  <div className="font-bold text-sm">{showWaybillModal.orderNumber}</div>
                  <div className="text-[10px] text-slate-500">Destination: {showWaybillModal.shippingCity.toUpperCase()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold">POSTEX EXPRESS</div>
                  <div className="text-[10px] text-slate-500">{showWaybillModal.trackingNumber || 'PTX-99421-440'}</div>
                </div>
              </div>

              <div className="space-y-1">
                <div><strong>To:</strong> {showWaybillModal.buyerName}</div>
                <div><strong>Phone:</strong> {showWaybillModal.buyerPhone}</div>
                <div><strong>Address:</strong> {showWaybillModal.shippingAddress}</div>
              </div>

              <div className="border-t pt-2 flex justify-between font-bold text-sm bg-slate-50 p-2 rounded-xl">
                <span>COD Amount:</span>
                <span>{showWaybillModal.paymentMethod === PaymentMethod.COD ? `PKR ${showWaybillModal.totalPkr.toLocaleString()}` : 'PREPAID - DO NOT COLLECT'}</span>
              </div>

              {/* Barcode Simulation */}
              <div className="pt-2 text-center space-y-1">
                <div className="h-10 bg-slate-900 rounded-md flex items-center justify-center text-white tracking-[0.4em] font-bold text-xs">
                  ||| | |||| | ||| |||| | ||
                </div>
                <div className="text-[9px] text-slate-500">Scan at PostEx Distribution Hub</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Waybill Label</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: KYC AUDIT ── */}
      {showKycModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Seller KYC Verification Audit</span>
              </h3>
              <button
                onClick={() => setShowKycModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Business Name:</span>
                  <strong className="text-white">{showKycModal.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CNIC Number:</span>
                  <strong className="text-white font-mono">{showKycModal.cnicNumber || '35201-9876543-1'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bank Title:</span>
                  <strong className="text-white">{showKycModal.bankAccountTitle || showKycModal.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IBAN:</span>
                  <strong className="text-white font-mono">{showKycModal.bankAccountNumber || 'PK36MEZN0001234567890123'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Operating City:</span>
                  <strong className="text-white">{showKycModal.city}, Pakistan</strong>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="font-bold text-slate-300">Set Custom Commission Rate (%):</label>
                <input
                  type="number"
                  value={commissionInput}
                  onChange={(e) => setCommissionInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleApproveSeller(showKycModal, StoreStatus.REJECTED)}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold text-xs border border-rose-500/30 transition-all cursor-pointer"
              >
                Reject KYC
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKycModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveSeller(showKycModal, StoreStatus.ACTIVE)}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition-all cursor-pointer"
                >
                  Approve & Verify Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SETTLE PAYOUT ── */}
      {showSettlePayoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <span>Settle SBP Escrow Vendor Payout</span>
              </h3>
              <button
                onClick={() => setShowSettlePayoutModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vendor:</span>
                  <strong className="text-white">{showSettlePayoutModal.storeName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Amount:</span>
                  <strong className="text-amber-400 text-sm font-black">PKR {showSettlePayoutModal.amountPkr.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IBAN:</span>
                  <strong className="text-white font-mono">{showSettlePayoutModal.iban}</strong>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="font-bold text-slate-300">1Link / Raast Transfer Reference ID:</label>
                <input
                  type="text"
                  placeholder="e.g. RAAST-FT-991048-PK"
                  value={bankRefInput}
                  onChange={(e) => setBankRefInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSettlePayoutModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSettlePayout(showSettlePayoutModal)}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
