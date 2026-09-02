"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { statsApi, type AdminStats } from "@/lib/api";

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: statsApi.get,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load dashboard data</p>
          <p className="text-sm text-gray-400 mt-2">Make sure you are logged in as admin</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Total Sellers",
      value: stats?.totalSellers ?? 0,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "GMV (PKR)",
      value: stats?.gmvPkr?.toLocaleString() ?? "0",
      icon: TrendingUp,
      color: "text-gold-dark",
      bg: "bg-gold-surface",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your marketplace</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/products"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gold hover:bg-gold-surface transition-colors"
          >
            <Package className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Products</span>
          </a>
          <a
            href="/orders"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gold hover:bg-gold-surface transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Orders</span>
          </a>
          <a
            href="/users"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gold hover:bg-gold-surface transition-colors"
          >
            <Users className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Users</span>
          </a>
          <a
            href="/stores"
            className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gold hover:bg-gold-surface transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Stores</span>
          </a>
        </div>
      </div>
    </div>
  );
}
