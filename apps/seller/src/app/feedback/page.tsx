"use client";

import { MessageSquare, Star, MessageCircleQuestion } from "lucide-react";

export default function FeedbackPage() {
  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
            Reviews & Q&A
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your product reviews and answer buyer questions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-slate-100">Product Reviews</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-10 bg-slate-800/30 rounded-lg border border-slate-700/30 border-dashed">
            <Star className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">No pending reviews require your attention.</p>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircleQuestion className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-slate-100">Customer Questions</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-10 bg-slate-800/30 rounded-lg border border-slate-700/30 border-dashed">
            <MessageCircleQuestion className="w-10 h-10 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">No unanswered questions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
