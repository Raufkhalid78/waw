"use client";

import { useEffect, useState } from "react";
import { Check, X, Zap, Building2, Crown } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_pkr: number;
  max_products: number;
  max_images_per_product: number;
  ai_descriptions: boolean;
  advanced_analytics: boolean;
  priority_support: boolean;
  api_access: boolean;
  featured_store: boolean;
  commission_reduction: number;
}

interface Subscription {
  store: {
    subscription_plan: string;
    subscription_active: boolean;
    subscription_expires_at: string | null;
  };
  subscription: {
    plan: Plan;
    status: string;
    expires_at: string;
  } | null;
  productCheck: {
    allowed: boolean;
    current: number;
    limit: number;
  };
}

const planIcons: Record<string, React.ReactNode> = {
  free: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  enterprise: <Building2 className="w-6 h-6" />,
};

const planColors: Record<string, string> = {
  free: "border-gray-200 bg-white",
  pro: "border-purple-200 bg-purple-50",
  enterprise: "border-amber-200 bg-amber-50",
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/+$/, "");

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/subscriptions/plans`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API_BASE}/api/seller/subscription`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([plansData, subData]) => {
        setPlans(plansData.plans || []);
        setSubscription(subData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planName: string) => {
    setSubscribing(planName);
    try {
      const res = await fetch(`${API_BASE}/api/seller/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: planName }),
      });
      if (res.ok) {
        // Refresh subscription data
        const subData = await fetch(`${API_BASE}/api/seller/subscription`, { credentials: "include" }).then((r) => r.json());
        setSubscription(subData);
      }
    } catch {
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You will be downgraded to the Free plan.")) return;
    try {
      await fetch(`${API_BASE}/api/seller/subscription`, { method: "DELETE", credentials: "include" });
      const subData = await fetch(`${API_BASE}/api/seller/subscription`, { credentials: "include" }).then((r) => r.json());
      setSubscription(subData);
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.store?.subscription_plan || "free";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Subscription Plans</h1>
      <p className="text-gray-500 mb-6">
        Choose the plan that fits your business needs.
      </p>

      {/* Current Plan Status */}
      {subscription?.subscription && (
        <div className="bg-white border rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Current Plan</p>
            <p className="text-lg font-bold capitalize">{currentPlan}</p>
            {subscription.subscription.expires_at && (
              <p className="text-xs text-gray-400">
                {subscription.store.subscription_active ? "Renews" : "Expires"}:{" "}
                {new Date(subscription.subscription.expires_at).toLocaleDateString("en-PK")}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Products</p>
            <p className="font-medium">
              {subscription.productCheck.current} / {subscription.productCheck.limit}
            </p>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          const features = [
            { label: `${plan.max_products.toLocaleString()} Products`, included: true },
            { label: `${plan.max_images_per_product} Images per Product`, included: true },
            { label: "AI Product Descriptions", included: plan.ai_descriptions },
            { label: "Advanced Analytics", included: plan.advanced_analytics },
            { label: "Priority Support", included: plan.priority_support },
            { label: "API Access", included: plan.api_access },
            { label: "Featured Store Badge", included: plan.featured_store },
            { label: `${plan.commission_reduction}% Commission Reduction`, included: plan.commission_reduction > 0 },
          ];

          return (
            <div
              key={plan.name}
              className={`rounded-xl border-2 p-6 ${planColors[plan.name]} ${
                isCurrent ? "ring-2 ring-purple-500" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-purple-600">{planIcons[plan.name]}</span>
                <h2 className="text-xl font-bold">{plan.display_name}</h2>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-black">
                  {plan.price_pkr === 0 ? "Free" : `PKR ${plan.price_pkr.toLocaleString()}`}
                </span>
                {plan.price_pkr > 0 && (
                  <span className="text-gray-500 text-sm">/month</span>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={f.included ? "" : "text-gray-400"}>{f.label}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="text-center">
                  <span className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium">
                    Current Plan
                  </span>
                  {currentPlan !== "free" && (
                    <button
                      onClick={handleCancel}
                      className="block w-full mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={subscribing === plan.name}
                  className={`w-full py-2 rounded-lg font-medium transition ${
                    plan.name === "enterprise"
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : plan.name === "pro"
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  } ${subscribing === plan.name ? "opacity-50" : ""}`}
                >
                  {subscribing === plan.name ? "Processing..." : "Subscribe"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
