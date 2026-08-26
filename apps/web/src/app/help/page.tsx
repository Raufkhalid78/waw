"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  MessageCircle,
  Truck,
  RotateCcw,
  CreditCard,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";

const FAQS = [
  {
    q: "How long does nationwide delivery take?",
    a: "Delivery across Pakistan generally takes 2-5 business days.",
    category: "Delivery",
  },
  {
    q: "How does Buyer Protection safeguard my payments?",
    a: "When you prepay via Card or Wallet, your payment is locked in a regulated escrow account. The funds are only remitted to the seller after the courier confirms successful delivery to your address.",
    category: "Payments",
  },
  {
    q: "How do I return a damaged or mismatched product?",
    a: 'You have 7 full days from delivery to request a return. Open your order in the Account portal (/account), click "Request Return", and our courier will arrange a free doorstep pickup with instant refund.',
    category: "Returns",
  },
  {
    q: "What payment methods are supported on Waw?",
    a: "We support State Bank Raast Instant P2M, 3D-Secure Visa & Mastercard, PayPak, JazzCash, Easypaisa, and Cash on Delivery (COD) with doorstep courier inspection.",
    category: "Payments",
  },
  {
    q: "How can I become a verified seller on Waw?",
    a: "Visit /sell, submit your store details, CNIC verification, and bank IBAN. Once reviewed by our compliance team within 2-4 hours, your store catalog goes live nationwide.",
    category: "Selling",
  },
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-12 py-8 space-y-12">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Link href="/" className="hover:text-amber-600 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold">Help & Support Center</span>
      </nav>

      {/* ── Hero Search Banner ───────────────────────────────────────────── */}
      <div className="bg-slate-950 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 max-w-4xl mx-auto shadow-2xl border border-slate-800">
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            How can we help you today?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium max-w-md mx-auto">
            Search answers on deliveries, secure payments, returns, and seller
            onboarding.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="e.g. Return policy, delivery time, Raast payment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {/* ── FAQ Accordion Section ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 max-w-4xl mx-auto shadow-xs space-y-6">
        <h2 className="text-xl font-black text-slate-950 tracking-tight">
          Frequently Asked Questions
        </h2>

        <div className="divide-y divide-slate-100 space-y-3">
          {filteredFaqs.map((faq, idx) => (
            <div key={idx} className="pt-3">
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left py-2 font-bold text-xs sm:text-sm text-slate-900 hover:text-amber-600 transition-colors gap-3"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${openIndex === idx ? "rotate-180 text-amber-600" : ""}`}
                />
              </button>
              {openIndex === idx && (
                <p className="text-xs text-slate-600 leading-relaxed font-medium pt-1 pb-3 pr-6 animate-fade-in">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Direct Contact Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-emerald-950">
            24/7 WhatsApp Helpline
          </h3>
          <p className="text-xs text-emerald-800 font-medium">
            Connect instantly with our bilingual customer representative in Urdu
            or English.
          </p>
          <a
            href="https://wa.me/923001234567"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-900 underline"
          >
            <span>Chat on WhatsApp (+92 300 1234567)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="p-6 bg-sky-50 border border-sky-200 rounded-3xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-black text-sm text-sky-950">Buyer Protection</h3>
          <p className="text-xs text-sky-800 font-medium">
            Learn more about our State Bank-regulated escrow vault and dispute
            guarantee.
          </p>
          <Link
            href="/buyer-protection"
            className="inline-flex items-center gap-1.5 text-xs font-black text-sky-900 underline"
          >
            <span>Read Escrow Guide</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
