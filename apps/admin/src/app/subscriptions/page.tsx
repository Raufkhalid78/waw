"use client";

import { useState, useEffect, useCallback } from "react";
import { subscriptionsApi, type AdminStoreSubscription } from "@/lib/api";
import { CreditCard, RefreshCw, Crown, Ban, Loader2 } from "lucide-react";

export default function SubscriptionsPage() {
  const [stores, setStores] = useState<AdminStoreSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [monthsDrafts, setMonthsDrafts] = useState<Record<string, string>>({});

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await subscriptionsApi.list();
      setStores(data.stores || []);
    } catch (err) {
      console.error("Failed to load subscriptions", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const getSubscription = (store: AdminStoreSubscription) =>
    Array.isArray(store.subscription) ? store.subscription[0] : store.subscription;

  const handleActivate = async (store: AdminStoreSubscription) => {
    const months = Math.min(Math.max(parseInt(monthsDrafts[store.id] || "1", 10) || 1, 1), 24);
    setActionLoading(store.id);
    try {
      await subscriptionsApi.activate(store.id, months);
      loadSubscriptions();
    } catch (err) {
      console.error("Failed to activate subscription", err);
      alert("Failed to activate subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (store: AdminStoreSubscription) => {
    if (!confirm(`Revoke the paid subscription for "${store.name}"? The store will be downgraded to Free.`)) return;
    setActionLoading(store.id);
    try {
      await subscriptionsApi.revoke(store.id);
      loadSubscriptions();
    } catch (err) {
      console.error("Failed to revoke subscription", err);
      alert("Failed to revoke subscription");
    } finally {
      setActionLoading(null);
    }
  };

  const planBadge = (store: AdminStoreSubscription) => {
    const name = (
      getSubscription(store)?.plan?.display_name ||
      store.subscription_plan ||
      "free"
    ).toLowerCase();
    if (name.includes("enterprise")) return "bg-purple-50 text-purple-700 border-purple-200";
    if (name.includes("pro")) return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-gray-50 text-gray-500 border-gray-200";
  };

  const statusBadge = (status?: string) => {
    const map: Record<string, string> = {
      ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      EXPIRED: "bg-red-50 text-red-700 border-red-200",
    };
    return map[status || ""] || "bg-gray-50 text-gray-400 border-gray-200";
  };

  const activePaidStores = stores.filter(
    (s) => s.subscription_active && (getSubscription(s)?.plan?.price_pkr || 0) > 0
  );
  const pendingPayments = stores.filter((s) => getSubscription(s)?.status === "PENDING").length;
  const mrr = activePaidStores.reduce(
    (sum, s) => sum + (getSubscription(s)?.plan?.price_pkr || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500">{stores.length} stores</p>
        </div>
        <button onClick={loadSubscriptions} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">Total Stores</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stores.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">Active Paid Subs</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activePaidStores.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">Pending Payments</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingPayments}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 font-medium">MRR</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            PKR {mrr.toLocaleString()}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No stores found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Store</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Owner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">City</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Expires</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stores.map((store) => {
                const sub = getSubscription(store);
                const isPaid = !!store.subscription_active;
                return (
                  <tr key={store.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {store.name}
                      <span className="text-xs text-gray-400 ml-2 font-mono">/{store.slug}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {store.owner?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{store.city || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${planBadge(store)}`}
                      >
                        {sub?.plan?.display_name || store.subscription_plan || "Free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sub?.status ? (
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${statusBadge(sub.status)}`}
                        >
                          {sub.status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {(sub?.expires_at || store.subscription_expires_at)
                        ? new Date(sub?.expires_at || store.subscription_expires_at!).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={monthsDrafts[store.id] ?? "1"}
                          onChange={(e) =>
                            setMonthsDrafts((prev) => ({ ...prev, [store.id]: e.target.value }))
                          }
                          title="Months (1-24)"
                          className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none"
                        />
                        <button
                          onClick={() => handleActivate(store)}
                          disabled={actionLoading === store.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
                        >
                          {actionLoading === store.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Crown className="w-3 h-3" />
                          )}
                          {isPaid ? "Extend" : "Activate"}
                        </button>
                        {isPaid && (
                          <button
                            onClick={() => handleRevoke(store)}
                            disabled={actionLoading === store.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
                            title="Revoke subscription"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
