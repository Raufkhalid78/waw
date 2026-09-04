"use client";

import { useState, useEffect } from "react";
import { payoutsApi, type AdminPayout } from "@/lib/api";
import { Wallet, CheckCircle, RefreshCw } from "lucide-react";

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [settleLoading, setSettleLoading] = useState<string | null>(null);

  const loadPayouts = async () => {
    setLoading(true);
    try {
      const data = await payoutsApi.list({ page, limit: 20, status: statusFilter || undefined });
      setPayouts(data.payouts || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load payouts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, [page, statusFilter]);

  const handleSettle = async (id: string) => {
    setSettleLoading(id);
    try {
      await payoutsApi.settle(id);
      loadPayouts();
    } catch (err) {
      console.error("Failed to settle payout", err);
    } finally {
      setSettleLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
      SETTLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      FAILED: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status] || "bg-gray-50 text-gray-500 border-gray-200";
  };

  const totalPending = payouts
    .filter((p) => p.status === "PENDING" || p.status === "SCHEDULED")
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
            {payouts.filter((p) => p.status === "SETTLED").length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">Total Payouts</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{total}</div>
        </div>
      </div>

      <div className="flex gap-2">
        {["", "PENDING", "SCHEDULED", "SETTLED", "FAILED"].map((s) => (
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
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No payouts found</p>
        </div>
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
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{p.seller_name || p.seller_id}</td>
                  <td className="px-4 py-3 text-gray-500">{p.store_name || "-"}</td>
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
                    {(p.status === "PENDING" || p.status === "SCHEDULED") && (
                      <button
                        onClick={() => handleSettle(p.id)}
                        disabled={settleLoading === p.id}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                      >
                        Settle
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
    </div>
  );
}
