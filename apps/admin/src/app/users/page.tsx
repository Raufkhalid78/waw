"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { Users, Ban, CheckCircle } from "lucide-react";
import { useState } from "react";

const ROLE_OPTIONS = ["ALL", "BUYER", "SELLER", "SUPPORT", "ADMIN"];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <span className="text-sm text-gray-500">{data?.total ?? 0} total users</span>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role}
            onClick={() => { setRoleFilter(role); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              roleFilter === role
                ? "bg-amber-400 text-slate-950"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {role}
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
                <th>User</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.users?.map((user: any) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.full_name || "No name"}
                        </p>
                        <p className="text-xs text-gray-500">{user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      user.role === "ADMIN" ? "badge-danger" :
                      user.role === "SELLER" ? "badge-info" :
                      user.role === "SUPPORT" ? "badge-warning" :
                      "badge-neutral"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="text-gray-600">{user.phone || "—"}</td>
                  <td className="text-gray-600">{user.email || "—"}</td>
                  <td>
                    <span className={`badge ${user.is_banned ? "badge-danger" : "badge-success"}`}>
                      {user.is_banned ? "Banned" : "Active"}
                    </span>
                  </td>
                  <td>
                    {user.is_banned ? (
                      <button
                        onClick={() => unbanMutation.mutate(user.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm(`Ban user ${user.full_name || user.id}?`)) {
                            banMutation.mutate(user.id);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Ban
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {(!data?.users || data.users.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No users found
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
