"use client";

import { useState, useEffect } from "react";
import { fetchSellerStore, updateStoreProfile, submitKyc, fetchKycStatus } from "@/lib/api";
import { Settings, Save, BadgeCheck, Building2, CreditCard, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [store, setStore] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [storeForm, setStoreForm] = useState({
    name: "",
    description: "",
    city: "",
    address: "",
    logoUrl: "",
  });

  const [kycForm, setKycForm] = useState({
    cnic_number: "",
    business_registration: "",
    bank_account_number: "",
    bank_name: "",
    bank_branch: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const [storeData, kycData] = await Promise.all([
          fetchSellerStore(),
          fetchKycStatus(),
        ]);
        if (storeData) {
          setStore(storeData);
          setStoreForm({
            name: storeData.name || "",
            description: storeData.description || "",
            city: storeData.city || "",
            address: storeData.address || "",
            logoUrl: storeData.logoUrl || "",
          });
        }
        if (kycData) setKycStatus(kycData);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveStore = async () => {
    setSaving(true);
    setMessage("");
    try {
      await updateStoreProfile(storeForm);
      setMessage("Store profile updated successfully");
    } catch (err: any) {
      setMessage(err.message || "Failed to update store");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitKyc = async () => {
    if (!kycForm.cnic_number || !kycForm.bank_account_number || !kycForm.bank_name) {
      setMessage("CNIC, bank account, and bank name are required");
      return;
    }
    setKycSubmitting(true);
    setMessage("");
    try {
      await submitKyc(kycForm);
      setMessage("KYC submitted successfully");
      const status = await fetchKycStatus();
      if (status) setKycStatus(status);
    } catch (err: any) {
      setMessage(err.message || "Failed to submit KYC");
    } finally {
      setKycSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          message.includes("success") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* Store Profile */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-400" />
          Store Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Store Name</label>
            <input
              type="text"
              value={storeForm.name}
              onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
            <input
              type="text"
              value={storeForm.city}
              onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={storeForm.description}
              onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
            <input
              type="text"
              value={storeForm.address}
              onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Logo URL</label>
            <input
              type="url"
              value={storeForm.logoUrl}
              onChange={(e) => setStoreForm({ ...storeForm, logoUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSaveStore}
          disabled={saving}
          className="px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-900 text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* KYC / Banking */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          KYC & Banking Details
        </h2>

        {kycStatus && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
            kycStatus.status === "APPROVED"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : kycStatus.status === "REJECTED"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}>
            KYC Status: {kycStatus.status}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CNIC Number</label>
            <input
              type="text"
              value={kycForm.cnic_number}
              onChange={(e) => setKycForm({ ...kycForm, cnic_number: e.target.value })}
              placeholder="XXXXX-XXXXXXX-X"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Business Registration (optional)</label>
            <input
              type="text"
              value={kycForm.business_registration}
              onChange={(e) => setKycForm({ ...kycForm, business_registration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bank Name</label>
            <input
              type="text"
              value={kycForm.bank_name}
              onChange={(e) => setKycForm({ ...kycForm, bank_name: e.target.value })}
              placeholder="e.g. HBL, Meezan, JazzCash"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bank Account / IBAN</label>
            <input
              type="text"
              value={kycForm.bank_account_number}
              onChange={(e) => setKycForm({ ...kycForm, bank_account_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Branch (optional)</label>
            <input
              type="text"
              value={kycForm.bank_branch}
              onChange={(e) => setKycForm({ ...kycForm, bank_branch: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleSubmitKyc}
          disabled={kycSubmitting}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl disabled:opacity-50 flex items-center gap-2"
        >
          <BadgeCheck className="w-4 h-4" />
          {kycSubmitting ? "Submitting..." : "Submit KYC"}
        </button>
      </div>
    </div>
  );
}
