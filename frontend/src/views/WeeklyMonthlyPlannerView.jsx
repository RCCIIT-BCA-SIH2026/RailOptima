import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock, Layers, Filter } from 'lucide-react';
import apiClient from '../api/client';

export default function WeeklyMonthlyPlannerView() {
  const [activeMode, setActiveMode] = useState('weekly'); // 'weekly' | 'monthly'
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlannerData();
  }, [activeMode]);

  const fetchPlannerData = async () => {
    try {
      setLoading(true);
      if (activeMode === 'weekly') {
        const res = await apiClient.get('/blocks/weekly-view');
        setWeeklyData(res.data.timeline_items || []);
      } else {
        const res = await apiClient.get('/blocks/monthly-view');
        setMonthlyData(res.data.days || []);
      }
    } catch (err) {
      console.error("Failed to load planner data", err);
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
            <span>Maintenance Possession Planners</span>
            <span className="text-xs font-mono font-normal text-blue-400 bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded">
              Gantt Schedule & Monthly Heatmap
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing multi-day departmental possession allocations across trunk railway corridors.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-800 border border-slate-700 p-1 rounded-lg">
          <button
            onClick={() => setActiveMode('weekly')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeMode === 'weekly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Weekly Gantt Timeline
          </button>
          <button
            onClick={() => setActiveMode('monthly')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeMode === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Possession Density
          </button>
        </div>
      </div>

      {/* Weekly View */}
      {activeMode === 'weekly' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">7-Day Rolling Block Timeline</h3>
            <span className="text-xs text-slate-400 font-mono">Filter by Department</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-900/50">
                  <th className="p-3">Block Code</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Start Time</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {weeklyData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-700/30">
                    <td className="p-3 font-mono font-bold text-white">{item.block_code}</td>
                    <td className="p-3 font-mono text-blue-300">{item.section_code}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-200 border border-slate-700">
                        {item.department}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.block_type === 'Integrated' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {item.block_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {new Date(item.start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono text-slate-300">{item.duration_hours} hrs</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Approved' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly View */}
      {activeMode === 'monthly' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">30-Day Possession Density Grid</h3>
            <span className="text-xs text-slate-400 font-mono">Aggregated Corridor Load</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {monthlyData.map((d, idx) => (
              <div key={idx} className="bg-slate-900/70 border border-slate-700/60 p-3 rounded-lg flex flex-col justify-between">
                <div>
                  <div className="font-mono font-bold text-xs text-white">{d.date}</div>
                  <div className="mt-2 text-2xl font-black text-blue-400 font-mono">{d.total_blocks}</div>
                  <div className="text-[10px] text-slate-400">Total Blocks</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between text-[10px]">
                  <span className="text-emerald-400">{d.approved} Appr</span>
                  <span className="text-amber-400">{d.proposed} Prop</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
