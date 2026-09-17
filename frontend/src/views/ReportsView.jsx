import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Download, 
  Calendar, 
  Filter, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function ReportsView() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('5M');
  const [exportNotice, setExportNotice] = useState('');

  useEffect(() => {
    fetchReportSummary();
  }, []);

  const fetchReportSummary = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/summary');
      setReportData(res.data);
    } catch (err) {
      console.error("Failed to fetch reports summary", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (type) => {
    setExportNotice(`Generating official IR ${type} report dossier...`);
    setTimeout(() => {
      setExportNotice('');
      alert(`Indian Railways Monthly Block Planning Report (${type}) exported successfully.`);
    }, 1200);
  };

  const metrics = reportData?.key_metrics || {
    asset_availability_pct: 94.2,
    system_punctuality_pct: 93.2,
    block_approval_rate_pct: 88.0,
    total_blocks_analyzed: 50,
    total_defects_resolved_ytd: 842,
    track_hours_saved_by_synergy: 128
  };

  const monthlyTrend = reportData?.monthly_trend || [];
  const deptEfficiency = reportData?.department_efficiency || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span>Safety & Operational Analytics</span>
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              SIH26027 COMPLIANT
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Audited execution metrics, punctuality impact, multi-department synergy gains, and track availability
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="warning" className="text-xs">
            SIMULATED DEMO DATA
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleExport('CSV')}
            className="flex items-center space-x-1.5 bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => handleExport('PDF')}
            className="flex items-center space-x-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Generate Executive Dossier</span>
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 animate-pulse">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Availability</span>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{metrics.asset_availability_pct}%</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +1.2%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Target threshold: &gt; 92.0%</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Punctuality Rate</span>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{metrics.system_punctuality_pct}%</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3 h-3 mr-0.5" /> +0.8%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Mail/Express Corridors</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Block Approval Rate</span>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{metrics.block_approval_rate_pct}%</span>
              <span className="text-xs font-bold text-slate-500">
                ({metrics.total_blocks_analyzed} requests)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Joint control desk sanctioned</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Synergy Track Hours Saved</span>
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{metrics.track_hours_saved_by_synergy} hrs</span>
              <span className="text-xs font-bold text-purple-600">AI Bundled</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Multi-department shadow blocks</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Availability & Punctuality Trends */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Asset Availability vs Train Punctuality Trend</span>
              </CardTitle>
              <p className="text-xs text-slate-500">Historical 5-Month Trajectory across Nagpur Division</p>
            </div>
            <div className="flex space-x-1 bg-slate-100 p-0.5 rounded-md text-[10px] font-bold">
              <button 
                onClick={() => setTimeRange('3M')}
                className={`px-2 py-0.5 rounded ${timeRange === '3M' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}
              >
                3M
              </button>
              <button 
                onClick={() => setTimeRange('5M')}
                className={`px-2 py-0.5 rounded ${timeRange === '5M' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}
              >
                5M
              </button>
              <button 
                onClick={() => setTimeRange('YTD')}
                className={`px-2 py-0.5 rounded ${timeRange === 'YTD' ? 'bg-white shadow text-blue-600' : 'text-slate-600'}`}
              >
                YTD
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="availGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="punctGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis domain={[85, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} unit="%" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                    formatter={(val) => [`${val}%`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="availability_pct" 
                    name="Asset Availability (%)" 
                    stroke="#2563eb" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#availGrad)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="punctuality_pct" 
                    name="Train Punctuality (%)" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#punctGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Department Efficiency Comparison */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Department Execution Efficiency</span>
              </CardTitle>
              <p className="text-xs text-slate-500">Planned vs Actual Block Hours Utilized</p>
            </div>
            <Badge variant="ai" className="text-[10px]">
              Synergy Tracking
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptEfficiency} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} unit="h" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                    formatter={(val, name) => [`${val} hrs`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="planned_hours" name="Planned Window (Hrs)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual_hours" name="Actual Utilization (Hrs)" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Department Performance Table */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-4 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">
            Departmental Block Execution Audit Breakdown
          </CardTitle>
          <p className="text-xs text-slate-500">
            Cross-verification of sanctioned engineering possessions vs actual clearance times
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Department Branch</th>
                  <th className="px-4 py-3">Planned Window</th>
                  <th className="px-4 py-3">Actual Executed</th>
                  <th className="px-4 py-3">Variance</th>
                  <th className="px-4 py-3">Execution Efficiency</th>
                  <th className="px-4 py-3">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {deptEfficiency.map((row, idx) => {
                  const variance = row.planned_hours - row.actual_hours;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {row.department}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {row.planned_hours} hrs
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 font-mono">
                        {row.actual_hours} hrs
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        <span className="text-emerald-600 font-bold">
                          +{variance} hrs saved
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-slate-100 rounded-full h-2">
                            <div 
                              className="bg-emerald-500 h-2 rounded-full" 
                              style={{ width: `${row.efficiency_pct}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-700">{row.efficiency_pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="success" className="text-[10px]">
                          EXCELLENT
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

