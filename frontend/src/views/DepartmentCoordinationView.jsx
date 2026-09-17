import React, { useEffect, useState } from 'react';
import { Layers, CheckCircle2, Clock, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client';

export default function DepartmentCoordinationView() {
  const [synergy, setSynergy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSynergy();
  }, []);

  const fetchSynergy = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/analytics/department-synergy');
      setSynergy(res.data);
    } catch (err) {
      console.error("Synergy load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const coordinationExamples = [
    {
      corridor: "NDLS-AGC (UP Line)",
      section: "NDLS-TKD-UP",
      duration: "3.5 Hours",
      bundled: [
        { dept: "ENG (Civil)", task: "BCM Ballast Screening & Track Tamping at Km 14.2" },
        { dept: "SNT (Signal)", task: "Point Machine 220V Normal/Reverse Detection Overhaul" },
        { dept: "TRD (Traction)", task: "OHE Catenary Dropper Replacement & Cantilever Adjustment" }
      ],
      hoursSaved: "5.5 Hours",
      trafficGain: "Zero premier train stoppage; eliminates 2 separate daytime block requests"
    },
    {
      corridor: "AGC-VGLJ (DN Line)",
      section: "GWL-VGLJ-DN",
      duration: "3.0 Hours",
      bundled: [
        { dept: "ENG (Civil)", task: "Continuous Welded Rail (CWR) De-stressing & Thermite Weld Grinding" },
        { dept: "TRD (Traction)", task: "25kV Isolator Switch Contact Cleaning & Inspection" }
      ],
      hoursSaved: "3.0 Hours",
      trafficGain: "Avoided daytime freight corridor throttling"
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Multi-Department Coordination Matrix</span>
            <span className="text-xs font-mono font-normal text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded">
              Integrated Shadow Blocking
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Breaking down organizational silos: Co-locating Civil Engineering, S&T, and Electrical/OHE works into consolidated possessions.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow">
          <span className="text-xs text-slate-400">Integrated Shadow Blocks</span>
          <div className="mt-2 text-3xl font-extrabold text-purple-400 font-mono">
            {synergy?.integrated_shadow_blocks}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">of {synergy?.total_blocks} total system blocks</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow">
          <span className="text-xs text-slate-400">Synergy Ratio</span>
          <div className="mt-2 text-3xl font-extrabold text-emerald-400 font-mono">
            {synergy?.synergy_percentage}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Coordinated possession efficiency</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow">
          <span className="text-xs text-slate-400">Net Track Possession Saved</span>
          <div className="mt-2 text-3xl font-extrabold text-blue-400 font-mono">
            {synergy?.estimated_hours_saved} Hours
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Corridor downtime avoided</p>
        </div>
      </div>

      {/* Coordinated Shadow Blocks Showcase */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white">Active Integrated Shadow Blocks</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {coordinationExamples.map((ex, idx) => (
            <div key={idx} className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">{ex.section}</h4>
                  <span className="text-xs text-slate-400">{ex.corridor}</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-xs font-bold">
                  Duration: {ex.duration}
                </span>
              </div>

              {/* Bundled Tasks */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">Co-located Departmental Works:</span>
                {ex.bundled.map((b, bIdx) => (
                  <div key={bIdx} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50 flex items-start space-x-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-900 text-blue-300 flex-shrink-0">
                      {b.dept}
                    </span>
                    <span className="text-slate-300">{b.task}</span>
                  </div>
                ))}
              </div>

              {/* Impact Gain */}
              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">Hours Eliminated: <strong className="text-emerald-400 font-mono">{ex.hoursSaved}</strong></span>
                <span className="text-[11px] text-slate-400 italic">{ex.trafficGain}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
