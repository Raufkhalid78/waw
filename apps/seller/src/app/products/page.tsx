"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  FileSpreadsheet,
  Check,
  X,
  Sparkles,
  Layers,
  Pencil,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  fetchSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  uploadFile,
  SellerProduct,
} from "../../lib/api";

export default function SellerProductsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SellerProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [titleUrdu, setTitleUrdu] = useState("");
  const [categoryName, setCategoryName] = useState("Women's Lawn");
  const [categoryId, setCategoryId] = useState("cat_lawn");
  const [basePricePkr, setBasePricePkr] = useState("4999");
  const [comparePricePkr, setComparePricePkr] = useState("6500");
  const [stockQuantity, setStockQuantity] = useState("20");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState(
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80",
  );
  const [description, setDescription] = useState(
    "Handcrafted premium quality collection direct from registered maker.",
  );
  const [weightKg, setWeightKg] = useState("1.0");

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editTitleUrdu, setEditTitleUrdu] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editBasePricePkr, setEditBasePricePkr] = useState("");
  const [editComparePricePkr, setEditComparePricePkr] = useState("");
  const [editStockQuantity, setEditStockQuantity] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editWeightKg, setEditWeightKg] = useState("1.0");

  useEffect(() => {
    fetchSellerProducts().then(setProducts);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    if (isEdit) setUploadingEdit(true);
    else setUploading(true);

    try {
      const result = await uploadFile(file, "products");
      if (isEdit) {
        setEditImageUrl(result.url);
      } else {
        setImageUrl(result.url);
      }
    } catch (err: any) {
      alert(err.message || "Failed to upload image");
    } finally {
      if (isEdit) setUploadingEdit(false);
      else setUploading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createSellerProduct({
        title,
        titleUrdu,
        categoryId,
        basePricePkr: parseInt(basePricePkr, 10),
        compareAtPricePkr: comparePricePkr
          ? parseInt(comparePricePkr, 10)
          : undefined,
        stockQuantity: parseInt(stockQuantity, 10),
        sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        imageUrl,
        description,
        weightKg: parseFloat(weightKg) || 1.0,
      });
      setProducts([created, ...products]);
      setShowAddModal(false);
      resetAddForm();
    } catch (err: any) {
      alert(err.message || "Failed to create product");
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateSellerProduct(editingProduct.id, {
        title: editTitle,
        title_urdu: editTitleUrdu,
        description: editDescription,
        base_price_pkr: parseInt(editBasePricePkr, 10),
        compare_at_price_pkr: editComparePricePkr ? parseInt(editComparePricePkr, 10) : undefined,
        stock_quantity: parseInt(editStockQuantity, 10),
        category_id: editCategoryId,
        image_url: editImageUrl,
        weight_kg: parseFloat(editWeightKg) || 1.0,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                title: editTitle,
                titleUrdu: editTitleUrdu,
                basePricePkr: parseInt(editBasePricePkr, 10),
                compareAtPricePkr: editComparePricePkr ? parseInt(editComparePricePkr, 10) : undefined,
                stockQuantity: parseInt(editStockQuantity, 10),
                categoryName: editCategoryName || p.categoryName,
                categoryId: editCategoryId || p.categoryId,
                images: editImageUrl ? [editImageUrl] : p.images,
                weightKg: parseFloat(editWeightKg) || 1.0,
              }
            : p
        )
      );
      setShowEditModal(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert(err.message || "Failed to update product");
    }
  };

  const handleDeleteProduct = async (product: SellerProduct) => {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return;
    try {
      await deleteSellerProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const openEditModal = (product: SellerProduct) => {
    setEditingProduct(product);
    setEditTitle(product.title);
    setEditTitleUrdu(product.titleUrdu || "");
    setEditCategoryId(product.categoryId || "");
    setEditCategoryName(product.categoryName || "");
    setEditBasePricePkr(String(product.basePricePkr));
    setEditComparePricePkr(String(product.compareAtPricePkr || ""));
    setEditStockQuantity(String(product.stockQuantity));
    setEditDescription("");
    setEditImageUrl(product.images?.[0] || "");
    setEditWeightKg(String(product.weightKg || 1.0));
    setShowEditModal(true);
  };

  const resetAddForm = () => {
    setTitle("");
    setTitleUrdu("");
    setCategoryId("cat_lawn");
    setCategoryName("Women's Lawn");
    setBasePricePkr("4999");
    setComparePricePkr("6500");
    setStockQuantity("20");
    setSku("");
    setImageUrl("https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80");
    setDescription("Handcrafted premium quality collection direct from registered maker.");
    setWeightKg("1.0");
  };

  const filteredProducts = products.filter((p) =>
    searchQuery ? p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const ImageUploadField = ({
    value,
    onChange,
    uploading,
    fileRef,
    onUploadClick,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploading: boolean;
    fileRef: React.Ref<HTMLInputElement>;
    onUploadClick: () => void;
  }) => (
    <div>
      <label className="block text-slate-300 font-semibold mb-1">Product Image</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Product"
            className="w-full h-40 object-cover rounded-xl border border-slate-700"
          />
          <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
            <button
              type="button"
              onClick={onUploadClick}
              className="px-3 py-1.5 bg-amber-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 inline mr-1" />
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange({ target: { value: "" } } as any)}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="w-full h-40 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-400/50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
          ) : (
            <ImageIcon className="w-8 h-8 text-slate-500" />
          )}
          <span className="text-xs text-slate-400">
            {uploading ? "Uploading..." : "Click to upload image"}
          </span>
          <span className="text-[10px] text-slate-500">JPG, PNG up to 5MB</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Product Catalog & Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage listings, variant prices, and live Typesense search indexing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/products/bulk-upload"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-400" /> Bulk CSV
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Products Table or Empty State */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl overflow-x-auto">
        {products.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-white">
              No products listed yet
            </div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add your first product listing to start selling to buyers across
              Karachi, Lahore, Islamabad, and nationwide.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-400/10 cursor-pointer"
            >
              + Create First Product
            </button>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12">Image</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price (PKR)</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {filteredProducts.map((product) => (
                <tr
                    key={product.id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400">
                      {product.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white font-bold">{product.title}</div>
                      {product.titleUrdu && (
                        <div className="text-[10px] text-slate-400 font-urdu">
                          {product.titleUrdu}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{product.categoryName}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-white font-mono">
                        PKR {product.basePricePkr.toLocaleString()}
                      </span>
                      {product.compareAtPricePkr && (
                        <span className="ml-1.5 text-[10px] text-slate-500 line-through font-mono">
                          PKR {product.compareAtPricePkr.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold ${product.stockQuantity > 5 ? "text-emerald-400" : product.stockQuantity > 0 ? "text-amber-400" : "text-red-400"}`}
                      >
                        {product.stockQuantity} units
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        product.stockQuantity > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}>
                        {product.stockQuantity > 0 ? "Live" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-black text-white text-base">
                  Add New Listing to Waw
                </h3>
                <p className="text-[11px] text-slate-400">
                  Products are indexed in Typesense search with split-courier
                  routing.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <ImageUploadField
                value={imageUrl}
                onChange={(e) => handleImageUpload(e, false)}
                uploading={uploading}
                fileRef={fileInputRef}
                onUploadClick={() => fileInputRef.current?.click()}
              />

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Product Title (English)
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 3-Piece Luxury Festive Lawn Suit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Product Title (Urdu - Optional)
                </label>
                <input
                  type="text"
                  placeholder="مثال: تھری پیس لگژری فیسٹیو لان سوٹ"
                  value={titleUrdu}
                  onChange={(e) => setTitleUrdu(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Marketplace Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      const opt = e.target.selectedOptions[0]?.text;
                      if (opt) setCategoryName(opt);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cat_lawn">Women&apos;s Lawn &amp; Festive</option>
                    <option value="cat_leather">Leather Goods & Wallets</option>
                    <option value="cat_footwear">Heritage Footwear & Chappals</option>
                    <option value="cat_sports">Sialkot Sports Equipment</option>
                    <option value="cat_tech">Audio & Mobile Tech</option>
                    <option value="cat_artisan">Chiniot Handicrafts & Decor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Shipping Weight (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                    placeholder="1.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Price (PKR)
                  </label>
                  <input
                    required
                    type="number"
                    value={basePricePkr}
                    onChange={(e) => setBasePricePkr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Compare Price (PKR)
                  </label>
                  <input
                    type="number"
                    value={comparePricePkr}
                    onChange={(e) => setComparePricePkr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Available Stock Units
                  </label>
                  <input
                    required
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    SKU Code (Auto if blank)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LHR-LAWN-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 resize-none"
                  placeholder="Provide material details, sizing, and guarantee terms..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Publish Listing to Waw Marketplace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
          />
          <div className="relative bg-[#0f172a] border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white">Edit Product</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditProduct} className="space-y-4">
              <ImageUploadField
                value={editImageUrl}
                onChange={(e) => handleImageUpload(e, true)}
                uploading={uploadingEdit}
                fileRef={editFileInputRef}
                onUploadClick={() => editFileInputRef.current?.click()}
              />

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Product Title (Urdu)</label>
                <input
                  type="text"
                  value={editTitleUrdu}
                  onChange={(e) => setEditTitleUrdu(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => {
                      setEditCategoryId(e.target.value);
                      setEditCategoryName(e.target.selectedOptions[0]?.text || "");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cat_lawn">Women&apos;s Lawn &amp; Festive</option>
                    <option value="cat_leather">Leather Goods & Wallets</option>
                    <option value="cat_footwear">Heritage Footwear & Chappals</option>
                    <option value="cat_sports">Sialkot Sports Equipment</option>
                    <option value="cat_tech">Audio & Mobile Tech</option>
                    <option value="cat_artisan">Chiniot Handicrafts & Decor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Stock Units</label>
                  <input
                    type="number"
                    required
                    value={editStockQuantity}
                    onChange={(e) => setEditStockQuantity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Price (PKR)</label>
                  <input
                    type="number"
                    required
                    value={editBasePricePkr}
                    onChange={(e) => setEditBasePricePkr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Compare Price (PKR)</label>
                  <input
                    type="number"
                    value={editComparePricePkr}
                    onChange={(e) => setEditComparePricePkr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Weight (Kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editWeightKg}
                    onChange={(e) => setEditWeightKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
