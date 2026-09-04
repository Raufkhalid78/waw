"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Mail,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export default function SellerLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [loginMethod, setLoginMethod] = useState<"whatsapp" | "email">("whatsapp");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [city, setCity] = useState("Lahore");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = async (userId: string, userRole: string, userPhone?: string, userEmail?: string, storeId?: string) => {
    const sessionRes = await fetch(`${API_BASE}/api/auth/session/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId, userRole, userPhone, userEmail, storeId }),
    });
    if (!sessionRes.ok) {
      const err = await sessionRes.json().catch(() => ({ error: "Session creation failed" }));
      throw new Error(err.error || "Failed to create session");
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/whatsapp-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request OTP");
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || "Unable to reach authentication server");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/whatsapp-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, otp, role: "SELLER", storeName, city }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      await createSession(
        data.user.id,
        data.user.role,
        data.user.phone,
        data.user.email,
        data.user.store_id,
      );
      router.push("/");
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      await createSession(
        data.user.id,
        data.user.role,
        data.user.phone,
        data.user.email,
        data.user.store_id,
      );
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: "GOOGLE" | "APPLE") => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
      setError(`${provider} login will be available soon.`);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <img
            src="/waw_noon_logo_black.svg"
            alt="Waw Logo"
            className="w-20 h-20 mx-auto"
          />
          <div className="inline-block text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-0.5 rounded-full">
            Merchant Center
          </div>
          <h1 className="text-2xl font-black text-white">Waw Seller Portal</h1>
          <p className="text-xs text-slate-400">
            Manage your store, fulfill customer sub-orders, print PostEx labels,
            and track payouts.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab("LOGIN");
              setOtpSent(false);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === "LOGIN" ? "bg-amber-400 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            Merchant Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("REGISTER");
              setOtpSent(false);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${tab === "REGISTER" ? "bg-amber-400 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            Register Store
          </button>
        </div>

        {/* Login Method Toggle (only on login tab) */}
        {tab === "LOGIN" && (
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                setLoginMethod("whatsapp");
                setOtpSent(false);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginMethod === "whatsapp" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Smartphone className="w-3 h-3" />
              WhatsApp OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod("email");
                setOtpSent(false);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${loginMethod === "email" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"}`}
            >
              <Mail className="w-3 h-3" />
              Email
            </button>
          </div>
        )}

        {/* Forms */}
        {!otpSent ? (
          tab === "REGISTER" ? (
            /* Register Form (WhatsApp OTP) */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Brand / Store Name
                </label>
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
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Warehouse City
                </label>
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

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  WhatsApp Merchant Number
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+923001234567"
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
                <span>
                  {loading ? "Requesting OTP..." : "Send WhatsApp Access Code"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : loginMethod === "whatsapp" ? (
            /* WhatsApp Login Form */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+923001234567"
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
                <span>
                  {loading ? "Requesting OTP..." : "Send WhatsApp Access Code"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Email Login Form */
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seller@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-4 py-3 text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 text-slate-950 font-black rounded-2xl text-xs transition-all shadow-lg shadow-amber-400/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? "Signing in..." : "Sign In"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )
        ) : (
          /* OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Enter 6-Digit WhatsApp Code
              </label>
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
              <span>
                {loading ? "Verifying..." : "Access Merchant Dashboard"}
              </span>
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider shrink-0">
            OR CONTINUE WITH
          </span>
          <div className="border-t border-slate-800 w-full" />
        </div>

        {/* Social OAuth Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleOAuthLogin("GOOGLE")}
            className="flex items-center justify-center gap-2 p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("APPLE")}
            className="flex items-center justify-center gap-2 p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.65-.79 1.1-1.89.98-2.99-1 .04-2.19.67-2.88 1.48-.61.71-1.15 1.83-1.01 2.92 1.12.09 2.26-.62 2.91-1.41z" />
            </svg>
            <span>Apple</span>
          </button>
        </div>
      </div>
    </div>
  );
}
