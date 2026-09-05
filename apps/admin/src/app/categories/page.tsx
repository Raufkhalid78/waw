"use client";

import { useState, useEffect, useRef } from "react";
import { FadeIn } from "@/components/Motion";
import { categoriesApi, uploadApi, AdminCategory } from "@/lib/api";
import {
  FolderTree, Plus, Trash2, Edit2, X, ChevronRight, ChevronDown,
  Upload, CheckCircle2, XCircle,
} from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_urdu: "",
    slug: "",
    description: "",
    parent_id: "",
    image_url: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.list();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

  const resetForm = () => {
    setFormData({ name: "", name_urdu: "", slug: "", description: "", parent_id: "", image_url: "" });
  };

  const handleCreate = async () => {
    try {
      await categoriesApi.create({
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
        parent_id: formData.parent_id || undefined,
      });
      setShowCreate(false);
      resetForm();
      loadCategories();
    } catch (err) {
      console.error("Failed to create category", err);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await categoriesApi.update(editingId, {
        ...formData,
        slug: formData.slug || generateSlug(formData.name),
        parent_id: formData.parent_id || undefined,
      });
      setEditingId(null);
      resetForm();
      loadCategories();
    } catch (err) {
      console.error("Failed to update category", err);
    }
  };

  const toggleActive = async (cat: AdminCategory) => {
    try {
      await categoriesApi.update(cat.id, { is_active: !cat.is_active });
      loadCategories();
    } catch (err) {
      console.error("Failed to toggle category", err);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Products in this category will become uncategorized.")) return;
    try {
      await categoriesApi.delete(id);
      loadCategories();
    } catch (err) {
      console.error("Failed to delete category", err);
    }
  };

  const startEdit = (cat: AdminCategory) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      name_urdu: cat.name_urdu || "",
      slug: cat.slug,
      description: cat.description || "",
      parent_id: cat.parent_id || "",
      image_url: cat.image_url || "",
    });
  };

  const parentCategories = categories.filter((c) => !c.parent_id);
  const getChildCategories = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const CategoryForm = ({ onSave, saveLabel }: { onSave: () => void; saveLabel: string }) => (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-gray-700">Name (English)</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => {
            const name = e.target.value;
            setFormData({ ...formData, name, slug: formData.slug || generateSlug(name) });
          }}
          placeholder="e.g., Leather Crafts"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700">Name (Urdu)</label>
        <input
          type="text"
          value={formData.name_urdu}
          onChange={(e) => setFormData({ ...formData, name_urdu: e.target.value })}
          placeholder="چمڑے کی صنعت"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          dir="rtl"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700">Slug</label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          placeholder="leather-crafts"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none font-mono"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700">Parent Category (optional)</label>
        <select
          value={formData.parent_id}
          onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
        >
          <option value="">None (Top-level)</option>
          {parentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-700">Category Image</label>
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
          <div className="mt-2 w-full h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!formData.name}
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
              <FolderTree className="w-6 h-6 text-amber-500" />
              Category Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">Organize your product catalog with categories</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); resetForm(); }}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </FadeIn>

      {(showCreate || editingId) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">{editingId ? "Edit Category" : "Create Category"}</h2>
              <button onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CategoryForm onSave={editingId ? handleUpdate : handleCreate} saveLabel={editingId ? "Update" : "Create"} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <FolderTree className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 mb-1">No Categories</h3>
          <p className="text-sm text-gray-500">Create categories to organize your products.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {parentCategories.map((cat) => {
              const children = getChildCategories(cat.id);
              const isExpanded = expandedParents.has(cat.id);
              return (
                <div key={cat.id}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    {children.length > 0 ? (
                      <button onClick={() => toggleExpand(cat.id)} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="w-6" />
                    )}
                    {cat.image_url && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm text-gray-900">{cat.name}</span>
                      {cat.name_urdu && <span className="text-xs text-gray-400 mr-2" dir="rtl">{cat.name_urdu}</span>}
                      <span className="text-xs text-gray-400 ml-2 font-mono">/{cat.slug}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(cat)}
                        className={`p-1.5 rounded-lg cursor-pointer ${cat.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                        title={cat.is_active ? "Deactivate" : "Activate"}
                      >
                        {cat.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && children.length > 0 && (
                    <div className="bg-gray-50 divide-y divide-gray-100">
                      {children.map((child) => (
                        <div key={child.id} className="flex items-center gap-3 px-12 py-2.5">
                          {child.image_url && (
                            <div className="w-6 h-6 rounded overflow-hidden bg-gray-100 shrink-0">
                              <img src={child.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700">{child.name}</span>
                            {child.name_urdu && <span className="text-xs text-gray-400 mr-2" dir="rtl">{child.name_urdu}</span>}
                            <span className="text-xs text-gray-400 ml-2 font-mono">/{child.slug}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleActive(child)}
                              className={`p-1.5 rounded-lg cursor-pointer ${child.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                              title={child.is_active ? "Deactivate" : "Activate"}
                            >
                              {child.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => startEdit(child)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteCategory(child.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
