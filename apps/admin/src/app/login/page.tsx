"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+923001234567");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/whatsapp-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        body: JSON.stringify({ phone, otp, role: "ADMIN" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      localStorage.setItem("waw_admin_token", data.token);
      localStorage.setItem(
        "waw_admin_user",
        JSON.stringify(data.user || { role: "ADMIN", phone }),
      );
      router.push("/");
    } catch (err: any) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div className="inline-block text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-0.5 rounded-full">
            Staff Portal
          </div>
          <h1 className="text-2xl font-black text-white">
            Waw Operations Command
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access real-time dispatch, KYC moderation, and merchant settlements.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Registered Staff Phone
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
                {loading ? "Verifying..." : "Authenticate & Enter Dashboard"}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
