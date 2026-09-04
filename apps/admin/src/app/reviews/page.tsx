"use client";

import { useState, useEffect, useCallback } from "react";
import { reviewsApi, type AdminReview } from "@/lib/api";
import { Star, CheckCircle, XCircle, RefreshCw, MessageSquare } from "lucide-react";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.list({ page, limit: 20 });
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to load reviews", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setActionLoading(id);
    try {
      if (action === "approve") await reviewsApi.approve(id);
      else await reviewsApi.reject(id);
      loadReviews();
    } catch (err) {
      console.error(`Failed to ${action} review`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3.5 h-3.5 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Reviews</h1>
          <p className="text-sm text-gray-500">{total} reviews awaiting moderation</p>
        </div>
        <button onClick={loadReviews} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No pending reviews</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {renderStars(r.rating)}
                    <span className="font-mono text-xs text-gray-500">#{r.id.slice(0, 8)}</span>
                    {r.is_verified_purchase && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900">{r.comment || "No comment"}</p>
                  <div className="text-xs text-gray-400">
                    Product: {r.product_title || r.product_id} &middot; By: {r.user_name || r.user_id}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(r.id, "approve")}
                    disabled={actionLoading === r.id}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(r.id, "reject")}
                    disabled={actionLoading === r.id}
                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-xs text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={reviews.length < 20}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
