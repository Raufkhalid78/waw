"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { Users, Ban, CheckCircle, Inbox } from "lucide-react";
import { useState } from "react";
import { FadeIn } from "@/components/Motion";

const ROLE_OPTIONS = ["ALL", "BUYER", "SELLER", "SUPPORT", "ADMIN"];

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "badge-danger",
  SELLER: "badge-info",
  SUPPORT: "badge-warning",
  BUYER: "badge-neutral",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, roleFilter],
    queryFn: () =>
      usersApi.list({
        page,
        limit: 20,
        role: roleFilter === "ALL" ? undefined : roleFilter,
      }),
  });

  const banMutation = useMutation({
    mutationFn: usersApi.ban,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const unbanMutation = useMutation({
    mutationFn: usersApi.unban,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  return (
    <div className="space-y-5">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          {data && <span className="text-sm text-gray-500">{data.total} total</span>}
        </div>
      </FadeIn>

      <FadeIn delay={50}>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {ROLE_OPTIONS.map((role) => (
            <button
              key={role}
              onClick={() => { setRoleFilter(role); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-95 ${
                roleFilter === role
                  ? "bg-amber-400 text-slate-950"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {role}
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
                  <div className="w-9 h-9 skeleton rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 skeleton" />
                    <div className="h-3 w-24 skeleton" />
                  </div>
                  <div className="h-6 w-16 skeleton rounded-full" />
                </div>
              ))}
            </div>
          ) : !data?.users || data.users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">No users found</p>
              <p className="text-xs text-gray-500 mt-1">
                {roleFilter !== "ALL" ? "Try a different filter" : "Users will appear here once they sign up"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th className="hidden md:table-cell">Phone</th>
                    <th className="hidden lg:table-cell">Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user: any, i: number) => (
                    <tr
                      key={user.id}
                      className="opacity-0 animate-[fadeIn_300ms_ease-out_forwards]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <Users className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {user.full_name || "No name"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {user.phone || user.email || user.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${ROLE_BADGE[user.role] || "badge-neutral"}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="hidden md:table-cell text-gray-600">{user.phone || "—"}</td>
                      <td className="hidden lg:table-cell text-gray-600 truncate max-w-[160px]">{user.email || "—"}</td>
                      <td>
                        <span className={`badge ${user.is_banned ? "badge-danger" : "badge-success"}`}>
                          {user.is_banned ? "Banned" : "Active"}
                        </span>
                      </td>
                      <td>
                        {user.is_banned ? (
                          <button
                            onClick={() => unbanMutation.mutate(user.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 transition-colors active:scale-95"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Unban</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(`Ban user ${user.full_name || user.id}?`)) {
                                banMutation.mutate(user.id);
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors active:scale-95"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ban</span>
                          </button>
                        )}
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
