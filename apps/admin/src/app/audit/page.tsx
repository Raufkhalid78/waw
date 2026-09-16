"use client";

import { useState, useEffect, useCallback } from "react";
import { auditLogsApi, type AdminAuditLog } from "@/lib/api";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { ScrollText, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

export default function AuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await auditLogsApi.list({
        limit: PAGE_SIZE,
        offset,
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
      });
      setLogs(data?.logs || []);
      setTotal(data?.total || 0);
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [offset, actionFilter, resourceFilter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString("en-PK", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const hasDetails = (log: AdminAuditLog) =>
    (log.previous_state != null && Object.keys(log.previous_state as object).length > 0) ||
    (log.new_state != null && Object.keys(log.new_state as object).length > 0);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">
            {total} recorded admin actions — immutable history, newest first
          </p>
        </div>
        <button onClick={loadLogs} className="p-2 rounded-lg hover:bg-gray-100">
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setOffset(0); }}
          placeholder="Filter by action (e.g. KYC_APPROVED)"
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <input
          value={resourceFilter}
          onChange={(e) => { setResourceFilter(e.target.value); setOffset(0); }}
          placeholder="Filter by resource type (e.g. stores)"
          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {loadError && <ApiErrorBanner message={loadError} onRetry={loadLogs} />}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 && !loadError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No audit entries match the current filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {fmtTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-gray-800">{log.actor_role}</span>
                      <div className="text-gray-400 font-mono text-[10px]">
                        {log.actor_id ? `${log.actor_id.slice(0, 12)}…` : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <div className="font-medium text-gray-800">{log.target_resource_type}</div>
                      <div className="font-mono text-[10px] text-gray-400">
                        {log.target_resource_id || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">
                      {log.reason || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {hasDetails(log) ? (
                        <button
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900"
                          aria-expanded={expanded === log.id}
                        >
                          {expanded === log.id ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          State
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {expanded && (
          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
            <pre className="text-[10px] font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(
                logs.find((l) => l.id === expanded)
                  ? {
                      previous_state: logs.find((l) => l.id === expanded)!.previous_state,
                      new_state: logs.find((l) => l.id === expanded)!.new_state,
                    }
                  : {},
                null,
                2,
              )}
            </pre>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Page {currentPage} of {totalPages} ({total} total)
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
            disabled={offset === 0}
            className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 font-medium"
          >
            Prev
          </button>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-200 font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
