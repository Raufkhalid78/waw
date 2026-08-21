'use client';

import { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

const PAST_ORDERS = [
  {
    id: 'WAW-PK-98213',
    date: 'Aug 20, 2026',
    status: 'IN_TRANSIT',
    statusLabel: 'In Transit with TCS',
    statusColor: 'bg-amber-50 text-amber-900 border-amber-200',
    totalPkr: 5699,
    paymentMethod: 'SBP Raast / Online',
    deliveryCity: 'Lahore',
    items: [
      {
        title: 'Waw Signature Slim Bifold Pure Cow Leather Wallet',
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=120&auto=format&fit=crop&q=80',
        qty: 1,
        price: 2499,
      },
      {
        title: 'Pro ANC Wireless Earbuds with Heavy Bass',
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=120&auto=format&fit=crop&q=80',
        qty: 1,
        price: 3200,
      },
    ],
  },
  {
    id: 'WAW-PK-84021',
    date: 'Aug 12, 2026',
    status: 'DELIVERED',
    statusLabel: 'Delivered',
    statusColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    totalPkr: 3800,
    paymentMethod: 'Cash on Delivery (COD)',
    deliveryCity: 'Lahore',
    items: [
      {
        title: 'Handmade Traditional Norozi Peshawari Chappal',
        image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=120&auto=format&fit=crop&q=80',
        qty: 1,
        price: 3800,
      },
    ],
  },
];

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'payments' | 'settings'>('orders');

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-10 space-y-8">
      {/* ── Breadcrumb Navigation ────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">My Account</span>
      </nav>

      {/* ── User Profile Header Card ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-3xl bg-slate-950 text-amber-400 font-black text-2xl flex items-center justify-center shadow-md shrink-0">
            AK
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-slate-950 tracking-tight">Ali Khan</h1>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-black">
                ★ Waw Gold Member
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              ali.khan@example.pk • +92 300 1234567 • Primary City: <strong className="text-slate-900">Lahore, PK</strong>
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="text-center">
            <div className="text-xl font-black text-slate-950">2</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Orders</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-emerald-600">PKR 9.5k</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Spend Saved</div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {[
          { key: 'orders', label: 'Order History & Tracking', icon: Package },
          { key: 'addresses', label: 'Saved Addresses', icon: MapPin },
          { key: 'payments', label: 'Payment Wallets & Cards', icon: CreditCard },
          { key: 'settings', label: 'WhatsApp Alerts & Security', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-black whitespace-nowrap transition-all border-b-2 -mb-0.5 cursor-pointer ${
                activeTab === tab.key
                  ? 'border-amber-500 text-slate-950'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Order History ─────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {PAST_ORDERS.map((ord) => (
            <div key={ord.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              {/* Order Meta Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-950">{ord.id}</span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${ord.statusColor}`}>
                        {ord.statusLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Placed on {ord.date} • {ord.paymentMethod}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right sm:block">
                    <div className="text-base font-black text-slate-950">PKR {ord.totalPkr.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 font-medium">Free Delivery</div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ord.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <img src={item.image} alt={item.title} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                      <div className="text-[10px] text-slate-500 font-medium">Qty: {item.qty}</div>
                      <div className="text-xs font-black text-slate-950 mt-0.5">PKR {item.price.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab 2: Saved Addresses ───────────────────────────────────────── */}
      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white border-2 border-amber-400 rounded-3xl p-6 shadow-xs space-y-3 relative">
            <span className="absolute top-4 right-4 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
              PRIMARY DEFAULT
            </span>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <h3 className="font-black text-sm text-slate-950">Home Residence</h3>
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
              <h3 className="font-black text-sm text-slate-950">Office / Workplace</h3>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Level 4, Arfa Software Technology Park, Ferozepur Road, Lahore, 54600
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
      {activeTab === 'payments' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-950">State Bank Raast Instant ID</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Linked</span>
            </div>
            <p className="font-mono text-sm font-black text-slate-900">03001234567@raast</p>
            <p className="text-[11px] text-slate-500">Zero surcharge fee on all nationwide marketplace purchases.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm text-slate-950">Debit / Credit Card (HBL)</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Primary</span>
            </div>
            <p className="font-mono text-sm font-black text-slate-900">•••• •••• •••• 4892 (Visa)</p>
            <p className="text-[11px] text-slate-500">Secured by 3D-Secure OTP verification.</p>
          </div>
        </div>
      )}

      {/* ── Tab 4: Settings & Alerts ─────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 max-w-2xl">
          <h3 className="text-base font-black text-slate-950">Communication & Privacy</h3>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="font-bold text-slate-900">WhatsApp Dispatch & Delivery Receipts</div>
                <div className="text-slate-500">Get courier tracking links and digital invoices on +92 300 1234567</div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-amber-500 cursor-pointer" />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <div className="font-bold text-slate-900">Flash Deal & Price Drop Notifications</div>
                <div className="text-slate-500">Receive alerts when saved wishlist items go on discount</div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-amber-500 cursor-pointer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
