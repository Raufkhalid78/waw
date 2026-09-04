"use client";

import { useState, useEffect, useCallback } from "react";
import { returnsApi, type AdminReturn } from "@/lib/api";
import { RotateCcw, CheckCircle, XCircle, Package, RefreshCw } from "lucide-react";

export default function ReturnsPage() {
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await returnsApi.list({ page, limit: 20, status: statusFilter || undefined });
      setReturns(data.returns || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load returns", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const handleAction = async (id: string, action: "receive" | "refund" | "reject") => {
    setActionLoading(id);
    try {
      if (action === "receive") await returnsApi.receive(id);
      else if (action === "refund") await returnsApi.refund(id);
      else await returnsApi.reject(id);
      loadReturns();
    } catch (err) {
      console.error(`Failed to ${action} return`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
      APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
      RECEIVED: "bg-purple-50 text-purple-700 border-purple-200",
      REFUNDED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      REJECTED: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status] || "bg-gray-50 text-gray-500 border-gray-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns</h1>
          <p className="text-sm text-gray-500">{total} total return requests</p>
        </div>
        <button onClick={loadReturns} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex gap-2">
        {["", "REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"].map((s) => (
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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : returns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No return requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">#{r.id.slice(0, 8)}</span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{r.reason}</p>
                  <div className="text-xs text-gray-400">
                    Buyer: {r.buyer_name || r.buyer_id} &middot; Seller: {r.seller_name || r.seller_id}
                    {r.refund_amount_pkr ? ` · Refund: PKR ${r.refund_amount_pkr.toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.status === "REQUESTED" && (
                    <>
                      <button
                        onClick={() => handleAction(r.id, "receive")}
                        disabled={actionLoading === r.id}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Mark Received
                      </button>
                      <button
                        onClick={() => handleAction(r.id, "reject")}
                        disabled={actionLoading === r.id}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {r.status === "RECEIVED" && (
                    <button
                      onClick={() => handleAction(r.id, "refund")}
                      disabled={actionLoading === r.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                    >
                      Approve Refund
                    </button>
                  )}
                </div>
              </div>
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
            disabled={returns.length < 20}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
