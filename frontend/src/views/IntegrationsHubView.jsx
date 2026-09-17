import React, { useEffect, useState } from 'react';
import { Network, RefreshCw, CheckCircle2, AlertCircle, Database, ArrowDownToLine } from 'lucide-react';
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
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Railway Systems Integration Hub</span>
            <span className="text-xs font-mono font-normal text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
              Mock APIs & Data Ingestion
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulated enterprise connectivity to Indian Railways core operational systems (TMS, SMMS, TDMS, COA).
          </p>
        </div>

        <button
          onClick={fetchIntegrationsStatus}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Feeds</span>
        </button>
      </div>

      {syncFeedback && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Ingested <strong>{syncFeedback.records_ingested}</strong> simulated records from <strong>{syncFeedback.system}</strong>.
            </span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Systems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {(statusData?.systems || []).map((sys) => {
          const isSyncing = syncingSystem === sys.system;
          return (
            <div key={sys.system} className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-blue-950 text-blue-400 border border-blue-800 rounded-lg font-mono font-bold text-sm">
                      {sys.system}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{sys.system} Service Gateway</h4>
                      <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{sys.status}</span>
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {sys.latency_ms} ms latency
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  {systemDescriptions[sys.system]}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400">
                  Mode: {sys.data_mode}
                </span>
                <button
                  onClick={() => handleSync(sys.system)}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow transition flex items-center space-x-1.5"
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
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-sm">Recent External Systems Ingestion History</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-900/50">
                <th className="p-3">System</th>
                <th className="p-3">Sync Type</th>
                <th className="p-3">Records Ingested</th>
                <th className="p-3">Status</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {(statusData?.recent_sync_logs || []).map((l) => (
                <tr key={l.id} className="hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-bold text-blue-300">{l.system_name}</td>
                  <td className="p-3 text-slate-300">{l.sync_type}</td>
                  <td className="p-3 font-mono text-slate-200">{l.records_synced} items</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">
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
