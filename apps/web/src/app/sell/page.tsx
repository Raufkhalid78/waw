"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Store,
  ShieldCheck,
  Truck,
  Banknote,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Building2,
  FileText,
  CreditCard,
  Phone,
  ChevronRight,
} from "lucide-react";

const PAKISTAN_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Peshawar",
  "Multan",
  "Faisalabad",
  "Sialkot",
  "Gujranwala",
  "Quetta",
  "Hyderabad",
];

const CATEGORIES = [
  "Leather & Footwear",
  "Mobiles & Tech",
  "Smart Watches",
  "Sialkot Sports",
  "Women's Unstitched Apparel",
  "Home & Heritage Handcrafts",
  "Jewellery & Fragrances",
];

export default function SellOnWawPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");

  const [formData, setFormData] = useState({
    storeName: "",
    category: CATEGORIES[0],
    city: PAKISTAN_CITIES[0],
    businessAddress: "",
    ownerName: "",
    cnic: "",
    ntn: "",
    whatsappPhone: "",
    email: "",
    bankName: "Meezan Bank Ltd",
    accountTitle: "",
    iban: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("waw_auth_token");
      if (!token) {
        throw new Error("You must be logged in to apply for a seller account.");
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API_URL}/api/seller/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit application");
      
      setApplicationId(`KYC-WAW-${Math.floor(10000 + Math.random() * 90000)}`);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-12">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">Sell on Waw</span>
      </nav>

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Pakistan Merchant Network
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Grow Your Business Across Pakistan with{" "}
            <span className="text-amber-400">Waw</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            Join Pakistan’s growing merchant network of authentic artisans,
            wholesalers, and brand distributors. Reach customers nationwide with
            automated courier logistics and direct bank settlements.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-800/80">
          <div className="flex items-start gap-3 bg-slate-900/60 backdrop-blur-xs p-4 rounded-2xl border border-slate-800">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white">
                0% Listing Fee
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Pay only 10% on successful delivered sales
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-900/60 backdrop-blur-xs p-4 rounded-2xl border border-slate-800">
            <div className="p-2.5 rounded-xl bg-sky-400/10 text-sky-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white">
                Nationwide PostEx Logistics
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Automated doorstep pickups & label generation
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-900/60 backdrop-blur-xs p-4 rounded-2xl border border-slate-800">
            <div className="p-2.5 rounded-xl bg-emerald-400/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white">
                Waw Seller Protection
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Guaranteed payouts direct to your IBAN
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Registration Form Card ───────────────────────────────────────── */}
      {!submitted ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs max-w-3xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-amber-500" />
              <span>Merchant KYC Registration</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Complete your verification to launch your storefront on Waw Market
            </p>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-100 pb-4">
            {[
              { num: 1, label: "Store Details" },
              { num: 2, label: "CNIC & KYC" },
              { num: 3, label: "Bank Settlement" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-2 ${
                  step === s.num
                    ? "text-amber-600 font-black"
                    : step > s.num
                      ? "text-emerald-600"
                      : "text-slate-400"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    step === s.num
                      ? "bg-amber-400 text-slate-950"
                      : step > s.num
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            {/* ── Step 1: Store Details ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Store / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Peshawar Leather Crafts"
                    value={formData.storeName}
                    onChange={(e) => handleChange("storeName", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      Primary Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      Origin City *
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                    >
                      {PAKISTAN_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Workshop / Business Address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Shop 14, Namak Mandi Artisan Market, Peshawar"
                    value={formData.businessAddress}
                    onChange={(e) =>
                      handleChange("businessAddress", e.target.value)
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    formData.storeName && formData.businessAddress
                      ? setStep(2)
                      : alert("Please fill in your store details.")
                  }
                  className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Continue to CNIC Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Step 2: CNIC & Legal KYC ───────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Owner Full Name (as on CNIC) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Aslam"
                    value={formData.ownerName}
                    onChange={(e) => handleChange("ownerName", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      National CNIC Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 42101-1234567-1"
                      value={formData.cnic}
                      onChange={(e) => handleChange("cnic", e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      FBR NTN Tax Number (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NTN-7891234-5"
                      value={formData.ntn}
                      onChange={(e) => handleChange("ntn", e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      WhatsApp Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+92 300 1234567"
                      value={formData.whatsappPhone}
                      onChange={(e) =>
                        handleChange("whatsappPhone", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      Business Email
                    </label>
                    <input
                      type="email"
                      placeholder="store@example.pk"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      formData.ownerName &&
                      formData.cnic &&
                      formData.whatsappPhone
                        ? setStep(3)
                        : alert("Please fill in your CNIC and contact details.")
                    }
                    className="w-2/3 py-3.5 bg-slate-950 hover:bg-slate-900 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>Continue to Bank Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Bank Settlement Details ────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Direct Bank Settlements</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Your sales revenue is deposited directly into your verified
                    Pakistani bank account via Raast / 1Link within the
                    scheduled payout timeline after customer delivery.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Bank Name *
                  </label>
                  <select
                    value={formData.bankName}
                    onChange={(e) => handleChange("bankName", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  >
                    {[
                      "Meezan Bank Ltd",
                      "Habib Bank Limited (HBL)",
                      "Bank Alfalah",
                      "Standard Chartered Bank",
                      "MCB Bank",
                      "United Bank Limited (UBL)",
                      "Faysal Bank",
                    ].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    Title of Account (Must match CNIC) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Muhammad Aslam"
                    value={formData.accountTitle}
                    onChange={(e) =>
                      handleChange("accountTitle", e.target.value)
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    24-Digit Pakistani IBAN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="PK36MEZN0001234567890123"
                    value={formData.iban}
                    onChange={(e) => handleChange("iban", e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-mono font-medium uppercase"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={isSubmitting}
                    className="w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-3.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <span>Submit KYC Application</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      ) : (
        /* ── Application Submitted State ──────────────────────────────────── */
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-950">
              KYC Application Submitted!
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Thank you for applying to sell on Waw Market. Your application has
              been logged under verification ID:
            </p>
            <div className="inline-block px-4 py-2 bg-slate-100 rounded-xl font-mono font-bold text-amber-700 text-sm border border-slate-200">
              {applicationId}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
            <div className="font-bold text-slate-900">What happens next?</div>
            <p>
              1. Our compliance team will verify your CNIC credentials within
              2-4 business hours.
            </p>
            <p>
              2. You will receive an automated WhatsApp confirmation on{" "}
              <strong className="text-slate-900">
                {formData.whatsappPhone || "+92 300 1234567"}
              </strong>
              .
            </p>
            <p>3. Once approved, your products will go live across Pakistan!</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="/seller"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-full text-xs transition-all shadow-xs"
            >
              <Store className="w-4 h-4" />
              <span>Go to Seller Portal</span>
            </a>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-black rounded-full text-xs transition-all shadow-xs"
            >
              <span>Return to Homepage</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
