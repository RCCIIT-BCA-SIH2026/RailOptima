import React, { useEffect, useState } from 'react';
import { 
  Layers, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Filter, 
  Sparkles, 
  RefreshCw,
  Scale,
  Activity,
  Check
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function DepartmentCoordinationView() {
  const [synergy, setSynergy] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [auditFilter, setAuditFilter] = useState('ALL'); // 'ALL' | 'INFLATED' | 'GENUINE'
  const [deptFilter, setDeptFilter] = useState('ALL'); // 'ALL' | 'ENG' | 'SNT' | 'TRD'
  const [loading, setLoading] = useState(true);

  // Claim Test Sandbox State
  const [simForm, setSimForm] = useState({
    task_code: 'SIM-TASK-808',
    department_code: 'SNT',
    claimed_criticality: 'Emergency',
    section_name: 'NDLS-TKD-UP',
    risk_30d_pct: 22.5,
    has_speed_restriction: false,
    is_overdue: false
  });
  const [simResult, setSimResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [synRes, auditRes] = await Promise.all([
        apiClient.get('/analytics/department-synergy'),
        apiClient.get('/ai/anti-gaming/audit').catch(() => ({ data: null }))
      ]);
      setSynergy(synRes.data);
      setAuditData(auditRes.data);
    } catch (err) {
      console.error("Data load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateClaim = async (e) => {
    if (e) e.preventDefault();
    try {
      setEvaluating(true);
      const res = await apiClient.post('/ai/anti-gaming/evaluate', simForm);
      setSimResult(res.data);
    } catch (err) {
      console.error("Evaluation failed", err);
    } finally {
      setEvaluating(false);
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
    },
    {
      corridor: "GZB-CNB (UP Line)",
      section: "ALJN-TDL-UP",
      duration: "4.0 Hours",
      bundled: [
        { dept: "ENG (Civil)", task: "USFD Ultrasonic Flaw Detection & Weld Replacement" },
        { dept: "TRD (Traction)", task: "OHE Neutral Section Insulator Testing" },
        { dept: "SNT (Signal)", task: "Track Circuit Tuning Unit (TUT) Impedance Calibration" }
      ],
      hoursSaved: "4.5 Hours",
      trafficGain: "Preserves Superfast Express path schedule on Kanpur Trunk"
    }
  ];

  const filteredAuditedTasks = (auditData?.audited_tasks || []).filter(task => {
    if (auditFilter === 'INFLATED' && !task.is_inflated) return false;
    if (auditFilter === 'GENUINE' && task.is_inflated) return false;
    if (deptFilter !== 'ALL' && task.department_code !== deptFilter) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Multi-Department Coordination & Anti-Gaming Audit</span>
            <span className="text-xs font-mono font-normal text-purple-400 bg-purple-950/60 border border-purple-800/60 px-2 py-0.5 rounded">
              Zero Silo Operation
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Breaking down organizational silos: Bundling Civil, S&T, and Electrical works while cross-validating claims against objective IoT telemetry.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          className="text-xs text-purple-300 border-purple-800 hover:bg-purple-950/60 flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Integrated Shadow Blocks</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-purple-400 font-mono">
            {synergy?.integrated_shadow_blocks || 14}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">of {synergy?.total_blocks || 38} total system blocks</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Synergy Efficiency</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-400 font-mono">
            {synergy?.synergy_percentage || 42.5}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Co-located multi-dept possession</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Possession Hours Saved</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-blue-400 font-mono">
            {synergy?.estimated_hours_saved || 28.5} Hours
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Avoided track outage time</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Anti-Gaming Integrity</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-400 font-mono">
            {auditData?.compliance_rate_pct || 47.5}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{auditData?.inflated_claims_detected || 0} claims recalibrated</p>
        </div>
      </div>

      {/* Interactive Anti-Gaming Audit Sandbox & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-Time Claim Evaluator */}
        <div className="bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-white">
            <Scale className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold">Audit Simulator (Anti-Gaming Test)</h3>
          </div>
          <p className="text-xs text-slate-400">
            Cross-examine department block criticality against 30-day failure risk, speed restrictions, and SLA timers.
          </p>

          <form onSubmit={handleEvaluateClaim} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Department</label>
              <select
                value={simForm.department_code}
                onChange={(e) => setSimForm({ ...simForm, department_code: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="SNT">S&T (Signal & Telecommunication)</option>
                <option value="ENG">ENG (Civil / Track)</option>
                <option value="TRD">TRD (Electrical / Traction)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Claimed Criticality Level</label>
              <select
                value={simForm.claimed_criticality}
                onChange={(e) => setSimForm({ ...simForm, claimed_criticality: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="Emergency">P0 - Emergency (Level 5)</option>
                <option value="Critical">Critical (Level 5)</option>
                <option value="Urgent">P1 - Urgent (Level 4)</option>
                <option value="Important">P2 - Important (Level 3)</option>
                <option value="Routine">P3 - Routine (Level 2)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Objective 30-Day Failure Risk (%): <span className="font-mono text-blue-400">{simForm.risk_30d_pct}%</span>
              </label>
              <input
                type="range"
                min="5"
                max="99"
                value={simForm.risk_30d_pct}
                onChange={(e) => setSimForm({ ...simForm, risk_30d_pct: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simForm.has_speed_restriction}
                  onChange={(e) => setSimForm({ ...simForm, has_speed_restriction: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Active Speed Restriction (TSR) Imposed</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simForm.is_overdue}
                  onChange={(e) => setSimForm({ ...simForm, is_overdue: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span>Maintenance Interval Overdue (&gt; SLA)</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={evaluating}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow transition text-xs mt-2"
            >
              {evaluating ? 'Evaluating Sensors...' : 'Verify Claim Against Sensors'}
            </button>
          </form>

          {/* Result Box */}
          {simResult && (
            <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              simResult.is_inflated 
                ? 'bg-amber-950/60 border-amber-700/80 text-amber-200' 
                : 'bg-emerald-950/60 border-emerald-700/80 text-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center space-x-1.5">
                  {simResult.is_inflated ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                  <span>{simResult.is_inflated ? 'FLAGGED: INFLATED CLAIM' : 'CLAIM VERIFIED GENUINE'}</span>
                </span>
                <span className="font-mono font-bold text-white">Score: {simResult.verified_priority_score}/100</span>
              </div>
              <div className="text-[11px] leading-relaxed">
                {simResult.audit_rationale}
              </div>
              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-mono">
                <span>Evidence: {simResult.evidence_score}/5.0</span>
                <span>Claimed: Level {simResult.claimed_level}/5</span>
              </div>
            </div>
          )}
        </div>

        {/* Audit Transparency Table */}
        <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 p-5 rounded-xl shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-purple-400" />
                  <span>Division Maintenance Task Integrity Audit</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-evaluated claim levels vs sensor evidence across all department requests.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2 text-xs">
                <select
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="ALL">All Claims ({auditData?.total_tasks_audited || 0})</option>
                  <option value="INFLATED">Flagged Inflated ({auditData?.inflated_claims_detected || 0})</option>
                  <option value="GENUINE">Verified Genuine</option>
                </select>

                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                >
                  <option value="ALL">All Depts</option>
                  <option value="ENG">ENG</option>
                  <option value="SNT">S&T</option>
                  <option value="TRD">TRD</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-semibold bg-slate-900/40">
                    <th className="p-2.5">Task Code</th>
                    <th className="p-2.5">Dept</th>
                    <th className="p-2.5">Claimed Level</th>
                    <th className="p-2.5">IoT Evidence</th>
                    <th className="p-2.5">Audit Status</th>
                    <th className="p-2.5 font-mono text-right">Fair Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredAuditedTasks.slice(0, 6).map((task, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30">
                      <td className="p-2.5 font-mono font-bold text-white">
                        <div>{task.task_code}</div>
                        <div className="text-[10px] text-slate-400 font-sans font-normal truncate max-w-[140px]">{task.title || task.section_code}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="font-mono text-[10px] font-bold bg-slate-900 text-blue-300 px-1.5 py-0.5 rounded border border-slate-700">
                          {task.department_code}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">
                        <span className="font-semibold">{task.claimed_criticality}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-1">({task.claimed_level}/5)</span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-300">
                        <span className="font-bold text-white">{task.evidence_score}</span> / 5.0
                      </td>
                      <td className="p-2.5">
                        {task.is_inflated ? (
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold">
                            FLAGGED INFLATED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                            VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-purple-300">
                        {task.verified_priority_score} / 100
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span>Showing top {Math.min(6, filteredAuditedTasks.length)} of {filteredAuditedTasks.length} filtered records</span>
            <span className="text-purple-400 font-semibold">Automatic Multi-Department Fair Share Protocol Active</span>
          </div>
        </div>
      </div>

      {/* Coordinated Shadow Blocks Showcase */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Active Integrated Shadow Block Possessions</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {coordinationExamples.map((ex, idx) => (
            <div key={idx} className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                  <div>
                    <h4 className="font-bold text-white text-sm">{ex.section}</h4>
                    <span className="text-xs text-slate-400">{ex.corridor}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono text-xs font-bold">
                    {ex.duration}
                  </span>
                </div>

                {/* Bundled Tasks */}
                <div className="space-y-2 mt-3">
                  <span className="text-xs font-semibold text-slate-400">Co-located Departmental Works:</span>
                  {ex.bundled.map((b, bIdx) => (
                    <div key={bIdx} className="bg-slate-900/60 p-2 rounded-lg border border-slate-700/50 flex items-start space-x-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-900 text-blue-300 flex-shrink-0">
                        {b.dept}
                      </span>
                      <span className="text-slate-300 leading-snug">{b.task}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Impact Gain */}
              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-400">Hours Eliminated: <strong className="text-emerald-400 font-mono">{ex.hoursSaved}</strong></span>
                <span className="text-[10px] text-slate-400 italic text-right max-w-[150px]">{ex.trafficGain}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
