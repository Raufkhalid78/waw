'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Building2,
  ArrowUpRight,
  Lock,
} from 'lucide-react';
import { fetchSellerPayouts, fetchSellerStore, SellerPayout, SellerStore } from '../../lib/api';
import { PayoutStatus } from '@waw/types';

export default function SellerPayoutsPage() {
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [store, setStore] = useState<SellerStore | null>(null);

  useEffect(() => {
    fetchSellerPayouts().then(setPayouts);
    fetchSellerStore().then(setStore);
  }, []);

  const totalDisbursed = payouts
    .filter(p => p.status === PayoutStatus.COMPLETED)
    .reduce((s, p) => s + (p.netPayoutPkr || 0), 0);

  const pendingEscrow = payouts
    .filter(p => p.status === PayoutStatus.SCHEDULED || p.status === PayoutStatus.PROCESSING)
    .reduce((s, p) => s + (p.netPayoutPkr || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Weekly Merchant Settlements & Payouts</h1>
        <p className="text-xs text-slate-400 mt-1">
          Authoritative settlement ledger with verified delivery escrow release.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-2">
          <div className="text-xs font-semibold text-slate-400">Total Settled to Bank</div>
          <div className="text-2xl font-black text-emerald-400 font-mono">PKR {totalDisbursed.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500">Transferred via Bank / Raast</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-2">
          <div className="text-xs font-semibold text-slate-400">Pending Delivery Release</div>
          <div className="text-2xl font-black text-amber-400 font-mono">PKR {pendingEscrow.toLocaleString()}</div>
          <div className="text-[10px] text-amber-400/80 font-medium">Releasing post customer delivery</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-lg space-y-2">
          <div className="text-xs font-semibold text-slate-400">Linked Settlement Account</div>
          <div className="text-sm font-bold text-white">{store?.bankName || 'Meezan Bank Ltd'}</div>
          <div className="text-[10px] text-slate-400 font-mono">IBAN: {store?.bankAccountNumber || 'PK64MEZN0001234567890123'}</div>
        </div>
      </div>

      {/* Escrow Mechanism Info */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-white">How does Waw Seller Escrow & Settlement work?</div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            When a buyer orders from your shop via Card, Instant QR, or COD, the funds are safely locked in an authoritative escrow account. Once PostEx confirms package delivery, funds transition to Scheduled and disburse directly into your verified bank account within 7 days.
          </p>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl overflow-x-auto">
        <h2 className="text-sm font-bold text-white mb-4">Payout Ledger & Statements</h2>
        {payouts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No settlements recorded yet. Completed orders will automatically generate payout lines here.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order Ref</th>
                <th className="py-3 px-4">Net Payout</th>
                <th className="py-3 px-4">Commission</th>
                <th className="py-3 px-4">Disbursement Target</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {payouts.map(payout => (
                <tr key={payout.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-amber-400">{payout.orderNumber}</td>
                  <td className="py-3 px-4 font-bold text-white font-mono">PKR {payout.netPayoutPkr.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-400 font-mono">PKR {payout.commissionPkr.toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-400">{new Date(payout.scheduledFor).toLocaleDateString('en-PK')}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      payout.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {payout.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
