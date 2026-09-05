"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, AlertCircle } from "lucide-react";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export default function AIDescribePage() {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [attributes, setAttributes] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!productName || !category) {
      setError("Product name and category are required");
      return;
    }

    setLoading(true);
    setError("");
    setDescription("");

    try {
      const attrs: Record<string, string> = {};
      if (attributes) {
        attributes.split("\n").forEach((line) => {
          const [key, ...rest] = line.split(":");
          if (key && rest.length) {
            attrs[key.trim()] = rest.join(":").trim();
          }
        });
      }

      const res = await fetch(`${API_BASE}/api/ai/generate-description`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          product_name: productName,
          category,
          attributes: attrs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "SUBSCRIPTION_REQUIRED") {
          setError("Product Description Generator requires an active Pro or Enterprise subscription. Upgrade your plan to use this feature.");
        } else if (data.code === "TOKEN_LIMIT_REACHED") {
          setError("AI daily limit reached. Please try again tomorrow.");
        } else {
          setError(data.error || "Failed to generate description");
        }
        return;
      }

      setDescription(data.description);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(description);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Description Generator</h1>
          <p className="text-sm text-slate-500">Generate compelling product descriptions with AI</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Premium Cotton Lawn Suit"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Women's Fashion"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Attributes <span className="text-slate-400">(optional, one per line: key: value)</span>
            </label>
            <textarea
              value={attributes}
              onChange={(e) => setAttributes(e.target.value)}
              placeholder={"Color: Sky Blue\nFabric: Pure Cotton\nSize: Medium\nPattern: Floral"}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !productName || !category}
            className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-slate-900 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Description
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {description && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Generated Description</h2>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {description}
          </div>
        </div>
      )}
    </div>
  );
}
