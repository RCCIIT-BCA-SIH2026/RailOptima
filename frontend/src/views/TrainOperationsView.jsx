import React, { useEffect, useState } from 'react';
import { TrainTrack, Activity, Compass, Clock, PackageCheck, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

export default function TrainOperationsView() {
  const [trains, setTrains] = useState([]);
  const [liveTrains, setLiveTrains] = useState([]);
  const [freightForecast, setFreightForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainData();
  }, []);

  const fetchTrainData = async () => {
    try {
      setLoading(true);
      const [tRes, liveRes, frtRes] = await Promise.all([
        apiClient.get('/trains?limit=30'),
        apiClient.get('/trains/live-tracking'),
        apiClient.get('/trains/freight-forecast?corridor=NDLS-AGC')
      ]);
      setTrains(tRes.data);
      setLiveTrains(liveRes.data);
      setFreightForecast(frtRes.data);
    } catch (err) {
      console.error("Failed to load train operations data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Train Operations & COA Timetable</span>
            <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              Control Office Application Feed
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time passenger and freight train occupancy, schedule compliance, and goods train projection.
          </p>
        </div>
      </div>

      {/* Freight Forecast Cards */}
      {freightForecast && (
        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PackageCheck className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">24-Hour Goods Train Operations Forecast</h3>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded">
              {freightForecast.projected_freight_rakes} Rakes Projected
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {Object.entries(freightForecast.rake_categories || {}).map(([cat, count]) => (
              <div key={cat} className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/50">
                <span className="text-[11px] text-slate-400 block truncate">{cat}</span>
                <span className="text-lg font-bold text-white font-mono mt-1 block">{count} Rakes</span>
              </div>
            ))}
          </div>
          
          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 pt-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Recommended Maintenance Slot: <strong>{freightForecast.recommended_freight_maintenance_window}</strong></span>
          </div>
        </div>
      )}

      {/* Live Train Tracking Feed */}
      <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Live Running Status on Monitored Sections</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live COA Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-900/50">
                <th className="p-3">Train No</th>
                <th className="p-3">Train Name</th>
                <th className="p-3">Current Section</th>
                <th className="p-3">Live Speed</th>
                <th className="p-3">Delay</th>
                <th className="p-3">Punctuality Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {liveTrains.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30">
                  <td className="p-3 font-mono font-bold text-white">{t.train_no}</td>
                  <td className="p-3 text-slate-200 font-medium">{t.train_name}</td>
                  <td className="p-3 font-mono text-blue-300">{t.current_section}</td>
                  <td className="p-3 font-mono text-slate-300">{t.current_speed_kmh} km/h</td>
                  <td className="p-3 font-mono">
                    {t.delay_minutes === 0 ? (
                      <span className="text-emerald-400 font-bold">Right Time (0m)</span>
                    ) : (
                      <span className="text-amber-400">+{t.delay_minutes} mins</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      t.punctuality_status === 'On-Time'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {t.punctuality_status}
                    </span>
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
