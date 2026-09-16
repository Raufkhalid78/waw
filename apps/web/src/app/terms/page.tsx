"use client";

import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  Scale,
  CheckCircle2,
  ArrowLeft,
  Store,
  ShoppingCart,
  CreditCard,
  Truck,
  Ban,
  RotateCcw,
  Copyright,
  XCircle,
  Landmark,
  MessageSquare,
  Scissors,
  AlertTriangle,
} from "lucide-react";

export default function TermsOfServicePage() {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>Waw Marketplace Terms</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          Terms of Service
        </h1>

        <p className="text-sm text-slate-500 font-medium">
          Effective Date: 15 September 2026 — Governing user, buyer, and
          merchant participation across Pakistan.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            <span>1. Definitions &amp; Acceptance</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>&ldquo;Waw&rdquo; / &ldquo;Platform&rdquo; / &ldquo;we&rdquo;:</strong>{" "}
              WAW TECHNOLOGIES (SMC-PRIVATE) LIMITED (NTN 8945201-3, SECP
              Reg. # 0192847), operator of waw.com.pk.
            </li>
            <li>
              <strong>&ldquo;Buyer&rdquo; / &ldquo;you&rdquo;:</strong> any
              person who browses, orders, or holds an account on Waw.
            </li>
            <li>
              <strong>&ldquo;Seller&rdquo; / &ldquo;Merchant&rdquo;:</strong> a
              KYC-verified business or individual selling on Waw.
            </li>
            <li>
              <strong>&ldquo;Order&rdquo;:</strong> a request to purchase items
              accepted through checkout.
            </li>
          </ul>
          <p>
            By accessing or using Waw you accept these Terms of Service, our{" "}
            <Link
              href="/privacy"
              className="text-amber-600 font-bold hover:underline"
            >
              Privacy Policy
            </Link>
            , and our{" "}
            <Link
              href="/refund-policy"
              className="text-amber-600 font-bold hover:underline"
            >
              Refund &amp; Return Policy
            </Link>
            . If you do not agree, please do not use the Platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>2. Your Account Responsibilities</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              Provide accurate and current information, especially your phone
              number and delivery address.
            </li>
            <li>
              Complete OTP verification via WhatsApp/SMS when prompted; keep
              your OTPs confidential.
            </li>
            <li>
              Keep your account credentials secure. You are responsible for
              activity under your account. Notify us immediately at
              care@waw.com.pk if you suspect unauthorized use.
            </li>
            <li>You must be at least 18 years old to hold an account.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-500" />
            <span>3. Marketplace Role</span>
          </h2>
          <p>
            <strong>Waw (واو)</strong> operates as a hybrid marketplace
            platform:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Platform / Intermediary:</strong> Waw connects buyers and
              sellers, processes payments, and coordinates delivery and
              returns.
            </li>
            <li>
              <strong>Third-Party (3P) items:</strong> the Seller is the
              merchant of record — responsible for listing accuracy, item
              quality, and fulfillment. Waw facilitates payment, delivery, and
              dispute resolution.
            </li>
            <li>
              <strong>Waw Express (1P) items:</strong> sold directly by Waw,
              which acts as the merchant of record and provides 24-hour
              dispatch.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-500" />
            <span>4. Ordering, Pricing &amp; Stock Reservation</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              Prices shown in your cart are an <strong>indicative quote</strong>;
              the final price is confirmed when your order is placed.
            </li>
            <li>
              Prices include applicable taxes where stated. GST and other
              applicable taxes are applied per prevailing Pakistani law; Waw is
              not responsible for a Seller&apos;s tax classification errors.
            </li>
            <li>
              Placing an order reserves stock for <strong>15 minutes</strong>;
              if payment is not completed in that window, the reservation and
              order may be cancelled automatically.
            </li>
            <li>
              Despite reasonable controls, pricing, stock, and description
              errors may occur. If we discover a material error before
              dispatch, we will inform you and you may reconfirm at the correct
              price or cancel for a full refund. This reservation of rights is
              exercised in good faith.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <span>5. Payment Terms</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Cash on Delivery (COD):</strong> available nationwide;
              carries a non-refundable <strong>PKR 100</strong> handling
              surcharge.
            </li>
            <li>
              <strong>Bank Alfalah Alfa Wallet / account:</strong> pay onsite
              through your Alfa account.
            </li>
            <li>
              <strong>Cards (Visa / Mastercard / PayPak):</strong> processed on
              Bank Alfalah APG&apos;s secure hosted page — your card data never
              touches Waw servers.
            </li>
            <li>
              <strong>Raast QR:</strong> scan and pay instantly from any
              Raast-enabled bank or wallet app.
            </li>
            <li>
              <strong>Free delivery threshold:</strong> orders over{" "}
              <strong>PKR 5,000</strong> qualify for free standard delivery;
              below that, standard delivery fees apply at checkout.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            <span>6. Delivery</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              We deliver <strong>nationwide</strong> across Pakistan via partner
              couriers (PostEx / TCS).
            </li>
            <li>
              Indicative timelines: major cities 2–5 working days; other
              regions may take longer. Tracking is shared via WhatsApp and the
              Orders page.
            </li>
            <li>
              <strong>Risk of loss passes to you upon delivery.</strong> Please
              inspect items at the doorstep where possible and report issues
              within the 7-day return window.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>7. Seller Obligations</span>
          </h2>
          <p>All registered third-party merchants agree to:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              Complete KYC verification (CNIC and bank IBAN) and keep records
              current.
            </li>
            <li>
              Maintain accurate listings: genuine products, authentic imagery,
              honest descriptions, and correct pricing.
            </li>
            <li>
              Fulfill and dispatch confirmed orders within 24–48 hours via the
              Platform&apos;s contracted courier network.
            </li>
            <li>
              Refrain from listing prohibited items (counterfeit, hazardous,
              illegal, or restricted goods) — violations lead to immediate
              suspension and escrow forfeiture.
            </li>
            <li>Honor the mandatory 7-day return guarantee.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Ban className="w-5 h-5 text-amber-500" />
            <span>8. Prohibited Conduct</span>
          </h2>
          <p>When using Waw, you must not:</p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              Commit or attempt payment fraud, including false disputes and
              chargeback abuse.
            </li>
            <li>
              Scrape, crawl, or harvest the Platform&apos;s data or content
              without written permission.
            </li>
            <li>
              Post fake reviews, manipulate ratings, or impersonate another
              person or business.
            </li>
            <li>
              Abuse OTP verification (e.g., automated requests, bypass
              attempts) or interfere with the Platform&apos;s security controls.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            <span>9. Returns &amp; Disputes</span>
          </h2>
          <p>
            Returns follow the{" "}
            <Link
              href="/refund-policy"
              className="text-amber-600 font-bold hover:underline"
            >
              7-Day Refund &amp; Return Policy
            </Link>
            . In short: eligible items may be returned within 7 calendar days
            of delivery; prepaid payments are held in escrow until delivery is
            confirmed; and Waw&apos;s{" "}
            <Link
              href="/buyer-protection"
              className="text-amber-600 font-bold hover:underline"
            >
              buyer protection program
            </Link>{" "}
            mediates disputes and enforces refunds where the buyer is right.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Copyright className="w-5 h-5 text-amber-500" />
            <span>10. Intellectual Property</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              The Platform — including its branding, design, code, and
              original content — is the intellectual property of Waw.
            </li>
            <li>
              Sellers retain all rights in their product images, descriptions,
              and trademarks; by listing, they grant Waw a non-exclusive,
              worldwide license to display and promote those listings on the
              Platform.
            </li>
            <li>
              You may not reuse Platform content or Seller content without the
              owner&apos;s permission.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-amber-500" />
            <span>11. Limitation of Liability</span>
          </h2>
          <p>
            To the maximum extent permitted by applicable law, Waw&apos;s total
            aggregate liability arising from or related to any order is capped
            at the amount you paid for that order. Waw is not liable for
            indirect or consequential losses. Nothing in these Terms excludes
            liability that cannot be excluded under Pakistani law, and this
            section does not limit your statutory consumer rights or the
            buyer protection program.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>12. Suspension &amp; Termination</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              We may suspend or ban accounts for fraud, counterfeiting,
              repeated breach of these Terms, or abuse of the Platform or its
              staff.
            </li>
            <li>
              You may stop using Waw and close your account at any time by
              contacting care@waw.com.pk.
            </li>
            <li>
              Termination does not cancel orders in transit or remove
              obligations to pay amounts due.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-amber-500" />
            <span>13. Governing Law &amp; Jurisdiction</span>
          </h2>
          <p>
            These Terms are governed by the laws of the{" "}
            <strong>Islamic Republic of Pakistan</strong>. Subject to the
            dispute resolution process in Section 14, the courts at{" "}
            <strong>Lahore, Pakistan</strong> have exclusive jurisdiction over
            any matter arising out of these Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            <span>14. Dispute Resolution</span>
          </h2>
          <p>We resolve disputes in a staged, good-faith manner:</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Support ticket:</strong> contact care@waw.com.pk or
              WhatsApp support with your order number.
            </li>
            <li>
              <strong>Escalation:</strong> if unresolved within 7 days, request
              escalation to a senior dispute handler for mediation.
            </li>
            <li>
              <strong>Arbitration / courts:</strong> if mediation fails,
              disputes are resolved by arbitration or the competent courts of
              Pakistan in accordance with Pakistani law.
            </li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-500" />
            <span>15. Amendments</span>
          </h2>
          <p>
            We may update these Terms from time to time. Material changes will
            be notified on the Platform (and by WhatsApp/email where
            practical) before they take effect. Continued use after the
            effective date constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-500" />
            <span>16. Severability</span>
          </h2>
          <p>
            If any provision of these Terms is held invalid or unenforceable,
            it will be modified to the minimum extent necessary, and the
            remaining provisions will continue in full force.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            <span>17. Contact</span>
          </h2>
          <p>
            Questions about these Terms? Email <strong>care@waw.com.pk</strong>{" "}
            or message our 24/7 WhatsApp helpline. WAW TECHNOLOGIES
            (SMC-PRIVATE) LIMITED, NTN 8945201-3, SECP Reg. # 0192847.
          </p>
        </section>
      </div>
    </div>
  );
}
