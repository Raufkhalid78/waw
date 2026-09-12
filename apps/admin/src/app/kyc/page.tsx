"use client";

import { useState, useEffect } from "react";
import { kycApi, type AdminKyc } from "@/lib/api";
import { BadgeCheck, CheckCircle, XCircle, RefreshCw, Eye, EyeOff, AlertTriangle } from "lucide-react";

/**
 * PII masking: CNIC and bank account numbers are sensitive (Nadra identity
 * + financial data). They render masked by default; an operator reveals
 * them on demand. Never logged, never copied to clipboard automatically.
 */
function maskCnic(cnic: string): string {
  if (!cnic) return "-";
  const trimmed = cnic.replace(/[-\s]/g, "");
  if (trimmed.length < 5) return "•••••";
  return `•••••-•••••${trimmed.slice(-4)}`.slice(0, 17);
}

function maskAccount(acc: string): string {
  if (!acc) return "-";
  return `•••• •••• ${acc.slice(-4)}`;
}

export default function KycPage() {
  const [submissions, setSubmissions] = useState<AdminKyc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState("");

  const loadKyc = async () => {
    setLoading(true);
    try {
      const data = await kycApi.listPending();
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error("Failed to load KYC submissions", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKyc();
  }, []);

  const toggleReveal = (storeId: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const handleAction = async (storeId: string, action: "approve" | "reject") => {
    setActionLoading(storeId);
    setActionError("");
    try {
      if (action === "approve") await kycApi.approve(storeId);
      else await kycApi.reject(storeId);
      loadKyc();
    } catch (err: any) {
      // Surface the failure — a silent 401/500 must not look like success.
      setActionError(err?.message || `Failed to ${action} KYC submission`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">KYC Submissions</h1>
          <p className="text-sm text-gray-500">{submissions.length} pending submissions</p>
        </div>
        <button onClick={loadKyc} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BadgeCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No pending KYC submissions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actionError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {actionError}
            </div>
          )}
          {submissions.map((k) => {
            const isRevealed = revealed.has(k.store_id);
            return (
            <div key={k.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{k.store_name || "Store"}</h3>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Pending Review
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Owner:</span>{" "}
                      <span className="text-gray-700 font-medium">{k.owner_name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">CNIC:</span>{" "}
                      <span className="text-gray-700 font-mono">
                        {isRevealed ? k.cnic_number : maskCnic(k.cnic_number || "")}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Business Reg:</span>{" "}
                      <span className="text-gray-700">{k.business_registration || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Bank:</span>{" "}
                      <span className="text-gray-700">{k.bank_name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Account #:</span>{" "}
                      <span className="text-gray-700 font-mono">
                        {isRevealed ? k.bank_account_number : maskAccount(k.bank_account_number || "")}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Submitted:</span>{" "}
                      <span className="text-gray-700">{new Date(k.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleReveal(k.store_id)}
                    className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 mt-1"
                  >
                    {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {isRevealed ? "Hide sensitive data" : "Reveal sensitive data"}
                  </button>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(k.store_id, "approve")}
                    disabled={actionLoading === k.store_id}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(k.store_id, "reject")}
                    disabled={actionLoading === k.store_id}
                    className="px-4 py-2 bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
