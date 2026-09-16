"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Star, HelpCircle, Inbox, CornerDownLeft } from "lucide-react";
import { sellerFetch } from "@/lib/api";

interface PendingReview {
  id: string;
  rating: number;
  comment: string | null;
  productTitle?: string;
  productSlug?: string;
  createdAt: string;
}

interface PendingQuestion {
  id: string;
  question: string;
  productTitle?: string;
  productSlug?: string;
  createdAt: string;
}

export default function SellerFeedbackPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  // Reply/answer drafts — the page was read-only despite the API exposing
  // ownership-checked POST /api/reviews/:id/reply and /api/questions/:id/answer.
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const data = await sellerFetch<any>("/api/seller/feedback", {
          cache: "no-store" as any,
        });
        setReviews(data.reviews || []);
        setQuestions(data.questions || []);
      } catch (err: any) {
        setError(err.message || "Failed to load feedback");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sendReply = async (reviewId: string) => {
    const text = (replyDrafts[reviewId] || "").trim();
    if (!text) return;
    setSendingId(reviewId);
    setActionError("");
    try {
      await sellerFetch(`/api/reviews/${reviewId}/reply`, {
        method: "POST",
        body: JSON.stringify({ sellerReply: text }),
      });
      setDoneIds((prev) => new Set(prev).add(reviewId));
    } catch (err: any) {
      setActionError(err.message || "Failed to send reply");
    } finally {
      setSendingId(null);
    }
  };

  const sendAnswer = async (questionId: string) => {
    const text = (answerDrafts[questionId] || "").trim();
    if (!text) return;
    setSendingId(questionId);
    setActionError("");
    try {
      await sellerFetch(`/api/questions/${questionId}/answer`, {
        method: "POST",
        body: JSON.stringify({ answer: text }),
      });
      setDoneIds((prev) => new Set(prev).add(questionId));
    } catch (err: any) {
      setActionError(err.message || "Failed to send answer");
    } finally {
      setSendingId(null);
    }
  };;

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3" />
          <div className="h-32 bg-slate-800 rounded-2xl" />
          <div className="h-32 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const empty = reviews.length === 0 && questions.length === 0;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
          Reviews &amp; Q&amp;A
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Customer reviews awaiting your reply and unanswered product questions
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {actionError}
        </div>
      )}

      {empty && !error && (
        <div className="p-10 rounded-2xl bg-[#0f172a] border border-slate-800 text-center">
          <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">You&apos;re all caught up</p>
          <p className="text-xs text-slate-400 mt-1">
            New reviews and product questions from customers will appear here.
          </p>
        </div>
      )}

      {reviews.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400" />
            Reviews awaiting reply ({reviews.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString("en-PK")}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-xs text-slate-300 leading-relaxed">{r.comment}</p>
                )}
                {r.productTitle && (
                  <p className="text-[10px] text-slate-500">on {r.productTitle}</p>
                )}
                {doneIds.has(r.id) ? (
                  <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" /> Reply posted
                  </p>
                ) : (
                  <div className="pt-1 space-y-1.5">
                    <textarea
                      rows={2}
                      value={replyDrafts[r.id] || ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      placeholder="Write a public reply to this review…"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      onClick={() => sendReply(r.id)}
                      disabled={sendingId === r.id || !(replyDrafts[r.id] || "").trim()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-[11px] font-bold transition-colors"
                    >
                      {sendingId === r.id ? "Posting…" : "Post Reply"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {questions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Unanswered questions ({questions.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {questions.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-200">{q.question}</p>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(q.createdAt).toLocaleDateString("en-PK")}
                  </span>
                </div>
                {q.productTitle && (
                  <p className="text-[10px] text-slate-500">on {q.productTitle}</p>
                )}
                {doneIds.has(q.id) ? (
                  <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" /> Answer posted
                  </p>
                ) : (
                  <div className="pt-1 space-y-1.5">
                    <textarea
                      rows={2}
                      value={answerDrafts[q.id] || ""}
                      onChange={(e) =>
                        setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Answer this customer question…"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <button
                      onClick={() => sendAnswer(q.id)}
                      disabled={sendingId === q.id || !(answerDrafts[q.id] || "").trim()}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-[11px] font-bold transition-colors"
                    >
                      {sendingId === q.id ? "Posting…" : "Post Answer"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
