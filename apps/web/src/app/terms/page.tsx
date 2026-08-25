'use client';

import Link from 'next/link';
import { FileText, ShieldCheck, Scale, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';

export default function TermsOfServicePage() {
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
          <Scale className="w-4 h-4 text-amber-600" />
          <span>{isUrdu ? 'قوانین و ضوابط — واو پاکستان' : 'Waw Marketplace Terms'}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">
          {isUrdu ? 'سروس کی شرائط و ضوابط' : 'Terms of Service'}
        </h1>

        <p className="text-sm text-slate-500 font-medium">
          {isUrdu
            ? 'واو (واو) ہائبرڈ ملٹی وینڈر پلیٹ فارم کے استعمال کے قانونی قواعد۔'
            : 'Governing user, buyer, and merchant participation across Pakistan.'}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs space-y-8 text-slate-700 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
            <span>1. Platform Structure</span>
          </h2>
          <p>
            <strong>Waw (واو)</strong> operates as a hybrid marketplace platform:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li><strong>First-Party (1P Waw Retail):</strong> Direct retail inventory owned, inspected, and guaranteed with 24-hour Waw Express dispatch.</li>
            <li><strong>Third-Party (3P Verified Merchants):</strong> Independent vetted artisans, regional manufacturers, and brand distributors across Pakistan.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>2. Buyer Protection & Escrow Holding</span>
          </h2>
          <p>
            Payments are locked in escrow until shipment delivery is confirmed by PostEx. In the event of a dispute or counterfeit complaint, Waw Arbitration mediates within 24 hours to enforce 100% money-back refunds.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            <span>3. Merchant Obligations</span>
          </h2>
          <p>
            All registered third-party merchants agree to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
            <li>Dispatch ordered inventory within 24–48 hours via contracted PostEx logistics.</li>
            <li>List genuine products with authentic imagery and honest descriptions. Counterfeit items result in immediate suspension and forfeiture of escrow funds.</li>
            <li>Honor the mandatory 7-Day Return Guarantee.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
