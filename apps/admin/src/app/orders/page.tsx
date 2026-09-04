"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import { Inbox } from "lucide-react";
import { useState } from "react";
import { FadeIn } from "@/components/Motion";

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-warning",
  CONFIRMED: "badge-info",
  PROCESSING: "badge-info",
  SHIPPED: "badge-success",
  DELIVERED: "badge-success",
  CANCELLED: "badge-danger",
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders", page, statusFilter],
    queryFn: () =>
      ordersApi.list({
        page,
        limit: 20,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-5">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
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
                  <div className="h-4 w-20 skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 skeleton" />
                    <div className="h-3 w-20 skeleton" />
                  </div>
                  <div className="h-6 w-16 skeleton rounded-full" />
                </div>
              ))}
            </div>
          ) : !data?.orders || data.orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No orders found</p>
              <p className="text-xs text-gray-500 mt-1">
                {statusFilter !== "ALL" ? "Try a different filter" : "Orders will appear here once customers place them"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th className="hidden sm:table-cell">Items</th>
                    <th>Total</th>
                    <th className="hidden md:table-cell">Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order: any, i: number) => (
                    <tr
                      key={order.id}
                      className="opacity-0 animate-[fadeIn_300ms_ease-out_forwards]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td>
                        <span className="font-mono text-xs text-gray-600">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>
                      <td>
                        <p className="font-medium text-gray-900 truncate max-w-[120px]">
                          {order.buyer_name || "Guest"}
                        </p>
                      </td>
                      <td className="hidden sm:table-cell text-gray-600">{order.items_count ?? 0}</td>
                      <td className="font-medium text-gray-900 whitespace-nowrap">
                        {order.total_amount_pkr?.toLocaleString() ?? "—"}
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-xs font-medium text-gray-600">
                          {order.payment_method}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[order.status] || "badge-neutral"}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <select
                          value={order.status}
                          onChange={(e) =>
                            statusMutation.mutate({ id: order.id, status: e.target.value })
                          }
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 bg-white transition-all duration-150 active:scale-95"
                        >
                          {STATUS_OPTIONS.filter((s) => s !== "ALL").map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
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
