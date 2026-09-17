import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Plus, 
  ArrowUpDown, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  X,
  Gauge,
  Calendar,
  Radio,
  RefreshCw,
  Zap,
  Lock
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function DefectsView() {
  const { activeUser } = useOutletContext() || {};

  const currentRole = (activeUser?.canonical_role || activeUser?.role || localStorage.getItem('ir_user_role') || 'ENGINEERING').toUpperCase();
  const userDept = (activeUser?.department || localStorage.getItem('ir_user_dept') || 'ENG').toUpperCase();
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'ADMINISTRATOR';

  // Data state
  const [defects, setDefects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pagination & Filter state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState(isAdmin ? 'ALL' : userDept);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [speedRestrictionOnly, setSpeedRestrictionOnly] = useState(false);
  const [sortBy, setSortBy] = useState('calculated_priority_score');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (!isAdmin) {
      setDepartmentFilter(userDept);
    }
  }, [isAdmin, userDept]);

  // Modals state
  const [selectedDefect, setSelectedDefect] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [defectToEdit, setDefectToEdit] = useState(null);
  const [defectToDelete, setDefectToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [recalculating, setRecalculating] = useState(false);

  // Form states
  const initialFormState = {
    defect_type: 'Rail Fracture 30mm Flaw',
    department_code: 'ENG',
    location: '',
    description: '',
    severity: 'Critical',
    criticality: 'P0 - Emergency',
    due_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    estimated_repair_duration_minutes: 180,
    speed_restriction_imposed: 30,
    reported_by_system: 'TMS',
    status: 'Open'
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.get('/defects/statistics');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load defect statistics", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch defects list
  const fetchDefects = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (!isAdmin) {
        params.department = userDept;
      } else if (departmentFilter !== 'ALL') {
        params.department = departmentFilter;
      }
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (criticalityFilter !== 'ALL') params.criticality = criticalityFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (speedRestrictionOnly) params.has_speed_restriction = true;

      const res = await apiClient.get('/defects', { params });
      if (res.data.items) {
        setDefects(res.data.items);
        setTotalPages(res.data.total_pages || 1);
        setTotalItems(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        setDefects(res.data);
        setTotalItems(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load defects backlog", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, departmentFilter, severityFilter, criticalityFilter, statusFilter, speedRestrictionOnly, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDefects();
  }, [fetchDefects]);

  const showNotification = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Handlers
  const handleOpenDetail = (defect) => {
    setSelectedDefect(defect);
    setIsDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (defect) => {
    setDefectToEdit(defect);
    setFormData({
      defect_type: defect.defect_type,
      department_code: defect.department_code || 'ENG',
      location: defect.location || '',
      description: defect.description || '',
      severity: defect.severity || 'Major',
      criticality: defect.criticality || 'P1 - Urgent',
      due_date: defect.due_date ? new Date(defect.due_date).toISOString().slice(0, 16) : '',
      estimated_repair_duration_minutes: defect.estimated_repair_duration_minutes || 120,
      speed_restriction_imposed: defect.speed_restriction_imposed || 0,
      reported_by_system: defect.reported_by_system || 'TMS',
      status: defect.status || 'Open'
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient.post('/defects', {
        ...formData,
        estimated_repair_duration_minutes: parseInt(formData.estimated_repair_duration_minutes) || 120,
        speed_restriction_imposed: parseInt(formData.speed_restriction_imposed) || 0
      });
      setIsCreateModalOpen(false);
      showNotification("Defect logged and evaluated by AI Priority Engine.");
      fetchDefects();
      fetchStats();
    } catch (err) {
      console.error("Failed to create defect", err);
      alert("Error creating defect: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!defectToEdit) return;
    try {
      setActionLoading(true);
      await apiClient.put(`/defects/${defectToEdit.id}`, {
        ...formData,
        estimated_repair_duration_minutes: parseInt(formData.estimated_repair_duration_minutes) || 120,
        speed_restriction_imposed: parseInt(formData.speed_restriction_imposed) || 0
      });
      setIsEditModalOpen(false);
      showNotification(`Defect ${defectToEdit.defect_code} updated successfully.`);
      fetchDefects();
      fetchStats();
    } catch (err) {
      console.error("Failed to update defect", err);
      alert("Error updating defect: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!defectToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/defects/${defectToDelete.id}`);
      setIsDeleteModalOpen(false);
      showNotification(`Defect ${defectToDelete.defect_code} removed.`);
      setDefectToDelete(null);
      fetchDefects();
      fetchStats();
    } catch (err) {
      console.error("Failed to delete defect", err);
      alert("Error deleting defect: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculatePriorities = async () => {
    try {
      setRecalculating(true);
      const res = await apiClient.post('/defects/recalculate-priorities');
      showNotification(res.data.message || "AI Priorities successfully recalculated!");
      fetchDefects();
      fetchStats();
    } catch (err) {
      console.error("Recalculate failed", err);
    } finally {
      setRecalculating(false);
    }
  };

  // Badge helpers
  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'Critical':
        return <Badge variant="critical" className="bg-rose-100 text-rose-800 border-rose-300 font-bold">Critical</Badge>;
      case 'Major':
        return <Badge variant="warning" className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">Major</Badge>;
      default:
        return <Badge variant="primary" className="bg-blue-100 text-blue-800 border-blue-300">Minor</Badge>;
    }
  };

  const getCriticalityBadge = (crit) => {
    if (!crit) return null;
    if (crit.includes('P0')) {
      return <Badge variant="critical" className="bg-rose-600 text-white font-black animate-pulse">P0 Emergency</Badge>;
    }
    if (crit.includes('P1')) {
      return <Badge variant="warning" className="bg-amber-500 text-white font-bold">P1 Urgent</Badge>;
    }
    if (crit.includes('P2')) {
      return <Badge variant="primary" className="bg-blue-600 text-white">P2 Important</Badge>;
    }
    return <Badge variant="secondary">P3 Routine</Badge>;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <Badge variant="critical" className="bg-rose-50 text-rose-700 border-rose-200">Open</Badge>;
      case 'Investigating':
        return <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">Investigating</Badge>;
      case 'Scheduled':
        return <Badge variant="ai" className="bg-purple-100 text-purple-800 border-purple-300">Scheduled</Badge>;
      case 'Resolved':
      case 'Closed':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300">Resolved</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityColor = (score) => {
    if (score >= 80) return 'bg-rose-600';
    if (score >= 60) return 'bg-orange-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-blue-500';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
              <span>Defect Management & USFD Flaw Registry</span>
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              SIH26027
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Ultrasonic flaw telemetry, track fissures, OHE catenary sags, signal point failures, and AI priority ranking
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="warning" className="text-xs">
            SIMULATED DEMO DATA
          </Badge>
          <Button
            variant="ai"
            size="sm"
            disabled={recalculating}
            onClick={handleRecalculatePriorities}
            className="flex items-center space-x-1.5"
          >
            <Sparkles className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            <span>{recalculating ? 'Re-scoring...' : 'Recalculate AI Priorities'}</span>
          </Button>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Report Defect</span>
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Statistics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Defects</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats?.total_defects ?? '...'}</span>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-[10px] text-slate-400">{stats?.open_count ?? 0} active open</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">P0 Emergency</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-600">{stats?.critical_p0_count ?? '...'}</span>
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-400">Immediate possession req.</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Speed Restrictions</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600">{stats?.speed_restrictions_count ?? '...'}</span>
              <Gauge className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] text-slate-400">Punctuality penalty</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Avg AI Priority</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-purple-600">{stats?.avg_priority_score ?? '...'}/100</span>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-[10px] text-slate-400">Weighted risk model</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white col-span-2 md:col-span-1">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Resolved & Closed</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-600">{stats?.resolved_count ?? '...'}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] text-slate-400">Track normalized</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Defect ID, defect type, description, location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Department */}
              {isAdmin ? (
                <select
                  value={departmentFilter}
                  onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                  className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
                >
                  <option value="ALL">All Departments</option>
                  <option value="ENG">Civil (TMS)</option>
                  <option value="SNT">Signal (SMMS)</option>
                  <option value="TRD">Traction (TDMS)</option>
                </select>
              ) : (
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{userDept === 'ENG' ? 'Civil (TMS)' : userDept === 'TRD' ? 'Traction (TDMS)' : 'Signal (SMMS)'}</span>
                </div>
              )}

              {/* Severity */}
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">All Severity</option>
                <option value="Critical">Critical</option>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
              </select>

              {/* Criticality */}
              <select
                value={criticalityFilter}
                onChange={(e) => { setCriticalityFilter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">All Criticality</option>
                <option value="P0">P0 - Emergency</option>
                <option value="P1">P1 - Urgent</option>
                <option value="P2">P2 - Important</option>
              </select>

              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Investigating">Investigating</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Resolved">Resolved</option>
              </select>

              {/* Speed restriction checkbox button */}
              <button
                type="button"
                onClick={() => {
                  setSpeedRestrictionOnly(!speedRestrictionOnly);
                  setPage(1);
                }}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center space-x-1 transition ${
                  speedRestrictionOnly
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Speed Restr. Only</span>
              </button>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="calculated_priority_score">Sort: AI Priority Score</option>
                <option value="severity">Sort: Severity</option>
                <option value="due_date">Sort: Due Date</option>
                <option value="reported_at">Sort: Detected Date</option>
              </select>

              {/* Sort Order Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-2.5 py-1.5 bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                title={`Sort Order: ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 mr-1" />
                <span className="text-[11px] font-bold uppercase">{sortOrder}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDepartmentFilter('ALL');
                  setSeverityFilter('ALL');
                  setCriticalityFilter('ALL');
                  setStatusFilter('ALL');
                  setSpeedRestrictionOnly(false);
                  setSortBy('calculated_priority_score');
                  setSortOrder('desc');
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defects Data Table */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th className="px-3 py-3">Defect ID</th>
                  <th className="px-3 py-3">Asset & Dept</th>
                  <th className="px-3 py-3">Track Location</th>
                  <th className="px-3 py-3">Defect Type & Description</th>
                  <th className="px-3 py-3 text-center">Severity</th>
                  <th className="px-3 py-3 text-center">Criticality</th>
                  <th className="px-3 py-3">AI Priority Score</th>
                  <th className="px-3 py-3 text-center">Speed Restr.</th>
                  <th className="px-3 py-3">Detected / Due</th>
                  <th className="px-3 py-3 text-center">Duration</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="12" className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading defects backlog...
                    </td>
                  </tr>
                ) : defects.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-12 text-slate-400">
                      No defects match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  defects.map((defect) => (
                    <tr key={defect.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Defect ID */}
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {defect.defect_code}
                      </td>

                      {/* Asset & Dept */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block truncate max-w-[120px]" title={defect.asset_name || defect.asset_code}>
                            {defect.asset_code || 'TRACK-DEF'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {defect.department_code} • {defect.reported_by_system}
                          </span>
                        </div>
                      </td>

                      {/* Track Location */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 max-w-[150px]">
                          <span className="font-semibold text-slate-800 block truncate" title={defect.location}>
                            {defect.location || 'Mainline'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Sec: {defect.section_code || 'NGP-WR'}
                          </span>
                        </div>
                      </td>

                      {/* Defect Type & Description */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 max-w-[180px]">
                          <span className="font-bold text-slate-900 block truncate" title={defect.defect_type}>
                            {defect.defect_type}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate" title={defect.description}>
                            {defect.description}
                          </span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getSeverityBadge(defect.severity)}
                      </td>

                      {/* Criticality */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getCriticalityBadge(defect.criticality)}
                      </td>

                      {/* AI Priority Score */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="space-y-1 w-28">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-slate-600">Score</span>
                            <span className="font-mono text-purple-700">{defect.calculated_priority_score}</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${getPriorityColor(defect.calculated_priority_score)}`}
                              style={{ width: `${Math.min(100, defect.calculated_priority_score)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Speed Restriction */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {defect.speed_restriction_imposed > 0 ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                            {defect.speed_restriction_imposed} km/h
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>

                      {/* Detected / Due */}
                      <td className="px-3 py-3 whitespace-nowrap text-[11px]">
                        <div className="space-y-0.5 font-mono text-slate-600">
                          <span className="block text-[10px] text-slate-400">
                            Det: {defect.reported_at ? new Date(defect.reported_at).toLocaleDateString() : 'N/A'}
                          </span>
                          <span className="block font-semibold text-slate-800">
                            Due: {defect.due_date ? new Date(defect.due_date).toLocaleDateString() : 'Immediate'}
                          </span>
                        </div>
                      </td>

                      {/* Repair Duration */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-700">
                        {defect.estimated_repair_duration_minutes}m
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(defect.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenDetail(defect)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(defect)}
                            className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Edit Defect"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDefectToDelete(defect);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Defect"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <span>Showing {defects.length} of {totalItems} defects</span>
              <span className="text-slate-300">•</span>
              <div className="flex items-center space-x-1">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-semibold"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2 py-1 bg-white text-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="sr-only">Previous</span>
              </Button>
              <span className="font-semibold text-slate-700 px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2 py-1 bg-white text-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="sr-only">Next</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= MODAL 1: DEFECT DETAILS ================= */}
      {isDetailModalOpen && selectedDefect && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-600 rounded-lg text-white">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base">{selectedDefect.defect_code}</h3>
                    {getStatusBadge(selectedDefect.status)}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">Reported via {selectedDefect.reported_by_system}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedDefect.defect_type}</h4>
                <p className="text-slate-600 mt-1 leading-relaxed">{selectedDefect.description}</p>
              </div>

              {/* 12 Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedDefect.department_code}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Asset Code</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedDefect.asset_code || 'TRK-POINT'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedDefect.location}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Severity</span>
                  <div className="mt-0.5">{getSeverityBadge(selectedDefect.severity)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Criticality</span>
                  <div className="mt-0.5">{getCriticalityBadge(selectedDefect.criticality)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Speed Restriction</span>
                  <span className="font-bold text-rose-600 mt-0.5 block font-mono">
                    {selectedDefect.speed_restriction_imposed > 0 ? `${selectedDefect.speed_restriction_imposed} km/h` : 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Detected Date</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedDefect.reported_at ? new Date(selectedDefect.reported_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rectification Due Date</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedDefect.due_date ? new Date(selectedDefect.due_date).toLocaleDateString() : 'Immediate'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Repair Duration</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedDefect.estimated_repair_duration_minutes} minutes
                  </span>
                </div>
              </div>

              {/* AI Priority Factor Breakdown */}
              <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-purple-950">AI Priority Criticality Score: {selectedDefect.calculated_priority_score} / 100</span>
                  </div>
                  <Badge variant="ai" className="text-[10px]">AIPriorityEngine v1.0</Badge>
                </div>
                <p className="text-[11px] text-purple-900 leading-relaxed">
                  Scored based on severity weight ({selectedDefect.severity}), speed restriction impact ({selectedDefect.speed_restriction_imposed} km/h), corridor GMT traffic density (45 GMT), and permissible section line speed (130 km/h).
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedDefect);
                }}
              >
                Edit Defect
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: REPORT DEFECT ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base">Report New Track Defect</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Defect Type / Flaw Specification *</label>
                  <Input
                    required
                    placeholder="e.g. Transverse Rail Fracture (USFD Echo #48)"
                    value={formData.defect_type}
                    onChange={(e) => setFormData({ ...formData, defect_type: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Department *</label>
                    <select
                      value={formData.department_code}
                      onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="ENG">Civil (TMS)</option>
                      <option value="SNT">Signal (SMMS)</option>
                      <option value="TRD">Traction (TDMS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Reporting Gateway</label>
                    <select
                      value={formData.reported_by_system}
                      onChange={(e) => setFormData({ ...formData, reported_by_system: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="TMS">TMS (Track Telemetry)</option>
                      <option value="SMMS">SMMS (Interlocking)</option>
                      <option value="TDMS">TDMS (Traction OHE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Severity *</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Critical">Critical</option>
                      <option value="Major">Major</option>
                      <option value="Minor">Minor</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Location (KM / Section) *</label>
                    <Input
                      required
                      placeholder="e.g. KM 824/18, Nagpur - Wardha Up Line"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Criticality Level</label>
                    <select
                      value={formData.criticality}
                      onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="P0 - Emergency">P0 - Emergency (Immediate Block)</option>
                      <option value="P1 - Urgent">P1 - Urgent (Within 24h)</option>
                      <option value="P2 - Important">P2 - Important (Within 3 Days)</option>
                      <option value="P3 - Routine">P3 - Routine</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Speed Restriction Imposed (km/h)</label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={formData.speed_restriction_imposed}
                      onChange={(e) => setFormData({ ...formData, speed_restriction_imposed: e.target.value })}
                    />
                    <span className="text-[10px] text-slate-400">0 if no restriction</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Estimated Repair Duration (min)</label>
                    <Input
                      type="number"
                      min="15"
                      max="600"
                      value={formData.estimated_repair_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, estimated_repair_duration_minutes: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Rectification Due Date</label>
                    <Input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Defect Technical Description</label>
                  <textarea
                    rows={3}
                    placeholder="Technical description of defect, ultrasonic reading, rail wear..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Logging...' : 'Report Defect'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT DEFECT ================= */}
      {isEditModalOpen && defectToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Edit Defect: {defectToEdit.defect_code}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Defect Type *</label>
                  <Input
                    required
                    value={formData.defect_type}
                    onChange={(e) => setFormData({ ...formData, defect_type: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Open">Open</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Severity *</label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Critical">Critical</option>
                      <option value="Major">Major</option>
                      <option value="Minor">Minor</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Criticality</label>
                    <select
                      value={formData.criticality}
                      onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="P0 - Emergency">P0 - Emergency</option>
                      <option value="P1 - Urgent">P1 - Urgent</option>
                      <option value="P2 - Important">P2 - Important</option>
                      <option value="P3 - Routine">P3 - Routine</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Location</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Speed Restriction (km/h)</label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={formData.speed_restriction_imposed}
                      onChange={(e) => setFormData({ ...formData, speed_restriction_imposed: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Rectification Due Date</label>
                    <Input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Estimated Repair Duration (min)</label>
                    <Input
                      type="number"
                      value={formData.estimated_repair_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, estimated_repair_duration_minutes: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description / Rectification Remarks</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: DELETE DEFECT ================= */}
      {isDeleteModalOpen && defectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Delete Defect Record?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete <strong className="text-slate-900">{defectToDelete.defect_code}</strong> ({defectToDelete.defect_type})? This will permanently remove it from the backlog.
              </p>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="critical" size="sm" disabled={actionLoading} onClick={handleDeleteConfirm}>
                {actionLoading ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
