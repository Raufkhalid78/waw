"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Share2 } from "lucide-react";

interface ReferralStats {
  code: string | null;
  totalReferrals: number;
  completedReferrals: number;
  totalEarnings: number;
  referrals: Array<{
    id: string;
    status: string;
    reward_pkr: number;
    created_at: string;
    completed_at: string | null;
  }>;
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerateCode = async () => {
    const res = await fetch("/api/referrals/generate", { method: "POST" });
    const data = await res.json();
    if (data.code) {
      setStats((prev) => (prev ? { ...prev, code: data.code } : null));
    }
  };

  const copyCode = () => {
    if (!stats?.code) return;
    navigator.clipboard.writeText(stats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (!stats?.code) return;
    const url = `https://waw.com.pk/signup?ref=${stats.code}`;
    if (navigator.share) {
      navigator.share({
        title: "Join Waw Marketplace",
        text: `Use my referral code ${stats.code} and get PKR 100 off your first order!`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  const referralUrl = stats?.code ? `https://waw.com.pk/signup?ref=${stats.code}` : "";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Refer & Earn</h1>
        <Link href="/account" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Account
        </Link>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Your Referral Code</h2>
        {stats?.code ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <code className="text-3xl font-mono font-bold text-purple-700 bg-white px-4 py-2 rounded-lg border">
                {stats.code}
              </code>
              <button
                onClick={copyCode}
                className="p-2 rounded-lg hover:bg-white/50 transition"
                title="Copy code"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Share this code with friends. When they sign up and place their first order,
              you both earn rewards!
            </p>
            <div className="flex gap-3">
              <button
                onClick={shareReferral}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
              >
                <Share2 className="w-4 h-4" />
                Share Referral Link
              </button>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 bg-white border border-purple-300 px-4 py-2 rounded-lg hover:bg-purple-50 transition"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                Copy Link
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">You don&apos;t have a referral code yet.</p>
            <button
              onClick={handleGenerateCode}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Generate My Code
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{stats?.totalReferrals || 0}</p>
          <p className="text-sm text-gray-500">Total Referrals</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats?.completedReferrals || 0}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">PKR {(stats?.totalEarnings || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total Earned</p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">How It Works</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl mb-2">1️⃣</div>
            <p className="font-medium">Share Your Code</p>
            <p className="text-sm text-gray-500">Send your referral code to friends</p>
          </div>
          <div>
            <div className="text-3xl mb-2">2️⃣</div>
            <p className="font-medium">Friend Signs Up</p>
            <p className="text-sm text-gray-500">They use your code at signup</p>
          </div>
          <div>
            <div className="text-3xl mb-2">3️⃣</div>
            <p className="font-medium">Both Earn Rewards</p>
            <p className="text-sm text-gray-500">PKR 200 for you, PKR 100 for them</p>
          </div>
        </div>
      </div>

      {/* Referral History */}
      {stats?.referrals && stats.referrals.length > 0 && (
        <div className="bg-white border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Referral History</h2>
          <div className="space-y-2">
            {stats.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      ref.status === "REWARDED"
                        ? "bg-green-100 text-green-700"
                        : ref.status === "COMPLETED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ref.status}
                  </span>
                  <span className="text-sm text-gray-500 ml-3">
                    {new Date(ref.created_at).toLocaleDateString("en-PK")}
                  </span>
                </div>
                <span className="font-medium">
                  {ref.reward_pkr > 0 ? `+PKR ${ref.reward_pkr}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
