"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function BulkUploadPage() {
  const [csvContent, setCsvContent] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const sampleCsv = `Title,Title_Urdu,Category,Price_PKR,Compare_Price_PKR,Stock,SKU
Unstitched Festive Lawn 3PC,فیسٹیو لان سوٹ,Women's Lawn,8999,11999,25,LHR-LWN-001
Pure Silk Kurta,خالص سلک کرتا,Men's Festive,7250,9500,15,LHR-SLK-002
Digital Print Jacquard Kurti,ڈیجیٹل پرنٹ کرتی,Ready to Wear,4999,6500,40,LHR-JAC-003`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return;
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => (obj[h] = values[i]));
      return obj;
    });
    setParsedRows(rows);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waw_products_sample_template.csv";
    a.click();
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setUploading(true);
    const token = localStorage.getItem("waw_seller_token");
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    let successCount = 0;

    for (const row of parsedRows) {
      try {
        const res = await fetch(`${API_BASE}/api/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: row.Title || row.title,
            titleUrdu: row.Title_Urdu || row.title_urdu,
            basePricePkr: parseInt(row.Price_PKR || row.price_pkr || "0", 10),
            compareAtPricePkr: row.Compare_Price_PKR ? parseInt(row.Compare_Price_PKR, 10) : undefined,
            stockQuantity: parseInt(row.Stock || row.stock || "0", 10),
            sku: row.SKU || row.sku,
            imageUrl: row.Image_URL || row.image_url,
            description: row.Description || row.description,
          }),
        });
        if (res.ok) successCount++;
      } catch {
        // Skip failed rows
      }
    }

    setSuccessCount(successCount);
    setUploading(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/products"
        className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Bulk CSV Product Onboarding
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Import hundreds of SKUs simultaneously without manual form entry.
        </p>
      </div>

      {/* Download Sample Card */}
      <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-white">
            Need the official Waw CSV format?
          </div>
          <div className="text-[11px] text-slate-400">
            Download our pre-formatted template with bilingual columns.
          </div>
        </div>
        <button
          onClick={handleDownloadSample}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-4 h-4" /> Download Sample CSV
        </button>
      </div>

      {/* Drag and Drop Zone */}
      <div className="p-8 rounded-2xl bg-[#0f172a] border-2 border-dashed border-slate-700 hover:border-amber-400 text-center space-y-4 transition-colors">
        <UploadCloud className="w-10 h-10 text-amber-400 mx-auto" />
        <div>
          <div className="text-sm font-bold text-white">
            Select a CSV File to Upload
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            UTF-8 encoded .csv files up to 10MB
          </div>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block mx-auto text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-400 file:text-slate-950 hover:file:bg-amber-300 cursor-pointer"
        />
      </div>

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs">
              Parsed Preview ({parsedRows.length} SKUs ready)
            </span>
            <button
              onClick={handleImport}
              disabled={uploading}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition-colors"
            >
              {uploading
                ? "Publishing..."
                : `Import ${parsedRows.length} Listings`}
            </button>
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Title</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Price</th>
                  <th className="py-2 px-3">Stock</th>
                  <th className="py-2 px-3">SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {parsedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-2 px-3 font-semibold text-white">
                      {r.Title || r.title}
                    </td>
                    <td className="py-2 px-3">{r.Category || r.category}</td>
                    <td className="py-2 px-3 font-bold text-amber-400">
                      PKR {r.Price_PKR || r.price}
                    </td>
                    <td className="py-2 px-3">{r.Stock || r.stock}</td>
                    <td className="py-2 px-3 font-mono">{r.SKU || r.sku}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {successCount !== null && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Successfully imported{" "}
          {successCount} products into your active store inventory!
        </div>
      )}
    </div>
  );
}
