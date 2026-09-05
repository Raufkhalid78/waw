"use client";

import { useEffect, useState } from "react";

interface LoyaltyBalance {
  points_balance: number;
  total_earned: number;
  total_redeemed: number;
  settings: {
    pointsPerPkr: number;
    redemptionRate: number;
    minRedeem: number;
    maxRedemptionPct: number;
  };
}

export default function LoyaltyBalance() {
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/loyalty/balance")
      .then((r) => r.json())
      .then(setBalance)
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl p-6">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-1/4" />
      </div>
    );
  }

  if (!balance) return null;

  const redeemableValue = Math.floor(
    balance.points_balance * balance.settings.redemptionRate
  );

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Loyalty Points</h3>
        <span className="text-2xl">⭐</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Available Points</p>
          <p className="text-2xl font-bold text-amber-600">
            {balance.points_balance.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Redeemable Value</p>
          <p className="text-2xl font-bold text-green-600">
            PKR {redeemableValue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-amber-200 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Total Earned</p>
          <p className="font-medium">{balance.total_earned.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-gray-500">Total Redeemed</p>
          <p className="font-medium">{balance.total_redeemed.toLocaleString()}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Earn {balance.settings.pointsPerPkr} points per PKR 100 spent. Min redeem:{" "}
        {balance.settings.minRedeem} points.
      </p>
    </div>
  );
}
