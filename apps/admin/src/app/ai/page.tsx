"use client";

import { useState, useEffect } from "react";
import { Sparkles, Activity, AlertCircle, RefreshCw } from "lucide-react";

interface AIUsageData {
  month: string;
  total_tokens: number;
  by_feature: Record<string, number>;
  request_count: number;
  daily_limit: number;
}

export default function AdminAIPage() {
  const [usage, setUsage] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsage = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("waw_admin_token");
      const res = await fetch("/api/ai/usage", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load AI usage");
      const data = await res.json();
      setUsage(data);
    } catch {
      setError("Failed to load AI usage data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const featureLabels: Record<string, string> = {
    description_generator: "Description Generator",
    chatbot: "Shopping Chatbot",
    recommendations: "Recommendations",
    search: "AI Search",
    unknown: "Other",
  };

  const featureColors: Record<string, string> = {
    description_generator: "bg-amber-100 text-amber-700",
    chatbot: "bg-blue-100 text-blue-700",
    recommendations: "bg-green-100 text-green-700",
    search: "bg-purple-100 text-purple-700",
    unknown: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Usage Dashboard</h1>
            <p className="text-sm text-gray-500">Monitor OpenRouter API consumption</p>
          </div>
        </div>
        <button
          onClick={loadUsage}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading && !usage ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : usage ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Month</div>
              <div className="text-2xl font-bold text-gray-900">{usage.month}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Total Requests</div>
              <div className="text-2xl font-bold text-gray-900">{usage.request_count.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Total Tokens</div>
              <div className="text-2xl font-bold text-gray-900">{usage.total_tokens.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Daily Request Limit</div>
              <div className="text-2xl font-bold text-gray-900">{usage.daily_limit.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              Usage by Feature
            </h2>
            {Object.keys(usage.by_feature).length === 0 ? (
              <p className="text-sm text-gray-500">No AI usage recorded this month.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(usage.by_feature).map(([feature, tokens]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${featureColors[feature] || featureColors.unknown}`}>
                        {featureLabels[feature] || feature}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{tokens.toLocaleString()} tokens</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
