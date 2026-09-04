"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Store,
  Clock,
} from "lucide-react";
import { statsApi, type AdminStats } from "@/lib/api";
import { FadeIn, Stagger } from "@/components/Motion";

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: statsApi.get,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="h-4 w-24 skeleton mb-3" />
              <div className="h-7 w-32 skeleton" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="h-5 w-32 skeleton mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 skeleton" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <FadeIn>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">Failed to load dashboard</p>
            <p className="text-xs text-gray-500 mt-1">Make sure you are logged in as admin</p>
          </div>
        </div>
      </FadeIn>
    );
  }

  const statCards = [
    {
      label: "Products",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/products",
    },
    {
      label: "Orders",
      value: stats?.totalOrders ?? 0,
      icon: ShoppingCart,
      color: "text-green-600",
      bg: "bg-green-50",
      href: "/orders",
    },
    {
      label: "Sellers",
      value: stats?.totalSellers ?? 0,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/stores",
    },
    {
      label: "GMV (PKR)",
      value: stats?.gmvPkr?.toLocaleString() ?? "0",
      icon: TrendingUp,
      color: "text-gold-dark",
      bg: "bg-gold-surface",
      href: "/orders",
    },
  ];

  return (
    <div className="space-y-6">
      <FadeIn>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </FadeIn>

      {/* Stats Grid */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</p>
          </Link>
        ))}
      </Stagger>

      {/* Quick Actions */}
      <Stagger className="grid grid-cols-1 sm:grid-cols-2 gap-4" stagger={80}>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="space-y-2">
            <Link
              href="/products"
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-150">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Manage Products</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
            </Link>
            <Link
              href="/orders"
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-150">
                  <ShoppingCart className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Process Orders</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
            </Link>
            <Link
              href="/stores"
              className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors duration-150 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:scale-105 transition-transform duration-150">
                  <Store className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Review Stores</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">System Info</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
              <span className="text-sm text-gray-600">Marketplace</span>
              <span className="text-sm font-semibold text-gray-900">Waw</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
              <span className="text-sm text-gray-600">Currency</span>
              <span className="text-sm font-semibold text-gray-900">PKR</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
              <span className="text-sm text-gray-600">Commission</span>
              <span className="text-sm font-semibold text-gray-900">10%</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
              <span className="text-sm text-gray-600">Free Delivery</span>
              <span className="text-sm font-semibold text-gray-900">≥ PKR 5,000</span>
            </div>
          </div>
        </div>
      </Stagger>
    </div>
  );
}
