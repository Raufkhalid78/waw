"use client";

import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import {
  ShieldCheck,
  Lock,
  RotateCcw,
  Truck,
  Award,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function BuyerProtectionPage() {
  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-12">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">
          100% Secure Checkout & Buyer Protection
        </span>
      </nav>

      {/* ── Hero Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            100% Secure Checkout
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Shop with Complete Confidence on{" "}
            <span className="text-amber-400">Waw</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
            Every transaction on Waw is securely processed.
          </p>
        </div>
      </div>

      {/* ── 4 Pillars of Buyer Protection ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-slate-950">
            1. Secure Checkout
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Your payment is processed through a safe, encrypted gateway.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-slate-950">
            2. 100% Genuine Guarantee
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            All 3P sellers undergo mandatory National CNIC and Business
            registration verification. Zero tolerance for counterfeits.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <RotateCcw className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-slate-950">
            3. 7-Day Hassle-Free Return
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            If an item arrives damaged, defective, or different from photos,
            claim a full refund or direct exchange with free doorstep reverse
            pickup.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="font-black text-base text-slate-950">
            4. Doorstep COD Inspection
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            For Cash on Delivery orders, inspect parcel seal and tracking
            details before remitting payment to the verified delivery rider.
          </p>
        </div>
      </div>

      {/* ── How Buyer Protection Works Step-by-Step ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8">
        <div>
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">
            How the Payment Process Protects You
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            End-to-end lifecycle of every purchase made on Waw
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-black text-amber-600 text-xs uppercase tracking-wider">
              Step 1
            </div>
            <div className="font-black text-sm text-slate-950">
              You Place Your Order
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Your payment is verified. The seller is notified to pack and
              prepare the parcel for courier pickup.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-black text-sky-600 text-xs uppercase tracking-wider">
              Step 2
            </div>
            <div className="font-black text-sm text-slate-950">
              Live Courier Tracking
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              PostEx Express Logistics delivers the package with real-time GPS
              milestones and automated WhatsApp SMS updates to your phone.
            </p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="font-black text-emerald-600 text-xs uppercase tracking-wider">
              Step 3
            </div>
            <div className="font-black text-sm text-slate-950">
              Confirmation & Settlement
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Once courier marks delivered and the 7-day inspection window
              passes smoothly, the net payout is released to the seller.
            </p>
          </div>
        </div>
      </div>

      {/* ── 24/7 Helpline Card ────────────────────────────────────────────── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1">
          <h3 className="text-lg font-black">
            Need assistance with an existing order?
          </h3>
          <p className="text-xs text-slate-400">
            Our customer dispute resolution team is available on WhatsApp.
          </p>
        </div>
        <a
          href={`https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+923001234567').replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all self-start sm:self-auto"
        >
          <WhatsAppIcon className="w-5 h-5" />
          <span>Chat on WhatsApp Helpline</span>
        </a>
      </div>
    </div>
  );
}
