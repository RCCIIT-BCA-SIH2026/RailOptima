import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  TrendingDown, 
  ShieldCheck, 
  ArrowRight,
  HelpCircle,
  Zap
} from 'lucide-react';
import apiClient from '../api/client';
import AIExplanationModal from '../components/AIExplanationModal';

export default function OptimizationStudioView({ onNavigate }) {
  const [horizon, setHorizon] = useState(24);
  const [strategyCode, setStrategyCode] = useState("BALANCED");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState(1);
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(null);
  const [explainingBlockId, setExplainingBlockId] = useState(null);

  useEffect(() => {
    fetchLatestAlternatives();
  }, []);

  const fetchLatestAlternatives = async () => {
    try {
      const res = await apiClient.get('/optimization/alternatives');
      setAlternatives(res.data.alternatives || []);
    } catch (err) {
      console.error("Failed to load alternatives", err);
    }
  };

  const handleRunOptimization = async () => {
    try {
      setIsOptimizing(true);
      setSubmittedSuccess(null);
      const res = await apiClient.post('/optimization/run', {
        horizon_hours: horizon,
        strategy_code: strategyCode
      });
      setOptimizationResult(res.data);
      setAlternatives(res.data.alternatives || []);
      setSelectedAlternativeId(1);
    } catch (err) {
      console.error("Optimization failed", err);
      alert("Optimization failed. Please ensure the backend is running.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAdoptAlternative = async (stratId) => {
    try {
      setSubmittingPlan(true);
      const res = await apiClient.post(`/optimization/select-alternative/${stratId}`);
      setSubmittedSuccess(res.data);
    } catch (err) {
      console.error("Plan adoption failed", err);
    } finally {
      setSubmittingPlan(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Pipeline Header */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">AI Block Optimization Studio</h2>
                <span className="text-xs bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded font-mono">
                  Google OR-Tools CP-SAT
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Multi-objective constraint solver balancing train punctuality, multi-department shadow blocking, and critical defect clearance.
              </p>
            </div>
          </div>

          {/* Trigger Button & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400">Policy:</span>
              <select
                value={strategyCode}
                onChange={(e) => setStrategyCode(e.target.value)}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                <option value="BALANCED" className="bg-slate-900">Balanced Strategy</option>
                <option value="SAFETY_FIRST" className="bg-slate-900">Safety First (High Buffer)</option>
                <option value="THROUGHPUT_FIRST" className="bg-slate-900">Throughput First (Zero Delay)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Horizon:</span>
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                <option value={24} className="bg-slate-900">24 Hours</option>
                <option value={48} className="bg-slate-900">48 Hours</option>
                <option value={72} className="bg-slate-900">72 Hours</option>
                <option value={168} className="bg-slate-900">7 Days (Weekly)</option>
              </select>
            </div>

            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Solving Constraints...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Automatic Block Optimizer</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* User Flow Stepper Indicator */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 hidden lg:grid grid-cols-6 gap-2 text-center text-[11px]">
          <div className="p-2 rounded bg-slate-900/60 border border-slate-700/50 text-slate-300">
            <div className="font-semibold text-blue-400">1. Defect Signals</div>
            <div className="text-[10px] text-slate-500">TMS / SMMS / TDMS</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-700/50 text-slate-300">
            <div className="font-semibold text-blue-400">2. AI Prioritize</div>
            <div className="text-[10px] text-slate-500">Risk Criticality (0-100)</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-700/50 text-slate-300">
            <div className="font-semibold text-blue-400">3. Conflict Audit</div>
            <div className="text-[10px] text-slate-500">COA Train Timetable</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-700/50 text-slate-300">
            <div className="font-semibold text-blue-400">4. CP-SAT Solve</div>
            <div className="text-[10px] text-slate-500">Shadow Mega-Blocks</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-700/50 text-slate-300">
            <div className="font-semibold text-blue-400">5. 3 Alternatives</div>
            <div className="text-[10px] text-slate-500">Trade-Off Analysis</div>
          </div>
          <div className="p-2 rounded bg-slate-900/60 border border-slate-700/50 text-slate-300">
            <div className="font-semibold text-emerald-400">6. DRM Approval</div>
            <div className="text-[10px] text-slate-500">Digital Sign-Off</div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {submittedSuccess && (
        <div className="bg-emerald-950/70 border border-emerald-700 p-4 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Plan #{submittedSuccess.plan_code} Formulated</h4>
              <p className="text-xs text-emerald-200 mt-0.5">{submittedSuccess.message}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow"
          >
            Go to Approval Queue &rarr;
          </button>
        </div>
      )}

      {/* 3 Strategy Alternatives Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Generated Planning Alternatives</span>
            <span className="text-xs font-normal text-slate-400">({alternatives.length} Strategies Generated)</span>
          </h3>
          <span className="text-xs text-slate-400">Select an alternative to view details & submit for review</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {alternatives.map((alt) => {
            const isSelected = selectedAlternativeId === alt.strategy_id;
            const borderColor = alt.strategy_id === 1 ? 'border-blue-500/70' : (alt.strategy_id === 2 ? 'border-amber-500/70' : 'border-emerald-500/70');
            const bgHeader = alt.strategy_id === 1 ? 'bg-blue-950/40' : (alt.strategy_id === 2 ? 'bg-amber-950/40' : 'bg-emerald-950/40');

            return (
              <div
                key={alt.strategy_id}
                onClick={() => setSelectedAlternativeId(alt.strategy_id)}
                className={`bg-slate-800/80 border-2 rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected ? `${borderColor} shadow-2xl scale-[1.01]` : 'border-slate-700/60 hover:border-slate-600'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className={`p-4 border-b border-slate-700/60 ${bgHeader}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        Alternative #{alt.strategy_id}
                      </span>
                      {alt.is_recommended && (
                        <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white text-sm">{alt.title}</h4>
                    <p className="text-xs text-slate-300 mt-1">{alt.tagline}</p>
                  </div>

                  {/* Metrics */}
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                        <span className="text-[11px] text-slate-400">Total Delay:</span>
                        <div className="font-bold text-white font-mono mt-0.5">{alt.total_delay_minutes} mins</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                        <span className="text-[11px] text-slate-400">Defects Cleared:</span>
                        <div className="font-bold text-emerald-400 font-mono mt-0.5">{alt.defects_cleared} tasks</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                        <span className="text-[11px] text-slate-400">Passenger Delay:</span>
                        <div className="font-bold text-blue-400 font-mono mt-0.5">{alt.passenger_delay_minutes} mins</div>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded border border-slate-700/50">
                        <span className="text-[11px] text-slate-400">Synergy Score:</span>
                        <div className="font-bold text-purple-400 font-mono mt-0.5">{alt.multi_dept_synergy_score}%</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded border border-slate-700/40 leading-relaxed">
                      {alt.ai_rationale}
                    </div>
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="p-4 pt-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdoptAlternative(alt.strategy_id);
                    }}
                    disabled={submittingPlan}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
                      isSelected
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    <span>Adopt & Submit Strategy #{alt.strategy_id}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Alternative Blocks Preview */}
      {selectedAlternativeId && alternatives.find(a => a.strategy_id === selectedAlternativeId) && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-sm">
                Candidate Blocks for Strategy #{selectedAlternativeId}: {alternatives.find(a => a.strategy_id === selectedAlternativeId)?.title}
              </h4>
              <p className="text-xs text-slate-400">Click 'Explain AI Rationale' on any block to inspect the deep multi-objective justification</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-900/50">
                  <th className="p-3">Block Code</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Window (Start &rarr; End)</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Departments Bundled</th>
                  <th className="p-3">Projected Delay</th>
                  <th className="p-3 text-right">AI Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {(alternatives.find(a => a.strategy_id === selectedAlternativeId)?.blocks || []).map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="p-3 font-mono font-bold text-white">{b.block_code}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.is_shadow_block ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {b.block_type}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr; {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono text-slate-300">{b.duration_minutes}m</td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1">
                        {(b.all_departments || [b.lead_department]).map(d => (
                          <span key={d} className="bg-slate-700 text-slate-200 text-[10px] px-1.5 py-0.5 rounded font-mono">
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {b.passenger_delay_minutes === 0 ? (
                        <span className="text-emerald-400 font-semibold">0m (Freight: {b.freight_delay_minutes}m)</span>
                      ) : (
                        <span className="text-amber-400">{b.passenger_delay_minutes}m</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setExplainingBlockId(101 + idx)}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-blue-300 rounded text-[11px] font-medium transition"
                      >
                        Explain Rationale
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Explanation Modal */}
      {explainingBlockId && (
        <AIExplanationModal
          blockId={explainingBlockId}
          onClose={() => setExplainingBlockId(null)}
        />
      )}
    </div>
  );
}
