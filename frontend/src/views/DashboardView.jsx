import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Train, 
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Server,
  Database,
  Check,
  Zap,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function DashboardView() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [punctualityData, setPunctualityData] = useState([]);
  const [synergyData, setSynergyData] = useState(null);
  const [integrationTelemetry, setIntegrationTelemetry] = useState(null);
  const [survivalSections, setSurvivalSections] = useState([]);
  const [antiGamingAudit, setAntiGamingAudit] = useState(null);
  const [syncingSystem, setSyncingSystem] = useState(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, punctRes, synRes, intRes, survRes, auditRes] = await Promise.all([
        apiClient.get('/analytics/dashboard-summary'),
        apiClient.get('/analytics/corridor-punctuality'),
        apiClient.get('/analytics/department-synergy'),
        apiClient.get('/integrations/status'),
        apiClient.get('/ai/survival/sections').catch(() => ({ data: [] })),
        apiClient.get('/ai/anti-gaming/audit').catch(() => ({ data: null }))
      ]);
      setSummary(sumRes.data);
      setPunctualityData(punctRes.data);
      setSynergyData(synRes.data);
      setIntegrationTelemetry(intRes.data);
      setSurvivalSections(survRes.data || []);
      setAntiGamingAudit(auditRes.data);
    } catch (err) {
      console.error("Dashboard data load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSystem = async (systemName) => {
    try {
      setSyncingSystem(systemName);
      const res = await apiClient.post(`/integrations/sync/${systemName}`);
      setSyncSuccessMsg(`Normalized & ingested ${res.data.records_ingested || res.data.records_normalized_and_ingested} records from ${systemName}`);
      
      const [sumRes, intRes] = await Promise.all([
        apiClient.get('/analytics/dashboard-summary'),
        apiClient.get('/integrations/status')
      ]);
      setSummary(sumRes.data);
      setIntegrationTelemetry(intRes.data);

      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch (err) {
      console.error(`Failed to sync ${systemName}`, err);
    } finally {
      setSyncingSystem(null);
    }
  };

  const SYSTEM_META = {
    TMS: { name: "TMS", fullName: "Track Management System", dept: "Civil / P-Way", border: "border-amber-200", badgeBg: "bg-amber-50 text-amber-800" },
    SMMS: { name: "SMMS", fullName: "Signalling Maint. Mgmt.", dept: "Signal & Telecom (S&T)", border: "border-blue-200", badgeBg: "bg-blue-50 text-blue-800" },
    TDMS: { name: "TDMS", fullName: "Traction Dist. Mgmt.", dept: "Electrical / TRD", border: "border-yellow-200", badgeBg: "bg-yellow-50 text-yellow-800" },
    COA: { name: "COA", fullName: "Control Office Application", dept: "Operating / Traffic", border: "border-emerald-200", badgeBg: "bg-emerald-50 text-emerald-800" }
  };

  const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Loading operations telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Welcome & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-blue-600">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
              Executive Telemetry
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
              SIMULATED DEMO DATA
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Indian Railways Operations & Block Planning Dashboard
          </h2>
          <p className="text-xs text-blue-100 max-w-2xl">
            {summary?.active_defects} defects pending analysis • {summary?.scheduled_blocks_today} blocks scheduled today • {summary?.active_speed_restrictions_count} active speed restrictions imposed on trunk corridors.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Button
            variant="ai"
            size="lg"
            onClick={() => navigate('/ai-planning')}
            className="flex items-center space-x-2 shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch AI Optimizer</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Asset Availability Index</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-slate-900">{summary?.asset_availability_pct}%</span>
              <span className="text-xs text-emerald-600 font-bold">+1.4% MoM</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${summary?.asset_availability_pct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">Target operational availability: &ge; 90%</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>System Punctuality</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-blue-700">{summary?.system_punctuality_pct}%</span>
              <span className="text-xs text-blue-600 font-bold">Trunk Corridors</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${summary?.system_punctuality_pct}%` }}></div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">High Density Networks (HDN-1 & HDN-2)</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Critical Defect Backlog</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-rose-600">{summary?.critical_defects}</span>
              <span className="text-xs text-slate-500 font-medium">of {summary?.active_defects} total</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-3 text-xs text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{summary?.active_speed_restrictions_count} speed restrictions active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Pending DRM Approvals</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-amber-600">{summary?.pending_approvals}</span>
              <span className="text-xs text-slate-500 font-medium">Blocks awaiting review</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/approvals')}
              className="mt-3 w-full justify-between text-blue-700 border-blue-200 hover:bg-blue-50"
            >
              <span>Review approval queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sync Notification Banner */}
      {syncSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between text-emerald-900 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{syncSuccessMsg}</span>
          </div>
          <Badge variant="success">POSTGRESQL COMMITTED</Badge>
        </div>
      )}

      {/* Enterprise Railway Systems Telemetry Gateway */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2.5">
              <Server className="w-4 h-4 text-blue-600" />
              <CardTitle>Enterprise Railway Systems Telemetry Gateway</CardTitle>
              <Badge variant="warning">SIMULATED DEMO DATA</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live mock connectors mimicking Indian Railways enterprise architectures (TMS, SMMS, TDMS, COA) with automatic ML normalization.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="success" className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>4 / 4 Gateways Active</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(integrationTelemetry?.systems || [
              { system: 'TMS', status: 'Online (Simulated Gateway)', latency_ms: 24, records_available: 1420 },
              { system: 'SMMS', status: 'Online (Simulated Gateway)', latency_ms: 31, records_available: 1180 },
              { system: 'TDMS', status: 'Online (Simulated Gateway)', latency_ms: 28, records_available: 960 },
              { system: 'COA', status: 'Online (Simulated Gateway)', latency_ms: 18, records_available: 3450 }
            ]).map((sys) => {
              const meta = SYSTEM_META[sys.system] || { fullName: sys.system, dept: "IR System", border: "border-slate-200", badgeBg: "bg-slate-100 text-slate-800" };
              const isSyncing = syncingSystem === sys.system;

              return (
                <div 
                  key={sys.system}
                  className={`bg-slate-50/80 rounded-xl p-4 border ${meta.border} flex flex-col justify-between hover:shadow-xs transition`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-extrabold text-xs text-slate-900 px-2 py-0.5 rounded bg-white border border-slate-200 shadow-2xs">
                        {sys.system}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>{sys.latency_ms}ms ping</span>
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 mt-1">{meta.fullName}</h4>
                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">{meta.dept}</p>

                    <div className="mt-3 text-[11px] text-slate-700 space-y-1 bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gateway Feed:</span>
                        <span className="font-mono text-emerald-700 font-semibold">{sys.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Records Pool:</span>
                        <span className="font-mono text-slate-900 font-bold">{sys.records_available} items</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-semibold">
                      SIMULATED
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncSystem(sys.system)}
                      disabled={isSyncing}
                      className="text-xs"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync & Ingest'}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Ingestion Logs Strip */}
          {integrationTelemetry?.recent_sync_logs?.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recent Integration Audit Trail (Database Ingestion Logs)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">Stored in integration_logs table</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-[11px]">
                      <th className="pb-2 font-medium">Timestamp</th>
                      <th className="pb-2 font-medium">External System</th>
                      <th className="pb-2 font-medium">Pipeline Action</th>
                      <th className="pb-2 font-medium">Records Normalized</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                    {integrationTelemetry.recent_sync_logs.slice(0, 4).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2 font-bold text-slate-900">{log.system_name}</td>
                        <td className="py-2 text-slate-600">{log.sync_type}</td>
                        <td className="py-2 text-emerald-700 font-bold">+{log.records_synced} records</td>
                        <td className="py-2">
                          <Badge variant="success">{log.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Corridor Punctuality Chart */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Corridor Punctuality Performance</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Punctuality % across major Indian Railways trunk routes</p>
            </div>
            <Badge variant="secondary" className="font-mono">
              COA Live Timetable Feed
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={punctualityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="corridor_code" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[85, 100]} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1d4ed8', fontWeight: 600 }}
                  />
                  <Bar dataKey="punctuality_pct" fill="#2563eb" radius={[6, 6, 0, 0]} name="Punctuality %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Multi-Department Synergy Share */}
        <Card className="shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Multi-Department Synergy</CardTitle>
              <Badge variant="success">
                {synergyData?.synergy_percentage}% Integrated
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Integrated Shadow Blocks bundling Civil (ENG), Signal (S&T), and Traction (TRD).
            </p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={synergyData?.department_shares || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="block_participation_pct"
                  >
                    {(synergyData?.department_shares || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Track Hours Saved:</span>
              <span className="font-extrabold text-emerald-700 font-mono text-sm">{synergyData?.estimated_hours_saved} Hours</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced AI Telemetry: Survival Analysis & Anti-Gaming Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discrete Survival Analysis & RUL Section Health */}
        <Card className="shadow-xs border-rose-100">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <CardTitle>Track Asset Survival & Remaining Useful Life (RUL)</CardTitle>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Discrete 30-Day Failure Hazard S(t) via Weibull Accelerated Failure Time (AFT) & XGBoost.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/corridor-map')}
              className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
            >
              <span>View GIS Heatmap</span>
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {survivalSections.slice(0, 4).map((sec) => {
                const isCritical = sec.failure_probability_30d >= 0.75;
                const isElevated = sec.failure_probability_30d >= 0.40 && sec.failure_probability_30d < 0.75;
                const barColor = isCritical ? 'bg-rose-600' : (isElevated ? 'bg-amber-500' : 'bg-emerald-500');
                const badgeVariant = isCritical ? 'danger' : (isElevated ? 'warning' : 'success');

                return (
                  <div key={sec.section_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 hover:bg-slate-100/70 transition">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{sec.section_code}</span>
                        <span className="text-[11px] text-slate-500">({sec.corridor_name})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold font-mono text-slate-700">
                          RUL: <strong className={isCritical ? 'text-rose-700' : 'text-slate-900'}>{sec.estimated_rul_days}d</strong>
                        </span>
                        <Badge variant={badgeVariant}>{sec.risk_tier}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-600">
                      <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${barColor}`} 
                          style={{ width: `${Math.min(100, sec.risk_percentage)}%` }}
                        ></div>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                        {sec.risk_percentage}% 30d Failure Risk
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Traffic: {sec.gmt_traffic_density} GMT</span>
                      <span>Active Defects: {sec.active_defects}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Anti-Gaming Criticality Audit & Evidence Compliance */}
        <Card className="shadow-xs border-purple-100">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <CardTitle>Anti-Gaming Criticality & Allocation Integrity</CardTitle>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Objective sensor cross-validation preventing artificial emergency block inflation.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/department-coordination')}
              className="text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
            >
              <span>Audit Center</span>
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {antiGamingAudit ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-purple-800">Compliance Rate</span>
                    <div className="text-2xl font-extrabold text-purple-900 font-mono mt-1">
                      {antiGamingAudit.compliance_rate_pct}%
                    </div>
                    <span className="text-[10px] text-purple-700">Sensor-Verified Claims</span>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-800">Flagged Claims</span>
                    <div className="text-2xl font-extrabold text-amber-900 font-mono mt-1">
                      {antiGamingAudit.inflated_claims_detected}
                    </div>
                    <span className="text-[10px] text-amber-700">Recalibrated Fair-Share</span>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
                    <span className="text-[10px] uppercase font-bold text-blue-800">Total Audited</span>
                    <div className="text-2xl font-extrabold text-blue-900 font-mono mt-1">
                      {antiGamingAudit.total_tasks_audited}
                    </div>
                    <span className="text-[10px] text-blue-700">Division Task Requests</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
                    <span>Inflation Flags by Department:</span>
                    <span className="text-[11px] font-normal text-slate-500">Autonomous fair-share recalibration</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(antiGamingAudit.department_inflation_breakdown || {}).map(([dept, count]) => (
                      <div key={dept} className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 font-mono">{dept}</span>
                        <span className="font-mono text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                          {count} flagged
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Loading anti-gaming telemetry audit...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
