"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storesApi } from "@/lib/api";
import { Store, Check, X } from "lucide-react";
import { useState } from "react";

const STATUS_OPTIONS = ["ALL", "PENDING_KYC", "PENDING", "ACTIVE", "REJECTED", "SUSPENDED"];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} total stores</span>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => { setStatusFilter(status); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === status
                ? "bg-amber-400 text-slate-950"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Seller</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.stores?.map((store: any) => (
                <tr key={store.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Store className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-600">{store.owner?.full_name || "—"}</td>
                  <td>
                    <span className={`badge ${
                      store.status === "ACTIVE" ? "badge-success" :
                      store.status === "PENDING" ? "badge-warning" :
                      store.status === "REJECTED" ? "badge-danger" :
                      "badge-neutral"
                    }`}>
                      {store.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {(store.status === "PENDING" || store.status === "PENDING_KYC") && (
                        <>
                          <button
                            onClick={() => approveMutation.mutate(store.id)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(store.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
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
              {(!data?.stores || data.stores.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    No stores found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {Math.ceil(data.total / 20)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= data.total}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
