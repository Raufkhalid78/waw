"use client";

import Link from "next/link";
import {
  RotateCcw,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";

export default function RefundPolicyPage() {
  const { language } = useCartStore();
  const isUrdu = language === "UR";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isUrdu ? "واپس ہوم پیج" : "Back to Home"}</span>
      </Link>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
          <RotateCcw className="w-4 h-4 text-emerald-600" />
          <span>
            {isUrdu ? "7 دن گارنٹی شدہ واپسی کی سہولت" : "7-Day Return Policy"}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          {isUrdu
            ? "واپسی اور رقم کی واپسی کی پالیسی"
            : "Returns & 100% Money-Back Policy"}
        </h1>

        <p className="text-sm text-slate-500 font-medium">
          {isUrdu
            ? "ہر خریداری پر 7 دن کی مکمل گارنٹی اور مفت ڈور سٹیپ پوسٹ ایکس پک اپ۔"
            : "Hassle-free 7-day doorstep returns with instant PostEx reverse pickup across Pakistan."}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>1. The 7-Day Window</span>
          </h2>
          <p>
            You have a full <strong>7 calendar days</strong> from the moment
            PostEx marks your package as delivered to test, inspect, and verify
            your item.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>2. Valid Return Reasons</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>Item damaged in transit or defective.</li>
            <li>
              Item does not match website specifications, photos, or
              description.
            </li>
            <li>Incorrect size, color, or wrong SKU delivered.</li>
            <li>
              Counterfeit or suspected unauthentic goods (100% instant refund).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            <span>3. Free Doorstep Reverse Pickup</span>
          </h2>
          <p>
            You never have to visit a courier franchise or pay return shipping
            fees. When you initiate a return via your account or{" "}
            <Link
              href="/orders/WAW-PK-88492/return"
              className="text-amber-600 font-bold hover:underline"
            >
              Self-Service Return Wizard
            </Link>
            , a PostEx courier rider will collect the parcel directly from your
            doorstep within 24 hours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>4. Refund Processing Time</span>
          </h2>
          <p>
            Refunds are released from secure payments directly back to your
            original payment method (Bank Account, Raast, JazzCash, Easypaisa)
            within <strong>24 to 48 hours</strong> of receipt verification.
          </p>
        </section>
      </div>
    </div>
  );
}
