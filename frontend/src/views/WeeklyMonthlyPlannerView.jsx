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
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <span>Maintenance Possession Planners</span>
            <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
              Gantt Schedule & Monthly Heatmap
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Visualizing multi-day departmental possession allocations across trunk railway corridors.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-white/90 border border-slate-200 p-1 rounded-xl shadow-xs">
          <button
            onClick={() => setActiveMode('weekly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMode === 'weekly' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly Gantt Timeline
          </button>
          <button
            onClick={() => setActiveMode('monthly')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMode === 'monthly' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Possession Density
          </button>
        </div>
      </div>

      {/* Weekly View */}
      {activeMode === 'weekly' && (
        <div className="glass-card border border-slate-200/80 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">7-Day Rolling Block Timeline</h3>
            <span className="text-xs text-slate-500 font-medium">Departmental Block Possession Allocations</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-700 font-semibold bg-slate-100/90">
                  <th className="p-3">Block Code</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Start Time</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white/70">
                {weeklyData.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{item.block_code}</td>
                    <td className="p-3 font-mono text-emerald-800 font-semibold">{item.section_code}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {item.department}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.block_type === 'Integrated' ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}>
                        {item.block_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-700">
                      {new Date(item.start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono text-slate-700">{item.duration_hours} hrs</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
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
        <div className="glass-card border border-slate-200/80 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">30-Day Possession Density Grid</h3>
            <span className="text-xs text-slate-500 font-medium">Aggregated Corridor Load</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {monthlyData.map((d, idx) => (
              <div key={idx} className="bg-white/80 border border-slate-200/80 p-3 rounded-xl shadow-xs flex flex-col justify-between">
                <div>
                  <div className="font-mono font-bold text-xs text-slate-800">{d.date}</div>
                  <div className="mt-2 text-2xl font-black text-emerald-700 font-mono">{d.total_blocks}</div>
                  <div className="text-[10px] text-slate-500">Total Blocks</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex justify-between text-[10px] font-semibold">
                  <span className="text-emerald-700">{d.approved} Appr</span>
                  <span className="text-amber-700">{d.proposed} Prop</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
