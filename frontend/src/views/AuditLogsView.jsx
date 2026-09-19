import React, { useEffect, useState } from 'react';
import { History, Download, ShieldCheck, Search, ShieldAlert } from 'lucide-react';
import apiClient from '../api/client';

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      const res = await apiClient.get('/audit?limit=100');
      setLogs(res.data.logs || []);
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        setAccessDenied(true);
      } else {
        console.error("Failed to load audit logs", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!logs.length) return;
    const headers = ["ID", "User", "Action", "Entity", "Entity_ID", "Timestamp"];
    const rows = logs.map(l => [
      l.id,
      l.username,
      l.action,
      l.entity_type || "",
      l.entity_id || "",
      l.timestamp
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `IR_Block_Planner_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.username.toLowerCase().includes(search.toLowerCase()) ||
    (l.entity_type && l.entity_type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Audit Trail & System Compliance</span>
            <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
              Immutable Operations Log
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Complete cryptographic audit trail of all optimizer runs, officer approvals, and system state transitions.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-4 py-2 bg-white/90 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {accessDenied && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-amber-900">Restricted Access: Role-Based Authorization Required</div>
            <div className="mt-1 text-slate-600">
              Only <strong>DRM</strong>, <strong>Senior Divisional Officers</strong> (Sr. DEN, Sr. DSTE, Sr. DEE, Sr. DOM), or <strong>System Admin</strong> have permission to inspect the statutory compliance audit logs.
            </div>
            <div className="mt-2 text-emerald-700 font-mono text-[11px] font-semibold">
              Tip: Switch to <strong>DRM</strong> or <strong>Admin</strong> in the top role switcher to inspect the full audit trail.
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-card border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by action, user, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/90 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="text-slate-600 font-medium">
          Showing <strong>{filteredLogs.length}</strong> logged system events
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border border-slate-200/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 font-semibold bg-slate-100/90">
                <th className="p-3">Log ID</th>
                <th className="p-3">User</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Entity ID</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filteredLogs.map((l) => (
                <tr key={l.id} className="hover:bg-emerald-50/40 transition">
                  <td className="p-3 font-mono text-slate-500">#{l.id}</td>
                  <td className="p-3 font-semibold text-slate-900">{l.username}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700">{l.entity_type || "SYSTEM"}</td>
                  <td className="p-3 font-mono text-slate-500">{l.entity_id || "-"}</td>
                  <td className="p-3 font-mono text-slate-500">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
