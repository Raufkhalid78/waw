"use client";

import Link from "next/link";
import {
  RotateCcw,
  ShieldCheck,
  Truck,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Ban,
  PackageSearch,
  Wallet,
  Scissors,
  Package,
  Undo2,
  Gavel,
  Tag,
  MessageCircle,
} from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Home</span>
      </Link>

      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
          <RotateCcw className="w-4 h-4 text-emerald-600" />
          <span>7-Day Return Policy</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          Returns &amp; Refund Policy
        </h1>

        <p className="text-sm text-slate-500 font-medium">
          Effective Date: 15 September 2026 — Hassle-free 7-day doorstep
          returns with courier reverse pickup across Pakistan.
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
            the courier marks your package as delivered to test, inspect, and
            verify your item. Return requests submitted after day 7 are
            reviewed only for genuine defects covered by the defective-item
            process in Section 7.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>2. Eligibility Criteria</span>
          </h2>
          <p>To be accepted, returned items must be:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>Unused and in resalable condition.</li>
            <li>
              In their original packaging with all tags, accessories, and
              manuals intact.
            </li>
          </ul>
          <p className="font-bold text-slate-800">
            The following are excluded from return unless defective:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>Hygiene-sensitive items (e.g., undergarments, personal care).</li>
            <li>Opened cosmetics and perfumes.</li>
            <li>Customized or personalized items (engraving, custom sizes).</li>
            <li>
              Digital goods (gift cards, top-ups, and downloadable content).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Undo2 className="w-5 h-5 text-amber-500" />
            <span>3. How to Initiate a Return</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Online:</strong> open your{" "}
              <Link
                href="/account"
                className="text-amber-600 font-bold hover:underline"
              >
                Orders page
              </Link>
              , select the order, and choose{" "}
              <strong>&ldquo;Request Return&rdquo;</strong>.
            </li>
            <li>
              <strong>WhatsApp:</strong> message our 24/7 support line with
              your order number and the item(s) you want to return.
            </li>
          </ul>
          <p>
            Have your order number ready — it is in your WhatsApp receipt and
            on the Orders page. You never pay return shipping or visit a
            courier franchise for eligible returns.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            <span>4. Process &amp; Timeline</span>
          </h2>
          <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Approval:</strong> we review your request and confirm
              eligibility.
            </li>
            <li>
              <strong>Reverse pickup:</strong> a PostEx courier collects the
              parcel from your doorstep within{" "}
              <strong>2–5 working days</strong>.
            </li>
            <li>
              <strong>Inspection:</strong> the returned item is inspected
              within <strong>1–2 working days</strong> of reaching the
              warehouse.
            </li>
            <li>
              <strong>Refund:</strong> once inspection passes, your refund is
              released per Section 5 and you are notified via WhatsApp.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-500" />
            <span>5. Refund Methods &amp; Timelines</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Prepaid orders (source refund):</strong> amounts go back
              to the original payment method — Bank Alfalah Alfa Wallet /
              account, Raast, or card. Depending on your bank&apos;s
              processing, funds appear within <strong>5–10 working days</strong>{" "}
              after the refund is released. Waw stores only the payment status
              and bank reference, so source refunds are routed through the
              payment processor.
            </li>
            <li>
              <strong>COD orders:</strong> refunded by{" "}
              <strong>bank transfer to your IBAN or via Raast</strong>. Share
              your IBAN with our WhatsApp support team, and the transfer is
              processed within <strong>3–5 working days</strong> of inspection
              approval.
            </li>
            <li>
              <strong>Loyalty points:</strong> any loyalty points earned on
              the returned items are reversed automatically.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-amber-500" />
            <span>6. Partial &amp; Multi-Item Returns</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              In a multi-item order, only the returned items are refunded —
              kept items are charged normally.
            </li>
            <li>
              The delivery fee is not refunded unless the{" "}
              <strong>entire order</strong> is returned or a returned item was{" "}
              <strong>defective or incorrect</strong>.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>7. Defective or Wrong Item Received</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              Report the issue immediately with <strong>photo evidence</strong>{" "}
              (unboxing photos or short videos help) via the Orders page or
              WhatsApp support.
            </li>
            <li>
              Confirmed defective or wrong-item cases receive a{" "}
              <strong>full refund including the delivery fee</strong>, and the
              return pickup is free.
            </li>
            <li>
              Defective items are exempt from the exclusions in Section 2 —
              cosmetics, perfumes, customized, and digital goods can still be
              refunded if they are genuinely defective.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            <span>8. Failed Delivery &amp; Lost Parcels</span>
          </h2>
          <p>
            If a parcel is not delivered within the promised timeline, we open
            an investigation with the courier (PostEx / TCS). If the parcel is
            confirmed lost or undeliverable, you receive a{" "}
            <strong>full refund</strong> — including the delivery fee and any
            COD amount already paid. Refunds follow the method rules in
            Section 5.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-500" />
            <span>9. Seller Disputes &amp; Buyer Protection</span>
          </h2>
          <p>
            If a seller rejects a return you believe is valid, Waw mediates
            the dispute. Prepaid funds are held in escrow until delivery is
            confirmed, and our{" "}
            <Link
              href="/buyer-protection"
              className="text-amber-600 font-bold hover:underline"
            >
              buyer protection program
            </Link>{" "}
            can enforce a refund where the evidence supports the buyer.
            Escrow release, evidence review, and mediation follow the dispute
            resolution steps in our Terms of Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <span>10. Non-Returnable Final Sale Items</span>
          </h2>
          <p>
            Some items are sold on a final-sale basis and are clearly flagged
            on the product page before you add them to the cart. Final-sale
            items cannot be returned unless they arrive defective, in which
            case Section 7 applies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-amber-500" />
            <span>11. Contact &amp; Effective Date</span>
          </h2>
          <p>
            Questions about a return or refund? Email{" "}
            <strong>care@waw.com.pk</strong> or message our 24/7 WhatsApp
            helpline with your order number. This policy is effective as of{" "}
            <strong>15 September 2026</strong> and applies alongside our{" "}
            <Link
              href="/terms"
              className="text-amber-600 font-bold hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-amber-600 font-bold hover:underline"
            >
              Privacy Policy
            </Link>
            . WAW TECHNOLOGIES (SMC-PRIVATE) LIMITED — NTN 8945201-3, SECP
            Reg. # 0192847.
          </p>
        </section>
      </div>
    </div>
  );
}
