'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  FileSpreadsheet,
  Check,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { fetchSellerProducts, createSellerProduct, SellerProduct } from '../../lib/api';

export default function SellerProductsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [titleUrdu, setTitleUrdu] = useState('');
  const [categoryName, setCategoryName] = useState("Women's Lawn");
  const [basePricePkr, setBasePricePkr] = useState('4999');
  const [comparePricePkr, setComparePricePkr] = useState('6500');
  const [stockQuantity, setStockQuantity] = useState('20');
  const [sku, setSku] = useState('');

  useEffect(() => {
    fetchSellerProducts().then(setProducts);
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createSellerProduct({
      title,
      titleUrdu,
      categoryName,
      basePricePkr: parseInt(basePricePkr, 10),
      compareAtPricePkr: comparePricePkr ? parseInt(comparePricePkr, 10) : undefined,
      stockQuantity: parseInt(stockQuantity, 10),
      sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setProducts([created, ...products]);
    setShowAddModal(false);
    setTitle('');
    setTitleUrdu('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Product Catalog & Inventory</h1>
          <p className="text-xs text-slate-400 mt-1">Manage listings, variant prices, and live Typesense search indexing.</p>
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
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Product Title</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price (PKR)</th>
              <th className="py-3 px-4">Stock</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4 font-mono text-amber-400">{product.sku}</td>
                <td className="py-3 px-4">
                  <div className="text-white font-bold">{product.title}</div>
                  {product.titleUrdu && <div className="text-[10px] text-slate-400 font-urdu">{product.titleUrdu}</div>}
                </td>
                <td className="py-3 px-4">{product.categoryName}</td>
                <td className="py-3 px-4">
                  <span className="font-bold text-white">PKR {product.basePricePkr.toLocaleString()}</span>
                  {product.compareAtPricePkr && (
                    <span className="ml-1.5 text-[10px] text-slate-500 line-through">
                      PKR {product.compareAtPricePkr.toLocaleString()}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`font-bold ${product.stockQuantity > 5 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {product.stockQuantity} units
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-base">Add New Listing to Waw</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Product Title (English)</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 3-Piece Luxury Festive Lawn Suit"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Product Title (Urdu - Optional)</label>
                <input
                  type="text"
                  placeholder="مثال: تھری پیس لگژری فیسٹیو لان سوٹ"
                  value={titleUrdu}
                  onChange={e => setTitleUrdu(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Price (PKR)</label>
                  <input
                    required
                    type="number"
                    value={basePricePkr}
                    onChange={e => setBasePricePkr(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Compare Price (PKR)</label>
                  <input
                    type="number"
                    value={comparePricePkr}
                    onChange={e => setComparePricePkr(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Stock</label>
                  <input
                    required
                    type="number"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SKU Code</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Publish Listing & Index in Search
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
