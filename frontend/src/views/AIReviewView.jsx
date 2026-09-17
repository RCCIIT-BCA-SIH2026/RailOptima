import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Wrench, 
  Search, 
  Filter, 
  RefreshCw, 
  Cpu, 
  Activity, 
  FileText, 
  ChevronRight, 
  X, 
  Eye, 
  Check, 
  AlertCircle,
  TrendingUp,
  Layers
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function AIReviewView() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    critical: 0
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action States
  const [inspectItem, setInspectItem] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'APPROVE' | 'REJECT', item: rec }
  const [actionRemark, setActionRemark] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (deptFilter !== 'ALL') params.department_code = deptFilter;
      if (typeFilter !== 'ALL') params.recommendation_type = typeFilter;

      const res = await apiClient.get('/ai/recommendations', { params });
      const data = res.data;
      setRecommendations(data.recommendations || []);
      setCounts({
        total: data.total_count || 0,
        pending: data.pending_count || 0,
        approved: data.approved_count || 0,
        rejected: data.rejected_count || 0,
        critical: data.critical_count || 0
      });
    } catch (err) {
      console.error("Failed to load AI recommendations", err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, deptFilter, typeFilter]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleOpenApprove = (rec) => {
    setActionModal({ type: 'APPROVE', item: rec });
    setActionRemark('Approved by Railway Administrator for scheduled block possession.');
  };

  const handleOpenReject = (rec) => {
    setActionModal({ type: 'REJECT', item: rec });
    setActionRemark('');
  };

  const handleExecuteApprove = async () => {
    if (!actionModal?.item) return;
    try {
      setActionSubmitting(true);
      const recId = actionModal.item.id;
      const res = await apiClient.post(`/ai/recommendations/${recId}/approve`, {
        approval_comment: actionRemark || 'Approved by System Administrator'
      });
      setNotification({
        type: 'success',
        message: `Recommendation ${actionModal.item.recommendation_code} APPROVED. Official work order generated.`
      });
      setActionModal(null);
      if (inspectItem && inspectItem.id === recId) {
        setInspectItem(res.data);
      }
      await fetchRecommendations();
    } catch (err) {
      console.error("Approve action failed", err);
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || "Failed to approve recommendation."
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleExecuteReject = async () => {
    if (!actionModal?.item) return;
    if (!actionRemark.trim()) {
      alert("A rejection reason is mandatory.");
      return;
    }
    try {
      setActionSubmitting(true);
      const recId = actionModal.item.id;
      const res = await apiClient.post(`/ai/recommendations/${recId}/reject`, {
        rejection_reason: actionRemark.trim()
      });
      setNotification({
        type: 'success',
        message: `Recommendation ${actionModal.item.recommendation_code} REJECTED.`
      });
      setActionModal(null);
      if (inspectItem && inspectItem.id === recId) {
        setInspectItem(res.data);
      }
      await fetchRecommendations();
    } catch (err) {
      console.error("Reject action failed", err);
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || "Failed to reject recommendation."
      });
    } finally {
      setActionSubmitting(false);
    }
  };

  const filteredItems = recommendations.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.recommendation_code?.toLowerCase().includes(q) ||
      item.asset_code?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between shadow-sm border transition-all animate-in fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span>AI Governance & Review Center</span>
            </h2>
            <Badge variant="primary">ADMIN SANCTION AUTHORITY</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official approval workflow for AI Predictive Maintenance diagnostics and cascading Train Delay forecasts.
            Only approved directives transition into official operational work orders for Engineering, TRD, and S&T.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchRecommendations}
            disabled={loading}
            className="text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Review</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{counts.pending}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Awaiting Sanction</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Critical / High Risk</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{counts.critical}</div>
              <div className="text-[10px] text-rose-700 font-semibold mt-0.5">Urgent Attention</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Approved Official</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{counts.approved}</div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Sanctioned Work Orders</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rejected Directives</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">{counts.rejected}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">No Official Update</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Tab Controls */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {[
                { id: 'PENDING_REVIEW', label: 'Pending Review', count: counts.pending },
                { id: 'APPROVED', label: 'Approved (Official)', count: counts.approved },
                { id: 'REJECTED', label: 'Rejected', count: counts.rejected },
                { id: 'ALL', label: 'All Records', count: counts.total }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    statusFilter === tab.id ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, asset, or title..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Department & Type Sub-filters */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-500 text-[11px] uppercase">Department:</span>
              {['ALL', 'ENG', 'TRD', 'SNT'].map(dept => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                    deptFilter === dept 
                      ? 'bg-slate-900 text-white font-bold' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept === 'ALL' ? 'All' : dept === 'ENG' ? 'ENG (P-Way)' : dept === 'TRD' ? 'TRD (OHE)' : 'S&T'}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-500 text-[11px] uppercase">Model Type:</span>
              {['ALL', 'PREDICTIVE_MAINTENANCE', 'TRAIN_DELAY_PREDICTION'].map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition ${
                    typeFilter === type 
                      ? 'bg-slate-900 text-white font-bold' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type === 'ALL' ? 'All Models' : type === 'PREDICTIVE_MAINTENANCE' ? 'Predictive Maintenance' : 'Train Delay'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Table */}
      <Card className="shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Recommendation Code</th>
                <th className="py-3 px-4">Department & Asset</th>
                <th className="py-3 px-4">AI Prediction & Risk</th>
                <th className="py-3 px-4">Recommended Directive</th>
                <th className="py-3 px-4">Model Pipeline</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Review Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading AI recommendations from database...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No recommendations found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-900">{item.recommendation_code}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5 mb-1">
                        <Badge variant={item.department_code === 'ENG' ? 'warning' : item.department_code === 'TRD' ? 'primary' : 'secondary'}>
                          {item.department_code}
                        </Badge>
                        <span className="font-mono font-bold text-slate-900">{item.asset_code || item.entity_id}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">{item.location || 'Track Mainline'}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1.5">
                        <Badge variant={item.risk_level === 'Critical' ? 'critical' : item.risk_level === 'High' ? 'warning' : 'success'}>
                          {item.risk_level || 'Normal'}
                        </Badge>
                        {item.maintenance_probability !== null && item.maintenance_probability !== undefined && (
                          <span className="font-mono font-bold text-slate-800">
                            {(item.maintenance_probability * 100).toFixed(1)}%
                          </span>
                        )}
                        {item.predicted_delay_minutes !== null && item.predicted_delay_minutes !== undefined && (
                          <span className="font-mono font-bold text-amber-700">
                            +{item.predicted_delay_minutes}m delay
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        {item.maintenance_required ? (
                          <span className="text-rose-700 font-bold">● Requires Possession</span>
                        ) : (
                          <span className="text-emerald-700">● Safe to Operate</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs font-medium text-slate-800 truncate" title={item.recommended_action || item.title}>
                        {item.recommended_action || item.title}
                      </div>
                      {item.top_risk_factors && item.top_risk_factors.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">
                          Driver: {item.top_risk_factors[0].feature} ({((item.top_risk_factors[0].importance || 0) * 100).toFixed(0)}%)
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      <div>{item.model_type}</div>
                      <div className="text-[10px] text-slate-400">{item.model_version || 'v1.0.0'}</div>
                    </td>

                    <td className="py-3 px-4">
                      {item.status === 'PENDING_REVIEW' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 mr-1 text-amber-600" />
                          Pending Review
                        </span>
                      )}
                      {item.status === 'APPROVED' && (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Approved
                          </span>
                          {item.task_id && (
                            <div className="text-[10px] font-mono text-blue-700 font-semibold">
                              Task #{item.task_id}
                            </div>
                          )}
                        </div>
                      )}
                      {item.status === 'REJECTED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                          Rejected
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setInspectItem(item)}
                        className="text-xs cursor-pointer"
                      >
                        <Eye className="w-3 h-3 mr-1" /> Inspect
                      </Button>

                      {item.status === 'PENDING_REVIEW' && (
                        <>
                          <Button
                            size="xs"
                            variant="primary"
                            onClick={() => handleOpenApprove(item)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white cursor-pointer"
                          >
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => handleOpenReject(item)}
                            className="text-xs cursor-pointer"
                          >
                            <X className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inspect Detail Modal */}
      {inspectItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-purple-600 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>AI Recommendation Diagnostic Dossier</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono border border-purple-400/30">
                      {inspectItem.recommendation_code}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {inspectItem.entity_id} &bull; {inspectItem.title}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setInspectItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Snapshot Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Department</span>
                  <span className="font-semibold text-slate-800">{inspectItem.department_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Location</span>
                  <span className="font-semibold text-slate-800 font-mono">{inspectItem.location || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Current Status</span>
                  <Badge variant={inspectItem.status === 'APPROVED' ? 'success' : inspectItem.status === 'REJECTED' ? 'critical' : 'warning'}>
                    {inspectItem.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Risk Level</span>
                  <Badge variant={inspectItem.risk_level === 'Critical' ? 'critical' : inspectItem.risk_level === 'High' ? 'warning' : 'success'}>
                    {inspectItem.risk_level || 'Normal'}
                  </Badge>
                </div>
              </div>

              {/* Assessment Card */}
              <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 space-y-2 text-purple-950">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-purple-900">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span>ML Pipeline Forecast</span>
                  </div>
                  {inspectItem.maintenance_probability !== null && (
                    <span className="text-base font-black font-mono text-purple-900">
                      {(inspectItem.maintenance_probability * 100).toFixed(2)}% Failure Probability
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-900 font-medium">
                  {inspectItem.description}
                </p>
                <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-purple-900">Recommended Directive:</span>
                  <span className="font-bold text-purple-950">{inspectItem.recommended_action || "Routine Monitoring"}</span>
                </div>
              </div>

              {/* Top Risk Drivers */}
              {inspectItem.top_risk_factors && inspectItem.top_risk_factors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Top Feature Influence Breakdown</span>
                  </div>
                  <div className="space-y-1.5">
                    {inspectItem.top_risk_factors.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-mono font-bold text-[10px] flex items-center justify-center">
                            #{i + 1}
                          </span>
                          <span className="font-semibold text-slate-800">{f.feature}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({((f.importance || 0) * 100).toFixed(1)}% influence)
                          </span>
                        </div>
                        {f.value !== undefined && f.value !== null && (
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {String(f.value)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval / Audit Details */}
              {inspectItem.status === 'APPROVED' && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 text-emerald-950 text-xs">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Official Approval Record</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-emerald-800 font-mono">
                    <div>Sanctioned By: <strong>{inspectItem.reviewer_name || 'System Administrator'}</strong></div>
                    <div>Sanction Date: <strong>{inspectItem.reviewed_at ? new Date(inspectItem.reviewed_at).toLocaleString() : 'Recent'}</strong></div>
                    {inspectItem.task_id && <div>Official Task ID: <strong>#{inspectItem.task_id}</strong></div>}
                  </div>
                  {inspectItem.approval_comment && (
                    <div className="pt-2 text-xs text-emerald-900">
                      <strong>Administrator Remark:</strong> "{inspectItem.approval_comment}"
                    </div>
                  )}
                </div>
              )}

              {inspectItem.status === 'REJECTED' && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1 text-rose-950 text-xs">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Administrative Rejection Record</span>
                  </div>
                  <div className="text-xs pt-1 text-rose-900">
                    <strong>Mandatory Rejection Reason:</strong> "{inspectItem.rejection_reason || 'Criteria not met'}"
                  </div>
                </div>
              )}

              {/* Model Metadata */}
              <div className="p-3 bg-slate-100 rounded-lg text-[11px] text-slate-500 font-mono flex items-center justify-between border border-slate-200">
                <div className="flex items-center space-x-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-600" />
                  <span>Model: <strong>{inspectItem.model_type}</strong> ({inspectItem.model_version || 'v1.0.0'})</span>
                </div>
                <span>Module: {inspectItem.source_module}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {inspectItem.status === 'PENDING_REVIEW' ? (
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenApprove(inspectItem)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve Directive
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleOpenReject(inspectItem)}
                    className="text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  Decision finalized & logged in official audit log.
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectItem(null)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog (Approve / Reject) */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              actionModal.type === 'APPROVE' ? 'bg-emerald-800' : 'bg-rose-900'
            }`}>
              <div className="flex items-center space-x-2 font-bold text-sm">
                {actionModal.type === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-300" />
                )}
                <span>
                  {actionModal.type === 'APPROVE' ? 'Approve AI Recommendation & Generate Official Work Order' : 'Reject AI Recommendation'}
                </span>
              </div>
              <button 
                onClick={() => setActionModal(null)}
                className="p-1 text-white/70 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600">
                Recommendation: <strong className="text-slate-900 font-mono">{actionModal.item.recommendation_code}</strong> &bull; Department: <strong className="text-slate-900">{actionModal.item.department_code}</strong>
              </div>

              {actionModal.type === 'APPROVE' ? (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <p className="font-semibold">Sanction Effect:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>Transitions status from <strong>PENDING_REVIEW</strong> to <strong>APPROVED</strong>.</li>
                    <li>Generates an official railway <strong>MaintenanceTask</strong> in the central database.</li>
                    <li>Becomes immediately visible in {actionModal.item.department_code} department dashboard.</li>
                    <li>Writes permanent entry to Railway Governance Audit Log.</li>
                  </ul>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1">
                  <p className="font-semibold">Rejection Effect:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li>Transitions status to <strong>REJECTED</strong>.</li>
                    <li>No official work order will be created.</li>
                    <li>Remains invisible to department maintenance crew.</li>
                  </ul>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {actionModal.type === 'APPROVE' ? 'Approval Remark / Sanction Note:' : 'Mandatory Rejection Reason:'}
                </label>
                <textarea
                  rows="3"
                  value={actionRemark}
                  onChange={(e) => setActionRemark(e.target.value)}
                  placeholder={actionModal.type === 'APPROVE' ? "Enter sanction remarks or scheduling guidance..." : "Specify reason for declining AI recommendation..."}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModal(null)}
                disabled={actionSubmitting}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              {actionModal.type === 'APPROVE' ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteApprove}
                  disabled={actionSubmitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {actionSubmitting ? 'Sanctioning...' : 'Sanction Official Update'}
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleExecuteReject}
                  disabled={actionSubmitting}
                  className="text-xs cursor-pointer"
                >
                  {actionSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

