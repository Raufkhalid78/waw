"use client";

import { useState, useEffect, useCallback } from "react";
import { disputesApi, type AdminDispute } from "@/lib/api";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await disputesApi.list({ page, limit: 20, status: statusFilter || undefined });
      setDisputes(data.disputes || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load disputes", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadDisputes();
  }, [loadDisputes]);

  const handleResolve = async (id: string) => {
    if (!resolutionText.trim()) return;
    try {
      await disputesApi.resolve(id, resolutionText);
      setResolving(null);
      setResolutionText("");
      loadDisputes();
    } catch (err) {
      console.error("Failed to resolve dispute", err);
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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No disputes found</p>
        </div>
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
                    Buyer: {d.buyer_name || d.buyer_id} &middot; Seller: {d.seller_name || d.seller_id}
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
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <input
                    type="text"
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Enter resolution..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => handleResolve(d.id)}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg"
                  >
                    Submit
                  </button>
                  <button
                    onClick={() => { setResolving(null); setResolutionText(""); }}
                    className="px-3 py-2 text-gray-500 text-xs rounded-lg hover:bg-gray-100"
                  >
                    Cancel
                  </button>
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
