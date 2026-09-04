"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api";
import { Package, Check, X, Search, Inbox } from "lucide-react";
import { useState } from "react";
import { FadeIn, Stagger } from "@/components/Motion";

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", page, search],
    queryFn: () => productsApi.list({ page, limit: 20, search }),
  });

  const approveMutation = useMutation({
    mutationFn: productsApi.approve,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: productsApi.reject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-5">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          {data && (
            <span className="text-sm text-gray-500">{data.total} total</span>
          )}
        </div>
      </FadeIn>

      <FadeIn delay={50}>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="admin-input pl-10"
          />
        </div>
      </FadeIn>

      <FadeIn delay={100}>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 skeleton rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 skeleton" />
                    <div className="h-3 w-24 skeleton" />
                  </div>
                  <div className="h-6 w-16 skeleton rounded-full" />
                </div>
              ))}
            </div>
          ) : !data?.products || data.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No products found</p>
              <p className="text-xs text-gray-500 mt-1">
                {search ? "Try a different search term" : "Products will appear here once sellers add them"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="hidden sm:table-cell">Store</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product: any, i: number) => (
                    <tr
                      key={product.id}
                      className="opacity-0 animate-[fadeIn_300ms_ease-out_forwards]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{product.title}</p>
                            <p className="text-xs text-gray-500 truncate sm:hidden">{product.store_name || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-gray-600">{product.store_name || "—"}</td>
                      <td className="font-medium text-gray-900 whitespace-nowrap">
                        {product.price_pkr?.toLocaleString() ?? "—"}
                      </td>
                      <td>
                        <span className={`badge ${product.status === "ACTIVE" ? "badge-success" : product.status === "PENDING" ? "badge-warning" : "badge-neutral"}`}>
                          {product.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {product.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(product.id)}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors active:scale-95"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => rejectMutation.mutate(product.id)}
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
