"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Mail, Smartphone, CheckCircle2, ChevronLeft } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { useCartStore } from "@/store/useCartStore";

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (identifier: string) => void;
}) {
  const { language, login } = useCartStore();
  const isUrdu = language === "UR";

  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [step, setStep] = useState<"INPUT" | "OTP" | "SUCCESS">("INPUT");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(45);

  useEffect(() => {
    let interval: any;
    if (step === "OTP" && resendTimer > 0) {
      interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  if (!isOpen) return null;

  const isEmail = identifier.includes("@");
  const hasInput = identifier.trim().length > 0;
  const formattedTarget = isEmail
    ? identifier
    : identifier.startsWith("+")
      ? identifier
      : `+92 ${identifier.replace(/^0+/, "")}`;

  const parseDisplayName = (raw: string) => {
    if (raw.includes("@")) {
      const userPart = raw.split("@")[0].replace(/[._]/g, " ");
      return userPart
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "Ali Khan";
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasInput) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResendTimer(45);
      setStep("OTP");
    }, 600);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next box
    if (val && index < 5) {
      const nextInput = document.getElementById(`waw-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("SUCCESS");

      // Update global user authentication state
      const userName = parseDisplayName(identifier);
      login({
        name: userName,
        emailOrPhone: identifier,
      });

      setTimeout(() => {
        if (onSuccess) onSuccess(identifier);
        onClose();
        setStep("INPUT");
        setOtp(["", "", "", "", "", ""]);
      }, 1000);
    }, 700);
  };

  const handleOAuthLogin = (provider: "GOOGLE" | "APPLE") => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("SUCCESS");

      const userName = provider === "GOOGLE" ? "Rauf Khalid" : "Rauf Khalid";
      const userEmail =
        provider === "GOOGLE"
          ? "rauf.khalid@gmail.com"
          : "rauf.khalid@icloud.com";

      login({
        name: userName,
        emailOrPhone: userEmail,
      });

      setTimeout(() => {
        if (onSuccess) onSuccess(userEmail);
        onClose();
        setStep("INPUT");
      }, 1000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-[36px] overflow-hidden max-w-[430px] w-full shadow-2xl border border-slate-100 z-10 animate-scale-up my-auto">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 shadow-md flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Refined Luxury Golden Showcase Header ───────────────────────── */}
        <div className="relative bg-[#FFEB00] h-52 sm:h-56 w-full overflow-hidden flex items-center justify-center select-none shadow-inner">
          {/* Subtle Ambient Light Highlights */}
          <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

          {/* Large Prominent Product Cards Composition */}
          <div className="relative w-full h-full max-w-[400px] px-3 flex items-center justify-between">
            {/* Left Column (Large Prominent Showcase Cards) */}
            <div className="flex flex-col gap-2.5 pl-1">
              {/* iPhone 15 Pro (Large) */}
              <div className="w-[84px] h-[84px] sm:w-[90px] sm:h-[90px] rounded-3xl bg-white shadow-xl border-2 border-white/80 p-1 flex items-center justify-center transform -rotate-6 hover:scale-105 transition-transform overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=200&auto=format&fit=crop&q=80"
                  alt="Smartphone"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>

              {/* Handcrafted Peshawari Chappal (Large) */}
              <div className="w-[84px] h-[84px] sm:w-[90px] sm:h-[90px] rounded-3xl bg-white shadow-xl border-2 border-white/80 p-1 flex items-center justify-center transform rotate-6 hover:scale-105 transition-transform overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=200&auto=format&fit=crop&q=80"
                  alt="Footwear"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>

            {/* Centerpiece: Clean Pure Waw 'و' Squircle (NO STAR) */}
            <div className="flex flex-col items-center justify-center space-y-2 z-10 mx-1">
              <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-[28px] bg-slate-950 text-[#FFEB00] font-black text-5xl shadow-2xl border-2 border-white flex items-center justify-center transform hover:scale-105 transition-transform">
                <span>و</span>
              </div>
              <div className="bg-slate-950 px-3.5 py-1 rounded-full text-[10px] font-black text-[#FFEB00] tracking-wider uppercase shadow-md border border-white/20">
                waw.com.pk
              </div>
            </div>

            {/* Right Column (Large Prominent Showcase Cards) */}
            <div className="flex flex-col gap-2.5 pr-1">
              {/* Studio ANC Headphones (Large) */}
              <div className="w-[84px] h-[84px] sm:w-[90px] sm:h-[90px] rounded-3xl bg-white shadow-xl border-2 border-white/80 p-1 flex items-center justify-center transform rotate-6 hover:scale-105 transition-transform overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&auto=format&fit=crop&q=80"
                  alt="Headphones"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>

              {/* Luxury Oud & Fragrance (Large) */}
              <div className="w-[84px] h-[84px] sm:w-[90px] sm:h-[90px] rounded-3xl bg-white shadow-xl border-2 border-white/80 p-1 flex items-center justify-center transform -rotate-6 hover:scale-105 transition-transform overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=200&auto=format&fit=crop&q=80"
                  alt="Fragrance"
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Modal Content Area ───────────────────────────────────────────── */}
        <div className="px-6 py-5 sm:px-7 sm:py-6 space-y-4 text-slate-900">
          {/* Header Title */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
              {isUrdu ? "خوش آمدید! شروع کریں" : "Welcome! Let’s get started"}
            </h2>
          </div>

          {/* ── STEP 1: Entry Mode (Log in / Sign up + Email/Phone + OAuth) ──── */}
          {step === "INPUT" && (
            <div className="space-y-3.5">
              {/* Segmented Tab Pill: Log in vs Sign up */}
              <div className="bg-[#2D3344] p-1 rounded-2xl flex items-center text-xs font-bold text-white shadow-inner">
                <button
                  type="button"
                  onClick={() => setMode("LOGIN")}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                    mode === "LOGIN"
                      ? "bg-white text-slate-900 shadow-md font-black"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isUrdu ? "لاگ ان کریں" : "Log in"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("SIGNUP")}
                  className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                    mode === "SIGNUP"
                      ? "bg-white text-slate-900 shadow-md font-black"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isUrdu ? "نیا اکاؤنٹ بنائیں" : "Sign up"}
                </button>
              </div>

              {/* Form Input */}
              <form onSubmit={handleContinue} className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      isUrdu
                        ? "ای میل یا موبائل نمبر درج کریں"
                        : "Please enter email or mobile number"
                    }
                    required
                    autoFocus
                    className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-xs"
                  />
                  <div className="absolute right-3.5 top-3.5 text-slate-400 pointer-events-none">
                    {isEmail ? (
                      <Mail className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Primary Continue CTA */}
                <button
                  type="submit"
                  disabled={loading || !hasInput}
                  className={`w-full font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    hasInput
                      ? "bg-[#2D3344] hover:bg-slate-950 text-white hover:shadow-lg hover:scale-[1.01]"
                      : "bg-[#E2E6EE] text-[#8E9AA8] cursor-not-allowed shadow-none"
                  }`}
                >
                  {loading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{isUrdu ? "جاری رکھیں" : "CONTINUE"}</span>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-1.5">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0">
                  {isUrdu ? "یا اس کے ساتھ جاری رکھیں" : "OR CONTINUE WITH"}
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Social OAuth Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={() => handleOAuthLogin("GOOGLE")}
                  className="flex items-center justify-center gap-2 p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                {/* Apple OAuth */}
                <button
                  type="button"
                  onClick={() => handleOAuthLogin("APPLE")}
                  className="flex items-center justify-center gap-2 p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer group"
                >
                  <svg
                    className="w-4 h-4 fill-slate-900 shrink-0"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.65-.79 1.1-1.89.98-2.99-1 .04-2.19.67-2.88 1.48-.61.71-1.15 1.83-1.01 2.92 1.12.09 2.26-.62 2.91-1.41z" />
                  </svg>
                  <span>Apple</span>
                </button>
              </div>

              {/* WhatsApp Quick OTP Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIdentifier("+92 300 1234567");
                  setStep("OTP");
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200 rounded-2xl text-xs font-black text-emerald-800 transition-all shadow-xs cursor-pointer"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>
                  {isUrdu
                    ? "واٹس ایپ فاسٹ ون کلک لاگ ان"
                    : "Fast WhatsApp Instant Login"}
                </span>
              </button>

              {/* Privacy Footer */}
              <p className="text-[11px] text-center text-slate-500 font-medium pt-0.5 leading-snug">
                {isUrdu
                  ? "جاری رکھ کر آپ ہماری "
                  : "By continuing, I confirm that I have read the "}
                <Link
                  href="/privacy"
                  onClick={onClose}
                  className="font-bold text-amber-600 hover:underline"
                >
                  {isUrdu ? "پرائیویسی پالیسی" : "Privacy Policy"}
                </Link>
                {isUrdu ? " اور " : " & "}
                <Link
                  href="/terms"
                  onClick={onClose}
                  className="font-bold text-amber-600 hover:underline"
                >
                  {isUrdu ? "شرائط و ضوابط" : "Terms of Service"}
                </Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: 6-Digit OTP Verification Code ────────────────────────── */}
          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-600">
                  {isUrdu
                    ? "ہم نے 6 ہندسوں کا تصدیقی کوڈ بھیجا ہے:"
                    : "We sent a 6-digit verification code to:"}
                </p>
                <div className="inline-block px-3 py-1 bg-amber-50 rounded-full border border-amber-200 text-xs font-black text-slate-900">
                  {formattedTarget}
                </div>
              </div>

              {/* 6 OTP Boxes */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`waw-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !digit && idx > 0) {
                        const prev = document.getElementById(
                          `waw-otp-${idx - 1}`,
                        );
                        if (prev) prev.focus();
                      }
                    }}
                    className="w-11 h-12 text-center font-black text-lg text-slate-950 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-xs"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || otp.some((d) => !d)}
                className="w-full bg-[#2D3344] hover:bg-slate-950 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    {isUrdu ? "کوڈ کی تصدیق کریں" : "VERIFY & PROCEED"}
                  </span>
                )}
              </button>

              <div className="flex items-center justify-between text-xs font-bold pt-1 text-slate-500">
                <button
                  type="button"
                  onClick={() => setStep("INPUT")}
                  className="flex items-center gap-1 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>
                    {isUrdu ? "نمبر تبدیل کریں" : "Change number/email"}
                  </span>
                </button>

                {resendTimer > 0 ? (
                  <span className="text-slate-400 font-normal">
                    {isUrdu
                      ? `دوبارہ بھیجیں: ${resendTimer}s`
                      : `Resend code in ${resendTimer}s`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResendTimer(45)}
                    className="text-amber-600 hover:text-amber-700 underline cursor-pointer"
                  >
                    {isUrdu ? "دوبارہ کوڈ بھیجیں" : "Resend Code"}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ── STEP 3: Success State ────────────────────────────────────────── */}
          {step === "SUCCESS" && (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-lg font-black text-slate-950">
                {isUrdu
                  ? "کامیابی سے لاگ ان ہو گئے!"
                  : "Signed in Successfully!"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isUrdu
                  ? "واو میں خوش آمدید"
                  : "Redirecting to your personalized Waw dashboard..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
