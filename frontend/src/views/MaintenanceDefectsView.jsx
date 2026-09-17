import React, { useEffect, useState } from 'react';
import { Wrench, ShieldAlert, Sparkles, Filter, RefreshCw, AlertTriangle } from 'lucide-react';
import apiClient from '../api/client';

export default function MaintenanceDefectsView() {
  const [defects, setDefects] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [recalcMessage, setRecalcMessage] = useState(null);

  useEffect(() => {
    fetchDefects();
  }, [selectedDept, selectedSeverity]);

  const fetchDefects = async () => {
    try {
      setLoading(true);
      let url = `/defects?limit=50`;
      if (selectedDept) url += `&department=${selectedDept}`;
      if (selectedSeverity) url += `&severity=${selectedSeverity}`;
      const res = await apiClient.get(url);
      setDefects(res.data);
    } catch (err) {
      console.error("Failed to load defects", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculatePriority = async () => {
    try {
      setRecalculating(true);
      const res = await apiClient.post('/defects/recalculate-priority');
      setRecalcMessage(res.data.message);
      await fetchDefects();
    } catch (err) {
      console.error("Recalculate failed", err);
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Maintenance & Defect Management</span>
            <span className="text-xs font-mono font-normal text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
              TMS • SMMS • TDMS Feeds
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time track, signalling, and traction defect backlog with AI-ranked criticality scores.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleRecalculatePriority}
          disabled={recalculating}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-blue-500/20 transition"
        >
          {recalculating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Evaluating Risk Models...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span>Recalculate AI Priority</span>
            </>
          )}
        </button>
      </div>

      {recalcMessage && (
        <div className="p-3 bg-blue-950/70 border border-blue-700 text-blue-300 text-xs rounded-lg flex items-center justify-between">
          <span>{recalcMessage}</span>
          <button onClick={() => setRecalcMessage(null)} className="text-blue-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-800/80 border border-slate-700/60 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-300">Filter By:</span>
          
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="">All Departments</option>
            <option value="ENG">ENG (Permanent Way)</option>
            <option value="SNT">SNT (Signal & Telecom)</option>
            <option value="TRD">TRD (Traction / OHE)</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
          </select>
        </div>

        <div className="text-slate-400">
          Showing <strong>{defects.length}</strong> prioritized defect items
        </div>
      </div>

      {/* Defects Table */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-900/50">
                <th className="p-3.5">AI Priority</th>
                <th className="p-3.5">Defect Code</th>
                <th className="p-3.5">System Source</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5">Section</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Speed Restriction</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading defect backlog...
                  </td>
                </tr>
              ) : defects.map((d) => {
                const score = d.calculated_priority_score;
                const isEmergency = score >= 85;
                const isUrgent = score >= 65 && score < 85;

                return (
                  <tr key={d.id} className="hover:bg-slate-700/30">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          isEmergency
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : isUrgent
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}>
                          {score.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isEmergency ? 'P0' : isUrgent ? 'P1' : 'P2'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300 font-bold">{d.defect_code}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700">
                        {d.reported_by_system}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-white max-w-xs truncate">{d.defect_type}</td>
                    <td className="p-3.5 font-mono text-slate-300">{d.section_code}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        d.severity === 'Critical'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : d.severity === 'Major'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-slate-700 text-slate-300'
                      }`}>
                        {d.severity}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono">
                      {d.speed_restriction_imposed > 0 ? (
                        <span className="text-amber-400 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{d.speed_restriction_imposed} km/h</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 font-medium">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
