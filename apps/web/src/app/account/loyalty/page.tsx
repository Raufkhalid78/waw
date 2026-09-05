"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LoyaltyTransaction {
  id: string;
  type: "EARN" | "REDEEM" | "EXPIRE" | "ADJUSTMENT";
  points: number;
  description: string;
  created_at: string;
}

export default function LoyaltyPage() {
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/loyalty/history?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(() => {
        setTransactions([]);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const typeColors: Record<string, string> = {
    EARN: "text-green-600 bg-green-50",
    REDEEM: "text-blue-600 bg-blue-50",
    EXPIRE: "text-red-600 bg-red-50",
    ADJUSTMENT: "text-gray-600 bg-gray-50",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Loyalty Points</h1>
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Account
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-4">⭐</p>
          <p className="text-gray-500">No loyalty transactions yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Earn points with every purchase!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-white border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      typeColors[tx.type] || "text-gray-600 bg-gray-50"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString("en-PK", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-lg font-bold ${
                    tx.points > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {tx.points > 0 ? "+" : ""}
                  {tx.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
