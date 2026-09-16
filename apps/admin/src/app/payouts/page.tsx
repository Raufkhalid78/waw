"use client";

import { useState, useEffect, useCallback } from "react";
import { payoutsApi, type AdminPayout } from "@/lib/api";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { Wallet, CheckCircle, RefreshCw, Loader2 } from "lucide-react";

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settleLoading, setSettleLoading] = useState<string | null>(null);
  const [settleTarget, setSettleTarget] = useState<AdminPayout | null>(null);
  const [bankReference, setBankReference] = useState("");
  const [settleError, setSettleError] = useState("");

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await payoutsApi.list({ page, limit: 20, status: statusFilter || undefined });
      setPayouts(data.payouts || []);
      // The API returns { payouts, pagination } — total lives in pagination.
      setTotal(data.pagination?.total ?? (data as any).total ?? 0);
      setLoadError("");
    } catch (err: any) {
      console.error("Failed to load payouts", err);
      setLoadError(err?.message || "Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const openSettle = (p: AdminPayout) => {
    setSettleTarget(p);
    setBankReference("");
    setSettleError("");
  };

  const confirmSettle = async () => {
    // Money-moving action: require a non-empty bank reference the API stores
    // for reconciliation.
    if (!settleTarget) return;
    const ref = bankReference.trim();
    if (!ref) {
      setSettleError("Bank reference is required");
      return;
    }
    setSettleLoading(settleTarget.id);
    try {
      await payoutsApi.settle(settleTarget.id, ref);
      setSettleTarget(null);
      setBankReference("");
      loadPayouts();
    } catch (err: any) {
      setSettleError(err?.message || "Failed to settle payout");
    } finally {
      setSettleLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
      PROCESSING: "bg-blue-50 text-blue-700 border-blue-200",
      HELD: "bg-rose-50 text-rose-700 border-rose-200",
      HELD_PENDING_DELIVERY: "bg-purple-50 text-purple-700 border-purple-200",
      SETTLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
      FAILED: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status] || "bg-gray-50 text-gray-500 border-gray-200";
  };

  // All three terminal-ish statuses count as settled: the atomic settlement
  // RPC writes SETTLED while the legacy job + admin settle write COMPLETED.
  const isSettled = (p: AdminPayout) =>
    p.status === "SETTLED" || p.status === "COMPLETED" || p.status === "PAID";

  const totalPending = payouts
    .filter((p) => p.status === "PENDING" || p.status === "SCHEDULED" || p.status === "PROCESSING")
    .reduce((sum, p) => sum + (p.amount_pkr || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="text-sm text-gray-500">{total} total payouts</p>
        </div>
        <button onClick={loadPayouts} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">Pending Payouts</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            PKR {totalPending.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">Total Settled</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {payouts.filter(isSettled).length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">Total Payouts</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{total}</div>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Status values match PayoutStatus actually written by the API:
            SCHEDULED / PROCESSING / HELD / HELD_PENDING_DELIVERY / SETTLED /
            COMPLETED / PAID / FAILED. "PENDING" was never a payout status. */}
        {["", "SCHEDULED", "PROCESSING", "HELD", "HELD_PENDING_DELIVERY", "SETTLED", "COMPLETED", "FAILED"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-amber-400 text-slate-900" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loadError && <ApiErrorBanner message={loadError} onRetry={loadPayouts} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : payouts.length === 0 ? (
        loadError ? null : (
          <div className="text-center py-16 text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No payouts found</p>
          </div>
        )
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Seller</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Store</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  {/* Embedded store relation (API returns store: {id, name, city}) */}
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {(p as any).store?.name || p.seller_name || (p as any).store_id?.slice(0, 8) || p.seller_id || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {(p as any).store?.city || p.store_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                    PKR {p.amount_pkr.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(p.status === "PENDING" || p.status === "SCHEDULED" || p.status === "PROCESSING") && (
                      <button
                        onClick={() => openSettle(p)}
                        disabled={settleLoading === p.id}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        {settleLoading === p.id ? "Settling…" : "Settle"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-xs text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={payouts.length < 20}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {settleTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Settle Payout</h2>
            <p className="text-xs text-gray-500">
              PKR {settleTarget.amount_pkr.toLocaleString()} &middot;{" "}
              {settleTarget.seller_name || settleTarget.seller_id.slice(0, 8)}
            </p>
            {settleError && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {settleError}
              </div>
            )}
            <div>
              <label className="text-xs font-bold text-gray-700">
                Bank transaction reference
              </label>
              <input
                type="text"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                placeholder="e.g., FT-20260915-0042"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none mt-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSettleTarget(null)}
                disabled={settleLoading === settleTarget.id}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmSettle}
                disabled={settleLoading === settleTarget.id || !bankReference.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {settleLoading === settleTarget.id && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {settleLoading === settleTarget.id ? "Settling…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
