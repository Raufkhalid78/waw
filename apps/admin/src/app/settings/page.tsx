"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Globe, MessageSquare, CreditCard, Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { settingsApi, type MarketplaceSettings } from "@/lib/api";
import { FadeIn, Stagger } from "@/components/Motion";

const DEFAULT_SETTINGS: MarketplaceSettings = {
  marketplace_name: "Waw",
  default_currency: "PKR",
  default_commission_pct: 10,
  free_delivery_threshold: 5000,
  default_shipping_fee: 200,
  cod_fee: 100,
  whatsapp_number: "",
  support_email: "",
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<MarketplaceSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (data?.settings) {
      setLocalSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (updates: Partial<MarketplaceSettings>) => settingsApi.update(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      setHasChanges(false);
    },
  });

  const handleChange = (key: keyof MarketplaceSettings, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    mutation.mutate(localSettings);
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-32 skeleton" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="h-5 w-32 skeleton mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((j) => (
                  <div key={j}>
                    <div className="h-4 w-24 skeleton mb-2" />
                    <div className="h-10 w-full skeleton" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <FadeIn>
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700">
          Failed to load settings. Please refresh the page.
        </div>
      </FadeIn>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          <button
            onClick={handleSave}
            disabled={!hasChanges || mutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold rounded-xl text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
          >
            {mutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mutation.isPending
              ? "Saving..."
              : mutation.isSuccess
                ? "Saved!"
                : "Save Changes"}
          </button>
        </div>
      </FadeIn>

      {mutation.isError && (
        <FadeIn delay={50}>
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
            Failed to save settings. Please try again.
          </div>
        </FadeIn>
      )}

      <Stagger className="space-y-4" stagger={80}>
        {/* General */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Globe className="w-4 h-4 text-gray-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">General</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Marketplace Name
              </label>
              <input
                type="text"
                value={localSettings.marketplace_name || ""}
                onChange={(e) => handleChange("marketplace_name", e.target.value)}
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Default Currency
              </label>
              <input
                type="text"
                value={localSettings.default_currency || "PKR"}
                disabled
                className="admin-input bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-gray-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Pricing Rules</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Commission (%)
              </label>
              <input
                type="number"
                value={localSettings.default_commission_pct || 0}
                onChange={(e) =>
                  handleChange("default_commission_pct", Number(e.target.value))
                }
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Free Delivery Threshold (PKR)
              </label>
              <input
                type="number"
                value={localSettings.free_delivery_threshold || 0}
                onChange={(e) =>
                  handleChange("free_delivery_threshold", Number(e.target.value))
                }
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Default Shipping Fee (PKR)
              </label>
              <input
                type="number"
                value={localSettings.default_shipping_fee || 0}
                onChange={(e) =>
                  handleChange("default_shipping_fee", Number(e.target.value))
                }
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                COD Fee (PKR)
              </label>
              <input
                type="number"
                value={localSettings.cod_fee || 0}
                onChange={(e) => handleChange("cod_fee", Number(e.target.value))}
                className="admin-input"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-gray-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Contact</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={localSettings.whatsapp_number || ""}
                onChange={(e) => handleChange("whatsapp_number", e.target.value)}
                placeholder="+923001234567"
                className="admin-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Support Email
              </label>
              <input
                type="email"
                value={localSettings.support_email || ""}
                onChange={(e) => handleChange("support_email", e.target.value)}
                placeholder="support@waw.pk"
                className="admin-input"
              />
            </div>
          </div>
        </div>
      </Stagger>

      {/* MFA Link */}
      <FadeIn delay={200}>
        <Link
          href="/settings/mfa"
          className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-amber-300 hover:bg-amber-50 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Multi-Factor Authentication (MFA)</h3>
            <p className="text-xs text-gray-500">Add TOTP-based 2FA to your admin account for enhanced security</p>
          </div>
          <span className="ml-auto text-gray-300 group-hover:text-amber-500 transition-colors">→</span>
        </Link>
      </FadeIn>
    </div>
  );
}
