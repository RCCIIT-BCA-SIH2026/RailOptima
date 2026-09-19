import React, { useEffect, useState } from 'react';
import { Network, RefreshCw, CheckCircle2, AlertCircle, Database, ArrowDownToLine, Zap } from 'lucide-react';
import apiClient from '../api/client';

export default function IntegrationsHubView() {
  const [statusData, setStatusData] = useState(null);
  const [syncingSystem, setSyncingSystem] = useState(null);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrationsStatus();
  }, []);

  const fetchIntegrationsStatus = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/integrations/status');
      setStatusData(res.data);
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (sysName) => {
    try {
      setSyncingSystem(sysName);
      const res = await apiClient.post(`/integrations/sync/${sysName}`);
      setSyncFeedback(res.data);
      await fetchIntegrationsStatus();
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setSyncingSystem(null);
    }
  };

  const systemDescriptions = {
    "TMS": "Track Management System: Ingests USFD ultrasonic flaw logs, rail weld defects, and track geometry index records.",
    "SMMS": "Signalling Maintenance System: Ingests point machine operating time, digital axle counter attenuation, and relay telemetry.",
    "TDMS": "Traction Distribution Management: Ingests 25kV OHE catenary wear, contact wire height/stagger, and substation circuit breaker telemetry.",
    "COA": "Control Office Application: Ingests real-time train timetable, line section clearance, and 24h goods train flow forecasts."
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Railway Systems Integration Hub</span>
            <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
              Mock APIs & Ingestion Telemetry
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Simulated enterprise connectivity to Indian Railways core operational systems (TMS, SMMS, TDMS, COA).
          </p>
        </div>

        <button
          onClick={fetchIntegrationsStatus}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white/90 hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-800 rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feeds</span>
        </button>
      </div>

      {syncFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Ingested <strong>{syncFeedback.records_ingested || syncFeedback.records_normalized_and_ingested}</strong> simulated records from <strong>{syncFeedback.system}</strong>.
            </span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold">&times;</button>
        </div>
      )}

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(statusData?.systems || []).map((sys) => {
          const isSyncing = syncingSystem === sys.system;
          return (
            <div key={sys.system} className="glass-card border border-slate-200/80 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-mono font-bold text-sm">
                      {sys.system}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{sys.system} Service Gateway</h4>
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{sys.status}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {sys.latency_ms} ms latency
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {systemDescriptions[sys.system]}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  Mode: {sys.data_mode}
                </span>
                <button
                  onClick={() => handleSync(sys.system)}
                  disabled={isSyncing}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Trigger Sync</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Sync Audit Log */}
      <div className="glass-card border border-slate-200/80 rounded-xl p-5 shadow-xl space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Recent External Systems Ingestion History</h3>

        <div className="overflow-x-auto rounded-lg border border-slate-200/80">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-700 font-semibold bg-slate-100/90">
                <th className="p-3">System</th>
                <th className="p-3">Sync Type</th>
                <th className="p-3">Records Ingested</th>
                <th className="p-3">Status</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white/70">
              {(statusData?.recent_sync_logs || []).map((l) => (
                <tr key={l.id} className="hover:bg-emerald-50/40 transition">
                  <td className="p-3 font-mono font-bold text-emerald-800">{l.system_name}</td>
                  <td className="p-3 text-slate-700">{l.sync_type}</td>
                  <td className="p-3 font-mono text-slate-900 font-semibold">{l.records_synced} items</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                      {l.status}
                    </span>
                  </td>
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
