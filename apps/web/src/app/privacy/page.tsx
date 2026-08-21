'use client';

import Link from 'next/link';
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

export default function PrivacyPolicyPage() {
  const { language } = useCartStore();
  const isUrdu = language === 'UR';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isUrdu ? 'واپس ہوم پیج' : 'Back to Home'}</span>
      </Link>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>{isUrdu ? 'اسٹیٹ بینک آف پاکستان کنزیومر پروٹیکشن' : 'SBP & PECA 2016 Compliant'}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          {isUrdu ? 'پرائیویسی پالیسی اور ڈیٹا پروٹیکشن' : 'Privacy & Data Protection Policy'}
        </h1>

        <p className="text-sm text-slate-500 font-medium">
          {isUrdu
            ? 'آخری اپ ڈیٹ: اگست 2026 — آپ کے ذاتی ڈیٹا اور مالیاتی لین دین کا تحفظ ہماری اولین ترجیح ہے۔'
            : 'Last Updated: August 2026 — Safeguarding your personal, banking, and order data in Pakistan.'}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <span>1. Information We Collect</span>
          </h2>
          <p>
            When you register, place orders, or sell on <strong>Waw (واو)</strong>, we collect necessary transactional information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
            <li><strong>Personal Identity:</strong> Full Name, WhatsApp Mobile Number, Delivery Address, City, and Province.</li>
            <li><strong>Order History:</strong> SKUs purchased, order numbers, dispatch tracking links, and returns.</li>
            <li><strong>Payment Identifiers:</strong> SBP Raast transaction IDs, tokenized card hashes (we never store raw 16-digit card PANs or CVVs).</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-500" />
            <span>2. How Your Data is Used</span>
          </h2>
          <p>
            Your information is strictly utilized to facilitate verified commerce, dispatch parcel consignments via PostEx logistics, and send instant WhatsApp status receipts. We never sell, rent, or trade your contact information to third-party telemarketers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>3. State Bank of Pakistan (SBP) Escrow Vault</span>
          </h2>
          <p>
            All online prepayments (Raast P2M, Visa, Mastercard, PayPak) are deposited directly into our State Bank of Pakistan regulated escrow accounts until you receive, inspect, and approve your delivery.
          </p>
        </section>
      </div>
    </div>
  );
}
