'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Smartphone, ArrowRight, CheckCircle2, AlertCircle, Building2, MapPin } from 'lucide-react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

export default function SellerLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [phone, setPhone] = useState('+923219876543');
  const [storeName, setStoreName] = useState('');
  const [city, setCity] = useState('Lahore');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request OTP');
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Unable to reach authentication server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');

      localStorage.setItem('waw_seller_token', data.token);
      localStorage.setItem('waw_seller_user', JSON.stringify(data.user || { role: 'SELLER', phone }));
      if (data.user?.store_id) {
        localStorage.setItem('waw_store_id', data.user.store_id);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMerchantQuickLogin = (demoStore: string, demoStoreId: string, demoCity: string) => {
    const sellerToken = 'waw_merchant_token_' + Date.now();
    localStorage.setItem('waw_seller_token', sellerToken);
    localStorage.setItem('waw_store_id', demoStoreId);
    localStorage.setItem('waw_seller_user', JSON.stringify({
      id: 'usr_seller_' + demoStoreId,
      fullName: demoStore + ' Manager',
      role: 'SELLER',
      phone: '+923219876543',
      storeName: demoStore,
      city: demoCity,
    }));
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Store className="w-7 h-7" />
          </div>
          <div className="inline-block text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-0.5 rounded-full">
            Merchant Center
          </div>
          <h1 className="text-2xl font-black text-white">Waw Seller Portal</h1>
          <p className="text-xs text-slate-400">
            Manage your store, fulfill customer sub-orders, print PostEx labels, and track payouts.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setTab('LOGIN'); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === 'LOGIN' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Merchant Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('REGISTER'); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === 'REGISTER' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Register Store
          </button>
        </div>

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            {tab === 'REGISTER' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Brand / Store Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Lahore Silk & Crafts"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Warehouse City</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lahore, Karachi, Peshawar"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">WhatsApp Merchant Number</label>
              <div className="relative">
                <Smartphone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+923219876543"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white font-mono outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-amber-400/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Requesting OTP...' : 'Send WhatsApp Access Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Enter 6-Digit WhatsApp Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-center text-xl tracking-widest text-white font-mono font-bold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-emerald-400/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Verifying...' : 'Access Merchant Dashboard'}</span>
            </button>
          </form>
        )}

        <div className="border-t border-slate-800 pt-4 text-center space-y-2">
          <div className="text-[11px] font-bold text-slate-400">Quick Test Merchant Accounts:</div>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => handleMerchantQuickLogin('Lahore Silk Studio', 'store_lahore_tech', 'Lahore')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold"
            >
              Lahore Silk (Active)
            </button>
            <button
              type="button"
              onClick={() => handleMerchantQuickLogin('Khyber Artisan Chappal', 'store_khyber_leather', 'Peshawar')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-[10px] font-bold"
            >
              Khyber Craft (Active)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
