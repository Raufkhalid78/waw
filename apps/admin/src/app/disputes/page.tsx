"use client";

import { useState, useEffect, useCallback } from "react";
import { disputesApi, type AdminDispute } from "@/lib/api";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resolving, setResolving] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<AdminDispute | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundError, setRefundError] = useState("");

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await disputesApi.list({ page, limit: 20, status: statusFilter || undefined });
      // The API returns a raw array (listDisputes).
      const rows = Array.isArray(data) ? data : (data as any)?.disputes || [];
      setDisputes(rows);
      setTotal(rows.length);
      setLoadError("");
    } catch (err: any) {
      console.error("Failed to load disputes", err);
      setLoadError(err?.message || "Failed to load disputes");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  // The API's resolveDispute expects the DisputeResolution ENUM —
  // REFUND_BUYER | RELEASE_SELLER_PAYOUT | REPLACEMENT_ISSUED | DISMISSED.
  // Any other value closes the ticket with NO financial action.
  const handleResolve = async (id: string, resolution: "REFUND_BUYER" | "RELEASE_SELLER_PAYOUT" | "REPLACEMENT_ISSUED" | "DISMISSED", refundAmountPkr?: number) => {
    try {
      await disputesApi.resolve(id, resolution, refundAmountPkr);
      setResolving(null);
      loadDisputes();
    } catch (err: any) {
      alert(err?.message || "Failed to resolve dispute");
    }
  };

  const openRefund = (d: AdminDispute) => {
    setRefundTarget(d);
    setRefundAmount(d.refund_amount_pkr != null ? String(d.refund_amount_pkr) : "");
    setRefundError("");
  };

  const confirmRefund = async () => {
    // Refund is a money-moving action: validate a numeric amount > 0 before
    // hitting the API.
    if (!refundTarget) return;
    const parsed = Number(refundAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setRefundError("Enter a valid refund amount");
      return;
    }
    setResolving(refundTarget.id);
    try {
      await disputesApi.resolve(refundTarget.id, "REFUND_BUYER", parsed);
      setResolving(null);
      setRefundTarget(null);
      loadDisputes();
    } catch (err: any) {
      setRefundError(err?.message || "Failed to resolve dispute");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      OPEN: "bg-red-50 text-red-700 border-red-200",
      IN_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
      RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CLOSED: "bg-gray-50 text-gray-500 border-gray-200",
    };
    return map[status] || "bg-gray-50 text-gray-500 border-gray-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-sm text-gray-500">{total} total disputes</p>
        </div>
        <button onClick={loadDisputes} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex gap-2">
        {["", "OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"].map((s) => (
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

      {loadError && <ApiErrorBanner message={loadError} onRetry={loadDisputes} />}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        loadError ? null : (
          <div className="text-center py-16 text-gray-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No disputes found</p>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => (
            <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">#{d.id.slice(0, 8)}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(d.status)}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{d.reason}</p>
                  {d.description && <p className="text-xs text-gray-500">{d.description}</p>}
                  <div className="text-xs text-gray-400">
                    Buyer: {d.buyer_name || (d as any).buyer?.full_name || d.buyer_id} &middot; Seller: {d.seller_name || d.seller_id}
                  </div>
                </div>
                {d.status !== "RESOLVED" && d.status !== "CLOSED" && (
                  <button
                    onClick={() => setResolving(d.id)}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-xs font-medium rounded-lg shrink-0"
                  >
                    Resolve
                  </button>
                )}
              </div>
              {resolving === d.id && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openRefund(d)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg"
                    >
                      Refund Buyer
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Mark this dispute as resolved with a replacement sent to the buyer?")) return;
                        handleResolve(d.id, "REPLACEMENT_ISSUED");
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg"
                    >
                      Replacement Sent
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Reject this claim and release the seller's held payout?")) return;
                        handleResolve(d.id, "RELEASE_SELLER_PAYOUT");
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg"
                    >
                      Reject Claim
                    </button>
                    <button
                      onClick={() => setResolving(null)}
                      className="px-3 py-2 text-gray-500 text-xs rounded-lg hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
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
            disabled={disputes.length < 20}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
