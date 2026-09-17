import React, { useEffect, useState, useCallback } from 'react';
import { 
  Layers, 
  Search, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  Plus, 
  ArrowRight,
  Eye,
  Edit2,
  Trash2,
  X,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Train,
  Check,
  FileCheck,
  Activity,
  History
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function BlocksView() {
  // Data state
  const [blocks, setBlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Tab state: 'all' | 'upcoming' | 'active' | 'completed'
  const [activeTab, setActiveTab] = useState('all');

  // Filter & Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [approvalFilter, setApprovalFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('requested_start_time');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals state
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState(null);
  const [blockToDelete, setBlockToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Form states
  const initialFormState = {
    section_code: 'NDLS-TKD-UP',
    lead_department_code: 'ENG',
    block_type: 'Traffic',
    work_type: 'Track Tamping & Dynamic Express Lining',
    requested_start_time: new Date(Date.now() + 3600000 * 4).toISOString().slice(0, 16),
    requested_end_time: new Date(Date.now() + 3600000 * 7).toISOString().slice(0, 16),
    duration_minutes: 180,
    affected_assets: 'TRK-60KG-842, SLP-PSC-120',
    affected_trains: '12002 (Shatabdi), 22436 (Vande Bharat)',
    status: 'Upcoming',
    approval_status: 'Approved'
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.get('/blocks/statistics');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load block statistics", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch blocks list
  const fetchBlocks = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        tab: activeTab,
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (departmentFilter !== 'ALL') params.department = departmentFilter;
      if (approvalFilter !== 'ALL') params.approval_status = approvalFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await apiClient.get('/blocks', { params });
      if (res.data.items) {
        setBlocks(res.data.items);
        setTotalPages(res.data.total_pages || 1);
        setTotalItems(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        setBlocks(res.data);
        setTotalItems(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load blocks", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, pageSize, searchQuery, departmentFilter, approvalFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const showNotification = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Handlers
  const handleOpenDetail = (block) => {
    setSelectedBlock(block);
    setIsDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (block) => {
    setBlockToEdit(block);
    setFormData({
      section_code: block.section_code || 'NDLS-TKD-UP',
      lead_department_code: block.lead_department_code || 'ENG',
      block_type: block.block_type || 'Traffic',
      work_type: block.work_type || 'Track Maintenance',
      requested_start_time: block.requested_start_time ? new Date(block.requested_start_time).toISOString().slice(0, 16) : '',
      requested_end_time: block.requested_end_time ? new Date(block.requested_end_time).toISOString().slice(0, 16) : '',
      duration_minutes: block.duration_minutes || 180,
      affected_assets: block.affected_assets || '',
      affected_trains: block.affected_trains || '',
      status: block.status || 'Upcoming',
      approval_status: block.approval_status || 'Approved'
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient.post('/blocks', {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes) || 180
      });
      setIsCreateModalOpen(false);
      showNotification("Block possession scheduled successfully.");
      fetchBlocks();
      fetchStats();
    } catch (err) {
      console.error("Failed to create block", err);
      alert("Error scheduling block: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!blockToEdit) return;
    try {
      setActionLoading(true);
      await apiClient.put(`/blocks/${blockToEdit.id}`, {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes) || 180
      });
      setIsEditModalOpen(false);
      showNotification(`Block ${blockToEdit.block_code} updated successfully.`);
      fetchBlocks();
      fetchStats();
    } catch (err) {
      console.error("Failed to update block", err);
      alert("Error updating block: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!blockToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/blocks/${blockToDelete.id}`);
      setIsDeleteModalOpen(false);
      showNotification(`Block ${blockToDelete.block_code} deleted.`);
      setBlockToDelete(null);
      fetchBlocks();
      fetchStats();
    } catch (err) {
      console.error("Failed to delete block", err);
      alert("Error deleting block: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Badge helpers
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
      case 'In_Progress':
        return <Badge variant="primary" className="animate-pulse bg-blue-600 text-white font-bold">Active Track Possession</Badge>;
      case 'Upcoming':
      case 'Scheduled':
        return <Badge variant="ai" className="bg-purple-100 text-purple-900 border-purple-300 font-bold">Upcoming Window</Badge>;
      case 'Completed':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-900 border-emerald-300">Completed & Cleared</Badge>;
      case 'Rejected':
      case 'Cancelled':
        return <Badge variant="critical">Cancelled</Badge>;
      default:
        return <Badge variant="warning">{status}</Badge>;
    }
  };

  const getApprovalBadge = (app) => {
    switch (app) {
      case 'Approved':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">DRM Sanctioned</Badge>;
      case 'Pending':
        return <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-300 font-semibold">Pending Review</Badge>;
      case 'Under Review':
        return <Badge variant="ai" className="bg-purple-100 text-purple-800 border-purple-300">Under Review</Badge>;
      case 'Rejected':
        return <Badge variant="critical">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{app}</Badge>;
    }
  };

  const getDeptBadge = (code) => {
    switch (code) {
      case 'ENG':
        return <Badge variant="warning" className="bg-amber-100 text-amber-900 border-amber-300">Civil (ENG)</Badge>;
      case 'SNT':
      case 'S&T':
        return <Badge variant="primary" className="bg-blue-100 text-blue-900 border-blue-300">Signal (S&T)</Badge>;
      case 'TRD':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-900 border-yellow-300">Traction (TRD)</Badge>;
      default:
        return <Badge variant="ai">Integrated</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Layers className="w-6 h-6 text-blue-600" />
              <span>Block Possession Management</span>
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              SIH26027
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Engineering track possessions, traffic/power block windows, shadow block bundling, and DRM sanctions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="warning" className="text-xs">
            SIMULATED DEMO DATA
          </Badge>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Request Block Window</span>
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Blocks</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats?.total_blocks ?? '...'}</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] text-slate-400">{stats?.total_duration_hours ?? 0}h total track time</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Upcoming Windows</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-purple-600">{stats?.upcoming_count ?? '...'}</span>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-[10px] text-slate-400">Next 72 hours</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Active Possessions</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-600">{stats?.active_count ?? '...'}</span>
              <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            </div>
            <span className="text-[10px] text-slate-400">Live section possession</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Completed</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-600">{stats?.completed_count ?? '...'}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] text-slate-400">Cleared without overrun</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white col-span-2 md:col-span-1">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pending Approval</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600">{stats?.pending_approval_count ?? '...'}</span>
              <FileCheck className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] text-slate-400">Awaiting DRM sign</span>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs: All, Upcoming, Active, Completed */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl shadow-xs">
        <button
          onClick={() => { setActiveTab('all'); setPage(1); }}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition -mb-px ${
            activeTab === 'all'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>All Blocks</span>
        </button>

        <button
          onClick={() => { setActiveTab('upcoming'); setPage(1); }}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition -mb-px ${
            activeTab === 'upcoming'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming Blocks</span>
          {stats?.upcoming_count > 0 && (
            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
              {stats.upcoming_count}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('active'); setPage(1); }}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition -mb-px ${
            activeTab === 'active'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Active Blocks</span>
          {stats?.active_count > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold animate-pulse">
              {stats.active_count}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('completed'); setPage(1); }}
          className={`flex items-center space-x-2 py-2.5 px-4 text-xs font-bold border-b-2 transition -mb-px ${
            activeTab === 'completed'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Completed Blocks</span>
        </button>
      </div>

      {/* Filters & Search */}
      <Card className="border-slate-200 shadow-xs bg-white rounded-t-none">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Block ID, section, work type, affected assets or trains..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">All Departments</option>
                <option value="ENG">Civil (ENG)</option>
                <option value="SNT">Signal (S&T)</option>
                <option value="TRD">Traction (TRD)</option>
              </select>

              <select
                value={approvalFilter}
                onChange={(e) => { setApprovalFilter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">All Approvals</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="requested_start_time">Sort: Start Time</option>
                <option value="duration_minutes">Sort: Duration</option>
                <option value="id">Sort: Block ID</option>
              </select>

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
                  setApprovalFilter('ALL');
                  setStatusFilter('ALL');
                  setSortBy('requested_start_time');
                  setSortOrder('asc');
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

      {/* 11-Field Block Management Table */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th className="px-3 py-3">Block ID</th>
                  <th className="px-3 py-3">Section</th>
                  <th className="px-3 py-3">Window Start / End</th>
                  <th className="px-3 py-3 text-center">Duration</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Work Type</th>
                  <th className="px-3 py-3">Affected Assets</th>
                  <th className="px-3 py-3">Affected Trains</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-center">Approval Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading block possessions...
                    </td>
                  </tr>
                ) : blocks.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400">
                      No blocks found in this category.
                    </td>
                  </tr>
                ) : (
                  blocks.map((block) => (
                    <tr key={block.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Block ID */}
                      <td className="px-3 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {block.block_code}
                      </td>

                      {/* Section */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">
                          {block.section_code || 'NGP-WR-UP'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {block.block_type || 'Traffic'} Block
                        </span>
                      </td>

                      {/* Window Start / End */}
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 font-semibold block">
                            {block.requested_start_time ? new Date(block.requested_start_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Flexible'}
                          </span>
                          <span className="text-slate-500 block text-[10px]">
                            Until: {block.requested_end_time ? new Date(block.requested_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                          </span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-3 text-center whitespace-nowrap font-mono font-bold text-slate-800">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {block.duration_minutes}m ({Math.round((block.duration_minutes / 60) * 10) / 10}h)
                        </span>
                      </td>

                      {/* Department */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {getDeptBadge(block.lead_department_code)}
                      </td>

                      {/* Work Type */}
                      <td className="px-3 py-3">
                        <span className="font-semibold text-slate-800 block truncate max-w-[160px]" title={block.work_type}>
                          {block.work_type || 'Track Maintenance'}
                        </span>
                      </td>

                      {/* Affected Assets */}
                      <td className="px-3 py-3">
                        <span className="text-[11px] text-slate-600 block truncate max-w-[140px]" title={block.affected_assets}>
                          {block.affected_assets || 'Section Rail'}
                        </span>
                      </td>

                      {/* Affected Trains */}
                      <td className="px-3 py-3">
                        <span className="text-[11px] text-rose-600 font-medium block truncate max-w-[140px]" title={block.affected_trains}>
                          {block.affected_trains || 'Freight Gaps'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(block.status)}
                      </td>

                      {/* Approval Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getApprovalBadge(block.approval_status)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenDetail(block)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(block)}
                            className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Edit Block"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setBlockToDelete(block);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Block"
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
              <span>Showing {blocks.length} of {totalItems} blocks</span>
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

      {/* ================= MODAL 1: BLOCK DETAILS ================= */}
      {isDetailModalOpen && selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base">{selectedBlock.block_code}</h3>
                    {getStatusBadge(selectedBlock.status)}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">Section: {selectedBlock.section_code} • {selectedBlock.block_type} Block</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedBlock.work_type}</h4>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Sanctioned engineering work order on section {selectedBlock.section_code} under General and Subsidiary Rules (G&SR).
                </p>
              </div>

              {/* 11 Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Block Code</span>
                  <span className="font-bold text-blue-700 mt-0.5 block font-mono">{selectedBlock.block_code}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Lead Department</span>
                  <div className="mt-0.5">{getDeptBadge(selectedBlock.lead_department_code)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Section</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedBlock.section_code}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                  <span className="font-bold text-slate-900 mt-0.5 block font-mono">{selectedBlock.duration_minutes} minutes ({Math.round((selectedBlock.duration_minutes / 60) * 10) / 10} hours)</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Approval Status</span>
                  <div className="mt-0.5">{getApprovalBadge(selectedBlock.approval_status)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Possession Type</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedBlock.block_type}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Window Start Time</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedBlock.requested_start_time ? new Date(selectedBlock.requested_start_time).toLocaleString() : 'Flexible'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Window End Time</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedBlock.requested_end_time ? new Date(selectedBlock.requested_end_time).toLocaleString() : 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasks Bundled</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">{selectedBlock.total_tasks_count || 1} Work Orders</span>
                </div>
              </div>

              {/* Affected Assets & Trains Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                  <span className="font-bold text-amber-950 block">Affected Infrastructure Assets:</span>
                  <p className="text-[11px] text-amber-900 font-mono leading-relaxed">
                    {selectedBlock.affected_assets || 'TRK-60KG-842, SLP-PSC-120'}
                  </p>
                </div>
                <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                  <span className="font-bold text-rose-950 block">Affected Passenger/Freight Trains:</span>
                  <p className="text-[11px] text-rose-900 font-mono leading-relaxed">
                    {selectedBlock.affected_trains || '12002 (Shatabdi), 22436 (Vande Bharat)'}
                  </p>
                </div>
              </div>

              {/* Digital Signature Audit Stamp */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold text-emerald-950 block">DRM Sanctioned Digital Signature</span>
                    <span className="text-[10px] text-emerald-800 font-mono">Token: IR-AUTH-DRM-{selectedBlock.id}-8892</span>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px]">Validated</Badge>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedBlock);
                }}
              >
                Edit Block Window
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: REQUEST BLOCK ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Request Block Possession Window</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Section Code *</label>
                    <Input
                      required
                      placeholder="e.g. NDLS-TKD-UP or NGP-WR-UP"
                      value={formData.section_code}
                      onChange={(e) => setFormData({ ...formData, section_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Lead Department *</label>
                    <select
                      value={formData.lead_department_code}
                      onChange={(e) => setFormData({ ...formData, lead_department_code: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="ENG">Civil Engineering (ENG)</option>
                      <option value="SNT">Signal & Telecom (S&T)</option>
                      <option value="TRD">Traction Distribution (TRD)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Work Type *</label>
                    <Input
                      required
                      placeholder="e.g. Track Tamping & Dynamic Express Lining"
                      value={formData.work_type}
                      onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Possession Type</label>
                    <select
                      value={formData.block_type}
                      onChange={(e) => setFormData({ ...formData, block_type: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Traffic">Traffic Block</option>
                      <option value="Power">OHE Power Block</option>
                      <option value="Integrated">Integrated Shadow Block</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Window Start Time *</label>
                    <Input
                      type="datetime-local"
                      required
                      value={formData.requested_start_time}
                      onChange={(e) => setFormData({ ...formData, requested_start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Window End Time *</label>
                    <Input
                      type="datetime-local"
                      required
                      value={formData.requested_end_time}
                      onChange={(e) => setFormData({ ...formData, requested_end_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Duration (min)</label>
                    <Input
                      type="number"
                      min="30"
                      max="480"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Affected Assets</label>
                    <Input
                      placeholder="e.g. TRK-60KG-842, SLP-PSC-120"
                      value={formData.affected_assets}
                      onChange={(e) => setFormData({ ...formData, affected_assets: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Affected Trains (Delays/Regulated)</label>
                    <Input
                      placeholder="e.g. 12002 (Shatabdi), 22436 (Vande Bharat)"
                      value={formData.affected_trains}
                      onChange={(e) => setFormData({ ...formData, affected_trains: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Initial Category</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Upcoming">Upcoming Window</option>
                      <option value="Active">Active Possession</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Approval State</label>
                    <select
                      value={formData.approval_status}
                      onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Under Review">Under Review</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Scheduling...' : 'Schedule Block'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT BLOCK ================= */}
      {isEditModalOpen && blockToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Edit Block Window: {blockToEdit.block_code}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Work Type *</label>
                  <Input
                    required
                    value={formData.work_type}
                    onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Approval Status</label>
                    <select
                      value={formData.approval_status}
                      onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Start Time</label>
                    <Input
                      type="datetime-local"
                      value={formData.requested_start_time}
                      onChange={(e) => setFormData({ ...formData, requested_start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">End Time</label>
                    <Input
                      type="datetime-local"
                      value={formData.requested_end_time}
                      onChange={(e) => setFormData({ ...formData, requested_end_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Duration (min)</label>
                    <Input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Affected Assets</label>
                    <Input
                      value={formData.affected_assets}
                      onChange={(e) => setFormData({ ...formData, affected_assets: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Affected Trains</label>
                    <Input
                      value={formData.affected_trains}
                      onChange={(e) => setFormData({ ...formData, affected_trains: e.target.value })}
                    />
                  </div>
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

      {/* ================= MODAL 4: DELETE BLOCK ================= */}
      {isDeleteModalOpen && blockToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Remove Block Window?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to delete block <strong className="text-slate-900">{blockToDelete.block_code}</strong> on section {blockToDelete.section_code}?
              </p>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="critical" size="sm" disabled={actionLoading} onClick={handleDeleteConfirm}>
                {actionLoading ? 'Deleting...' : 'Confirm Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
