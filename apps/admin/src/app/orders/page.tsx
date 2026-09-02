"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import { ShoppingCart, ChevronDown } from "lucide-react";
import { useState } from "react";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} total orders</span>
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
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total (PKR)</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.orders?.map((order: any) => (
                <tr key={order.id}>
                  <td>
                    <span className="font-mono text-xs text-gray-600">
                      #{order.id.slice(0, 8)}
                    </span>
                  </td>
                  <td>
                    <p className="font-medium text-gray-900">
                      {order.buyer_name || "Guest"}
                    </p>
                  </td>
                  <td className="text-gray-600">{order.items_count ?? 0}</td>
                  <td className="font-medium text-gray-900">
                    {order.total_amount_pkr?.toLocaleString() ?? "—"}
                  </td>
                  <td>
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
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {STATUS_OPTIONS.filter((s) => s !== "ALL").map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {(!data?.orders || data.orders.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No orders found
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
