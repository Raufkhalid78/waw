"use client";

import { useState, useEffect, useCallback } from "react";
import { FadeIn } from "@/components/Motion";
import { flashSalesApi, productsApi, AdminFlashSale, AdminProduct } from "@/lib/api";
import {
  Zap, Plus, Trash2, X, CheckCircle2,
  Calendar, Clock, Package, Search, AlertCircle,
} from "lucide-react";

export default function FlashSalesPage() {
  const [sales, setSales] = useState<AdminFlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddItems, setShowAddItems] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<AdminProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    starts_at: "",
    ends_at: "",
    discount_percent: 0,
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await flashSalesApi.list();
      setSales(data);
    } catch (err) {
      console.error("Failed to load flash sales", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await flashSalesApi.create(formData);
      setShowCreate(false);
      setFormData({ name: "", starts_at: "", ends_at: "", discount_percent: 0 });
      loadSales();
    } catch (err) {
      console.error("Failed to create flash sale", err);
    }
  };

  const toggleActive = async (sale: AdminFlashSale) => {
    try {
      await flashSalesApi.update(sale.id, { is_active: !sale.is_active });
      loadSales();
    } catch (err) {
      console.error("Failed to update flash sale", err);
    }
  };

  const deleteSale = async (id: string) => {
    if (!confirm("Delete this flash sale?")) return;
    try {
      await flashSalesApi.delete(id);
      loadSales();
    } catch (err) {
      console.error("Failed to delete flash sale", err);
    }
  };

  const searchProducts = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await productsApi.list({ search: q, limit: 10 });
      setSearchResults(data.products || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch, searchProducts]);

  const handleAddItem = async (saleId: string, product: AdminProduct, promoPrice: number, stock: number) => {
    setAddError(null);
    try {
      await flashSalesApi.addItem(saleId, {
        variant_id: product.id,
        promotional_price_pkr: promoPrice,
        allocated_stock: stock,
      });
      setShowAddItems(null);
      setProductSearch("");
      setSearchResults([]);
      loadSales();
    } catch (err: any) {
      setAddError(err.message || "Failed to add product");
    }
  };

  const now = new Date();
  const getStatus = (sale: AdminFlashSale) => {
    const start = new Date(sale.starts_at);
    const end = new Date(sale.ends_at);
    if (!sale.is_active) return { label: "Disabled", color: "bg-gray-100 text-gray-600" };
    if (now < start) return { label: "Scheduled", color: "bg-blue-100 text-blue-700" };
    if (now > end) return { label: "Ended", color: "bg-red-100 text-red-700" };
    return { label: "Live", color: "bg-green-100 text-green-700" };
  };

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-amber-500" />
              Flash Sales
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage time-limited promotional sales with product assignments</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Flash Sale
          </button>
        </div>
      </FadeIn>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">Create Flash Sale</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Sale Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Independence Day Mega Sale"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                />
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
              <div>
                <label className="text-xs font-bold text-gray-700">Discount %</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={formData.discount_percent}
                  onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formData.name || !formData.starts_at || !formData.ends_at}
                className="flex-1 px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 text-slate-900 font-bold rounded-xl text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddItems && (
        <AddItemsModal
          saleId={showAddItems}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          searchResults={searchResults}
          searching={searching}
          error={addError}
          onAdd={(product, promoPrice, stock) => handleAddItem(showAddItems, product, promoPrice, stock)}
          onClose={() => { setShowAddItems(null); setProductSearch(""); setSearchResults([]); setAddError(null); }}
        />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <Zap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 mb-1">No Flash Sales</h3>
          <p className="text-sm text-gray-500">Create your first flash sale to boost sales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sales.map((sale) => {
            const status = getStatus(sale);
            return (
              <div key={sale.id} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{sale.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                      {sale.item_count !== undefined && sale.item_count > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          {sale.item_count} items
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowAddItems(sale.id)}
                      className="p-1.5 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                      title="Add Products"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleActive(sale)}
                      className={`p-1.5 rounded-lg cursor-pointer ${sale.is_active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`}
                      title={sale.is_active ? "Disable" : "Enable"}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteSale(sale.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(sale.starts_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(sale.ends_at).toLocaleDateString()}
                  </span>
                  {sale.discount_percent ? (
                    <span className="flex items-center gap-1 text-amber-600 font-bold">
                      <Package className="w-3.5 h-3.5" />
                      {sale.discount_percent}% off
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddItemsModal({
  saleId,
  productSearch,
  setProductSearch,
  searchResults,
  searching,
  error,
  onAdd,
  onClose,
}: {
  saleId: string;
  productSearch: string;
  setProductSearch: (v: string) => void;
  searchResults: AdminProduct[];
  searching: boolean;
  error: string | null;
  onAdd: (product: AdminProduct, promoPrice: number, stock: number) => void;
  onClose: () => void;
}) {
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [promoPrice, setPromoPrice] = useState(0);
  const [stock, setStock] = useState(10);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900">Add Products to Flash Sale</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => { setProductSearch(e.target.value); setSelectedProduct(null); }}
            placeholder="Search products by title..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          />
        </div>

        {searching && <p className="text-xs text-gray-400 text-center">Searching...</p>}

        {searchResults.length > 0 && !selectedProduct && (
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedProduct(p); setPromoPrice(Math.round(p.price_pkr * 0.8)); }}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                  <p className="text-xs text-gray-500">PKR {p.price_pkr.toLocaleString()} | {p.store_name || "N/A"}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedProduct && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden shrink-0">
                {selectedProduct.images?.[0] ? (
                  <img src={selectedProduct.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Package className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{selectedProduct.title}</p>
                <p className="text-xs text-gray-500">Original: PKR {selectedProduct.price_pkr.toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700">Promotional Price (PKR)</label>
                <input
                  type="number"
                  min="1"
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700">Allocated Stock</label>
                <input
                  type="number"
                  min="1"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                />
              </div>
            </div>
            <button
              onClick={() => onAdd(selectedProduct, promoPrice, stock)}
              disabled={promoPrice <= 0 || stock <= 0}
              className="w-full px-4 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-gray-200 text-slate-900 font-bold rounded-xl text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              Add to Flash Sale
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
