"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  ArrowLeft,
  Building2,
  Database,
  Server,
  CreditCard,
  Clock,
  UserCheck,
  Cookie,
  Globe,
  Users,
  RefreshCw,
  CalendarCheck,
  Scale,
  AlertTriangle,
} from "lucide-react";

export default function PrivacyPolicyPage() {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>PECA 2016 Compliant</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          Privacy &amp; Data Protection Policy
        </h1>

        <p className="text-sm text-slate-500 font-medium">
          Effective Date: 15 September 2026 — Safeguarding your personal,
          banking, and order data in Pakistan.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            <span>1. Who We Are</span>
          </h2>
          <p>
            Waw (<strong>waw.com.pk</strong>) is a multi-vendor e-commerce
            marketplace operated in the Islamic Republic of Pakistan by{" "}
            <strong>WAW TECHNOLOGIES (SMC-PRIVATE) LIMITED</strong> (NTN
            8945201-3, SECP Registration No. 0192847). This Privacy Policy
            explains what personal data we collect, why we collect it, who we
            share it with, and the rights you have over it. It applies whenever
            you browse, order from, or sell on Waw.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Data Controller / Contact:</strong> care@waw.com.pk
            </li>
            <li>
              <strong>Support Hours:</strong> WhatsApp helpline available 24/7
            </li>
            <li>
              <strong>Complaints:</strong> You may raise a privacy complaint at
              any time by emailing{" "}
              <strong>care@waw.com.pk</strong> with the subject line{" "}
              <em>&ldquo;Privacy Complaint&rdquo;</em>. We acknowledge
              complaints within 48 hours and aim to resolve them within 30 days.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" />
            <span>2. Data We Collect</span>
          </h2>
          <p>
            We only collect the data needed to run a trustworthy marketplace.
            What we collect depends on how you use Waw:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Buyers (registered):</strong> name, phone number,
              delivery addresses, order history, returns and refunds records,
              loyalty and referral points.
            </li>
            <li>
              <strong>Guests (guest checkout):</strong> phone number and
              delivery address, limited to fulfilling that specific order.
            </li>
            <li>
              <strong>Sellers:</strong> CNIC details, bank IBAN, payout
              history, store profile and listings, plus supporting KYC
              documents.
            </li>
            <li>
              <strong>Technical data:</strong> IP address, device and browser
              type, and app interaction events, used for security, delivery of
              service, and (only with your consent) analytics.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-500" />
            <span>3. Legal Bases for Processing</span>
          </h2>
          <p>
            Where required by law, we process your personal data only with a
            valid legal basis:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Contract performance:</strong> to register your account,
              process orders, take payments, arrange delivery, and handle
              returns and refunds.
            </li>
            <li>
              <strong>Legitimate interest:</strong> to prevent fraud, abuse,
              and chargebacks; verify identities at checkout; and secure our
              platform.
            </li>
            <li>
              <strong>Consent:</strong> for marketing communications and
              Google Analytics 4 measurement, both of which you can withdraw at
              any time via Cookie Settings in the footer or by contacting us.
            </li>
            <li>
              <strong>Legal obligation:</strong> to comply with Pakistani tax,
              AML/CFT, and record-keeping laws.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-500" />
            <span>4. Processors &amp; Subprocessors</span>
          </h2>
          <p>
            We share personal data only with vetted processors that help us
            operate the marketplace, each bound by contractual data-protection
            obligations:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Supabase / Postgres</strong> — hosted application
              database and authentication.
            </li>
            <li>
              <strong>Bank Alfalah (APG &amp; Alfa Wallet)</strong> — payment
              processing and card acquiring.
            </li>
            <li>
              <strong>PostEx / TCS</strong> — courier, delivery, and reverse
              pickup services.
            </li>
            <li>
              <strong>Meta WhatsApp Business Platform</strong> — order
              confirmations, receipts, and support messages.
            </li>
            <li>
              <strong>Google Analytics 4</strong> — aggregated usage analytics
              (loaded only after you consent).
            </li>
            <li>
              <strong>Sentry</strong> — error monitoring and performance
              diagnostics.
            </li>
            <li>
              <strong>Cloudflare / R2</strong> — CDN, security, and product
              image storage.
            </li>
          </ul>
          <p className="text-xs sm:text-sm text-slate-600">
            We do not sell, rent, or trade your personal data to third-party
            telemarketers or data brokers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <span>5. Payments &amp; Card Data Security</span>
          </h2>
          <p>
            <strong>
              Your card data never touches Waw servers.
            </strong>{" "}
            All card payments are completed on the Bank Alfalah APG hosted
            checkout page, which is fully compliant with PCI-DSS (Payment Card
            Industry Data Security Standard). Waw never sees, receives, or
            stores your 16-digit card number, CVV, or expiry date. We store
            only the payment status and the bank transaction reference needed
            to match your order and process refunds. For Raast QR and Bank
            Alfalah Alfa payments, we receive only the transaction ID and
            settlement status.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>6. Data Retention</span>
          </h2>
          <p>
            We keep your data only as long as needed for the purposes above:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Orders &amp; financial records:</strong> 7 years, as
              required by Pakistani tax law.
            </li>
            <li>
              <strong>Seller KYC documents:</strong> for the duration of the
              store&apos;s activity plus 3 years.
            </li>
            <li>
              <strong>Analytics data:</strong> 14 months maximum.
            </li>
            <li>
              <strong>Session data:</strong> 30 days.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-500" />
            <span>7. Your Rights &amp; How to Exercise Them</span>
          </h2>
          <p>
            You have the following rights over your personal data: access,
            correction, deletion, portability, and withdrawal of consent. To
            exercise any of them:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              Email <strong>care@waw.com.pk</strong> from your registered phone
              number&apos;s linked email or the address on your account.
            </li>
            <li>
              Use the subject line{" "}
              <em>&ldquo;Data Request&rdquo; or &ldquo;Privacy Complaint&rdquo;</em>{" "}
              and describe the right you want to exercise.
            </li>
            <li>
              We respond within <strong>30 days</strong>. Deletion requests are
              honored except where we must retain records under the retention
              schedule in Section 6.
            </li>
          </ol>
          <p className="text-xs sm:text-sm text-slate-600">
            Residents of Pakistan have rights of access and correction
            regarding their personal data under the Prevention of Electronic
            Crimes Act (PECA) 2016 and related applicable law. If you are
            visiting from the European Union, we honor GDPR Articles 15–22
            (access, rectification, erasure, restriction, portability, and
            objection) where applicable. Pakistan&apos;s Personal Data
            Protection Bill, once enacted, will apply to the extent it governs
            our processing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Cookie className="w-5 h-5 text-amber-500" />
            <span>8. Cookies &amp; Consent</span>
          </h2>
          <p>
            We use a consent banner that distinguishes essential, analytics,
            and marketing categories before any non-essential cookie loads:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Essential (7 days):</strong> waw_session, waw_csrf, and
              cart token — required for sign-in, security, and keeping your
              cart. These cannot be disabled.
            </li>
            <li>
              <strong>Analytics (12-month consent):</strong> waw_consent plus
              Google Analytics 4 cookies — loaded only after you opt in. You
              can change or withdraw your choice at any time via{" "}
              <strong>Cookie Settings</strong> in the footer.
            </li>
            <li>
              <strong>Marketing:</strong> only set if you consent; switching
              them off stops marketing measurement without affecting your
              account.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <span>9. How We Protect Your Data</span>
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>
              <strong>Row-Level Security (RLS):</strong> database access is
              restricted so a user can only ever read their own records.
            </li>
            <li>
              <strong>Encryption:</strong> all traffic to and from Waw is
              encrypted in transit (TLS/HTTPS).
            </li>
            <li>
              <strong>Access controls:</strong> strict internal role-based
              access; KYC and financial data are visible only to authorized
              staff.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Globe className="w-5 h-5 text-amber-500" />
            <span>10. International Transfers</span>
          </h2>
          <p>
            Waw is operated from Pakistan, but some processors listed in
            Section 4 process data in cloud regions outside Pakistan (for
            example, Supabase&apos;s hosted cloud region). Where your data is
            processed abroad, we rely on processor agreements, encryption in
            transit, and the safeguards described in Section 9, and we only
            transfer the minimum data necessary for the processor to perform
            its function.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            <span>11. Children&apos;s Privacy</span>
          </h2>
          <p>
            Waw is intended for users aged <strong>18 or older</strong>. We do
            not intentionally collect data from children. If you believe a
            child has provided us personal data, contact care@waw.com.pk and
            we will delete it promptly.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            <span>12. Changes to This Policy</span>
          </h2>
          <p>
            We may update this Privacy Policy to reflect changes in our
            services or the law. The current version is always published on
            this page with its effective date. Material changes will be
            announced on the site and, where required, re-consent will be
            requested.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-amber-500" />
            <span>13. Effective Date</span>
          </h2>
          <p>
            This Privacy Policy is effective as of{" "}
            <strong>15 September 2026</strong> and replaces all earlier
            versions. Questions? Email <strong>care@waw.com.pk</strong> or
            message our 24/7 WhatsApp helpline.
          </p>
        </section>
      </div>

      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs sm:text-sm text-amber-900">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          This page is a plain-language summary for Waw users; in any conflict
          with a signed seller agreement, the signed agreement prevails.{" "}
          <Link
            href="/terms"
            className="font-bold text-amber-700 underline underline-offset-2"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/refund-policy"
            className="font-bold text-amber-700 underline underline-offset-2"
          >
            Refund &amp; Return Policy
          </Link>{" "}
          apply alongside this policy.
        </p>
      </div>

      <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
        <FileText className="w-3.5 h-3.5" />
        WAW TECHNOLOGIES (SMC-PRIVATE) LIMITED &bull; NTN 8945201-3 &bull; SECP
        Reg. # 0192847
      </p>
    </div>
  );
}
