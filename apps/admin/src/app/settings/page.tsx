"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Globe, MessageSquare, CreditCard, Loader2 } from "lucide-react";
import { settingsApi, type MarketplaceSettings } from "@/lib/api";

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
        Failed to load settings. Please refresh the page.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure your marketplace pricing, contact info, and policies.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges || mutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              : hasChanges
                ? "Save Changes"
                : "No Changes"}
        </button>
      </div>

      {mutation.isError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          Failed to save settings. Please try again.
        </div>
      )}

      {/* General */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">General</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marketplace Name
            </label>
            <input
              type="text"
              value={localSettings.marketplace_name || ""}
              onChange={(e) => handleChange("marketplace_name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Currency
            </label>
            <input
              type="text"
              value={localSettings.default_currency || "PKR"}
              disabled
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Pricing Rules</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commission (%)
            </label>
            <input
              type="number"
              value={localSettings.default_commission_pct || 0}
              onChange={(e) =>
                handleChange("default_commission_pct", Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Free Delivery Threshold (PKR)
            </label>
            <input
              type="number"
              value={localSettings.free_delivery_threshold || 0}
              onChange={(e) =>
                handleChange("free_delivery_threshold", Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Shipping Fee (PKR)
            </label>
            <input
              type="number"
              value={localSettings.default_shipping_fee || 0}
              onChange={(e) =>
                handleChange("default_shipping_fee", Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              COD Fee (PKR)
            </label>
            <input
              type="number"
              value={localSettings.cod_fee || 0}
              onChange={(e) => handleChange("cod_fee", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <input
              type="text"
              value={localSettings.whatsapp_number || ""}
              onChange={(e) => handleChange("whatsapp_number", e.target.value)}
              placeholder="+923001234567"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Support Email
            </label>
            <input
              type="email"
              value={localSettings.support_email || ""}
              onChange={(e) => handleChange("support_email", e.target.value)}
              placeholder="support@waw.pk"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
