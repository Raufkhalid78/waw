"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storesApi, sellersApi } from "@/lib/api";
import { Store, Check, X, Inbox, Percent } from "lucide-react";
import { useState } from "react";
import { FadeIn } from "@/components/Motion";

const STATUS_OPTIONS = ["ALL", "PENDING_KYC", "PENDING", "ACTIVE", "REJECTED", "SUSPENDED"];

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "badge-success",
  PENDING: "badge-warning",
  PENDING_KYC: "badge-warning",
  REJECTED: "badge-danger",
  SUSPENDED: "badge-danger",
};

export default function StoresPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stores", page, statusFilter],
    queryFn: () =>
      storesApi.list({
        page,
        limit: 20,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: storesApi.approve,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-stores"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: storesApi.reject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-stores"] }),
  });

  const commissionMutation = useMutation({
    mutationFn: ({ storeId, value }: { storeId: string; value: number | null }) =>
      sellersApi.update(storeId, { commission_rate_percentage: value }),
    onSuccess: () => {
      setCommissionEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
    },
  });

  const [commissionEditing, setCommissionEditing] = useState<string | null>(null);
  const [commissionValue, setCommissionValue] = useState("");
  const [commissionSaving, setCommissionSaving] = useState(false);

  const startCommissionEdit = (store: any) => {
    setCommissionEditing(store.id);
    setCommissionValue(
      store.commission_rate_percentage != null
        ? String(store.commission_rate_percentage)
        : ""
    );
  };

  const saveCommission = async (storeId: string) => {
    setCommissionSaving(true);
    try {
      await commissionMutation.mutateAsync({
        storeId,
        value: commissionValue === "" ? null : Number(commissionValue),
      });
    } catch (err) {
      console.error("Failed to update commission", err);
    } finally {
      setCommissionSaving(false);
    }
  };

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-5">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Stores</h1>
          {data && <span className="text-sm text-gray-500">{data.total} total</span>}
        </div>
      </FadeIn>

      <FadeIn delay={50}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                statusFilter === status
                  ? "bg-amber-400 text-slate-950"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </FadeIn>

      <FadeIn delay={100}>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 skeleton rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 skeleton" />
                    <div className="h-3 w-24 skeleton" />
                  </div>
                  <div className="h-6 w-16 skeleton rounded-full" />
                </div>
              ))}
            </div>
          ) : !data?.stores || data.stores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No stores found</p>
              <p className="text-xs text-gray-500 mt-1">
                {statusFilter !== "ALL" ? "Try a different filter" : "Stores will appear here once sellers register"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Store</th>
                    <th className="hidden sm:table-cell">Seller</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Commission</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stores.map((store: any, i: number) => (
                    <tr
                      key={store.id}
                      className="opacity-0 animate-[fadeIn_300ms_ease-out_forwards]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{store.name}</p>
                            <p className="text-xs text-gray-500 truncate">{store.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-gray-600">{store.owner?.full_name || "—"}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[store.status] || "badge-neutral"}`}>
                          {store.status}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        {commissionEditing === store.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={50}
                              step={0.5}
                              value={commissionValue}
                              onChange={(e) => setCommissionValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveCommission(store.id);
                                if (e.key === "Escape") setCommissionEditing(null);
                              }}
                              placeholder="Default"
                              className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                            />
                            <button
                              onClick={() => saveCommission(store.id)}
                              disabled={commissionSaving}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors active:scale-95 disabled:opacity-40"
                              title="Save commission"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setCommissionEditing(null)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors active:scale-95"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startCommissionEdit(store)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                            title="Edit commission override"
                          >
                            <Percent className="w-3 h-3 text-gray-400" />
                            {store.commission_rate_percentage != null ? (
                              <span className="font-medium text-gray-900">
                                {store.commission_rate_percentage}%
                              </span>
                            ) : (
                              <span className="text-gray-400">Default</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {(store.status === "PENDING" || store.status === "PENDING_KYC") && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(store.id)}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors active:scale-95"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => rejectMutation.mutate(store.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors active:scale-95"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
