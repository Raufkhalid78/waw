"use client";

import { useState, useEffect } from "react";
import { kycApi, type AdminKyc } from "@/lib/api";
import { BadgeCheck, CheckCircle, XCircle, RefreshCw, FileText } from "lucide-react";

export default function KycPage() {
  const [submissions, setSubmissions] = useState<AdminKyc[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handleAction = async (storeId: string, action: "approve" | "reject") => {
    setActionLoading(storeId);
    try {
      if (action === "approve") await kycApi.approve(storeId);
      else await kycApi.reject(storeId);
      loadKyc();
    } catch (err) {
      console.error(`Failed to ${action} KYC`, err);
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
          {submissions.map((k) => (
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
                      <span className="text-gray-700 font-mono">{k.cnic_number || "-"}</span>
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
                      <span className="text-gray-700 font-mono">{k.bank_account_number || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Submitted:</span>{" "}
                      <span className="text-gray-700">{new Date(k.submitted_at).toLocaleDateString()}</span>
                    </div>
                  </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
