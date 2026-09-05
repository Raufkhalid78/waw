"use client";

import { useState, useEffect, useRef } from "react";
import { FadeIn } from "@/components/Motion";
import { bannersApi, uploadApi, AdminBanner } from "@/lib/api";
import {
  Image, Plus, Trash2, X, Eye, EyeOff, Upload, GripVertical,
} from "lucide-react";

export default function BannersPage() {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    title_urdu: "",
    subtitle: "",
    tag: "",
    image_url: "",
    link_url: "/",
    link_text: "Shop Now",
    position: "homepage",
    campaign_type: "TOP_BANNER",
    sort_order: 0,
    starts_at: "",
    ends_at: "",
  });

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const data = await bannersApi.list();
      setBanners(data);
    } catch (err) {
      console.error("Failed to load banners", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "", title_urdu: "", subtitle: "", tag: "", image_url: "",
      link_url: "/", link_text: "Shop Now", position: "homepage",
      campaign_type: "TOP_BANNER", sort_order: 0, starts_at: "", ends_at: "",
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadApi.upload(file, "stores");
      setFormData({ ...formData, image_url: result.url });
    } catch {
      alert("Image upload failed. Try entering a URL manually.");
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await bannersApi.create({
        ...formData,
        start_date: formData.starts_at || undefined,
        end_date: formData.ends_at || undefined,
      } as any);
      setShowCreate(false);
      resetForm();
      loadBanners();
    } catch (err) {
      console.error("Failed to create banner", err);
    }
  };

  const handleUpdate = async () => {
    if (!editingBanner) return;
    try {
      await bannersApi.update(editingBanner.id, {
        ...formData,
        start_date: formData.starts_at || undefined,
        end_date: formData.ends_at || undefined,
      } as any);
      setEditingBanner(null);
      resetForm();
      loadBanners();
    } catch (err) {
      console.error("Failed to update banner", err);
    }
  };

  const startEdit = (banner: AdminBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      title_urdu: banner.title_urdu || "",
      subtitle: banner.subtitle || "",
      tag: banner.tag || "",
      image_url: banner.image_url,
      link_url: banner.link_url || "/",
      link_text: banner.link_text || "Shop Now",
      position: banner.position || "homepage",
      campaign_type: banner.campaign_type || "TOP_BANNER",
      sort_order: banner.sort_order || 0,
      starts_at: banner.start_date ? banner.start_date.slice(0, 16) : "",
      ends_at: banner.end_date ? banner.end_date.slice(0, 16) : "",
    });
  };

  const toggleActive = async (banner: AdminBanner) => {
    try {
      await bannersApi.update(banner.id, { is_active: !banner.is_active });
      loadBanners();
    } catch (err) {
      console.error("Failed to update banner", err);
    }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await bannersApi.delete(id);
      loadBanners();
    } catch (err) {
      console.error("Failed to delete banner", err);
    }
  };

  const BannerForm = ({ onSave, saveLabel }: { onSave: () => void; saveLabel: string }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700">Title (English)</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Eid Mega Sale"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700">Title (Urdu)</label>
          <input
            type="text"
            value={formData.title_urdu}
            onChange={(e) => setFormData({ ...formData, title_urdu: e.target.value })}
            placeholder="عید میگا سیل"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            dir="rtl"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700">Subtitle</label>
        <input
          type="text"
          value={formData.subtitle}
          onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
          placeholder="Up to 70% off on selected items"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700">Banner Image</label>
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://... or upload below"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        {formData.image_url && (
          <div className="mt-2 w-full h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700">Link URL</label>
          <input
            type="text"
            value={formData.link_url}
            onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
            placeholder="/category/lawn"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700">Link Text</label>
          <input
            type="text"
            value={formData.link_text}
            onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
            placeholder="Shop Now"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700">Position</label>
          <select
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          >
            <option value="homepage">Homepage</option>
            <option value="category">Category Page</option>
            <option value="sidebar">Sidebar</option>
            <option value="popup">Popup</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700">Campaign Type</label>
          <select
            value={formData.campaign_type}
            onChange={(e) => setFormData({ ...formData, campaign_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          >
            <option value="TOP_BANNER">Top Banner</option>
            <option value="PROMO_STRIP">Promo Strip</option>
            <option value="SHORTCUT_LINK">Shortcut Link</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700">Tag</label>
          <input
            type="text"
            value={formData.tag}
            onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
            placeholder="e.g., EID2026"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700">Sort Order</label>
          <input
            type="number"
            min="0"
            value={formData.sort_order}
            onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700">Starts At</label>
          <input
            type="datetime-local"
            value={formData.starts_at}
            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700">Ends At</label>
          <input
            type="datetime-local"
            value={formData.ends_at}
            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => { setShowCreate(false); setEditingBanner(null); resetForm(); }}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!formData.title || !formData.image_url}
          className="flex-1 px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 text-slate-900 font-bold rounded-xl text-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Image className="w-6 h-6 text-amber-500" />
              Banners & Campaigns
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage homepage and promotional banners</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); resetForm(); }}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Banner
          </button>
        </div>
      </FadeIn>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Create Banner</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <BannerForm onSave={handleCreate} saveLabel="Create" />
          </div>
        </div>
      )}

      {editingBanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Edit Banner</h2>
              <button onClick={() => { setEditingBanner(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <BannerForm onSave={handleUpdate} saveLabel="Update" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Image className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 mb-1">No Banners</h3>
          <p className="text-sm text-gray-500">Create your first banner to promote deals.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 text-gray-300 shrink-0 flex justify-center">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="w-32 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Image className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 truncate">{banner.title}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${banner.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {banner.is_active ? "Active" : "Inactive"}
                  </span>
                  {banner.tag && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {banner.tag}
                    </span>
                  )}
                </div>
                {banner.subtitle && <p className="text-xs text-gray-500 truncate">{banner.subtitle}</p>}
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                  <span>Position: {banner.position}</span>
                  <span>Type: {banner.campaign_type}</span>
                  <span>Order: {banner.sort_order ?? 0}</span>
                  <span>Link: {banner.link_url}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(banner)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                  title="Edit"
                >
                  <GripVertical className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleActive(banner)}
                  className={`p-1.5 rounded-lg cursor-pointer ${banner.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                  title={banner.is_active ? "Deactivate" : "Activate"}
                >
                  {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteBanner(banner.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
