import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Wrench, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Zap, 
  Layers, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  X,
  Calendar,
  ShieldAlert,
  HardHat,
  Train,
  Check,
  RefreshCw,
  Lock
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function MaintenanceView() {
  const { activeUser } = useOutletContext() || {};

  const currentRole = (activeUser?.canonical_role || activeUser?.role || localStorage.getItem('ir_user_role') || 'ENGINEERING').toUpperCase();
  const userDept = (activeUser?.department || localStorage.getItem('ir_user_dept') || 'ENG').toUpperCase();
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'ADMINISTRATOR';

  // Data state
  const [tasks, setTasks] = useState([]);
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [criticalityFilter, setCriticalityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    if (!isAdmin) {
      setDepartmentFilter(userDept);
    }
  }, [isAdmin, userDept]);

  // Modals state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Form states
  const initialFormState = {
    title: '',
    department_code: 'ENG',
    location: '',
    task_type: 'Track Tamping & Lining',
    description: '',
    criticality: 'High',
    urgency: 'Within 24 Hours',
    safety_impact: 'Speed Restriction Imposed',
    estimated_duration_minutes: 120,
    required_resources: '1x 09-3X Tamping Machine, 15 Trackmen',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16),
    status: 'Pending',
    required_track_possession: true,
    required_power_block: false,
    required_traffic_block: true
  };

  const [formData, setFormData] = useState(initialFormState);

  // Load stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.get('/maintenance/statistics');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load maintenance statistics", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load tasks
  const fetchTasks = useCallback(async () => {
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
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (criticalityFilter !== 'ALL') params.criticality = criticalityFilter;

      const res = await apiClient.get('/maintenance/tasks', { params });
      if (res.data.items) {
        setTasks(res.data.items);
        setTotalPages(res.data.total_pages || 1);
        setTotalItems(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        setTasks(res.data);
        setTotalItems(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load maintenance tasks", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, departmentFilter, statusFilter, criticalityFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const showNotification = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Handlers
  const handleOpenDetail = (task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setTaskToEdit(task);
    setFormData({
      title: task.title,
      department_code: task.department_code || 'ENG',
      location: task.location || '',
      task_type: task.task_type || 'Track Maintenance',
      description: task.description || '',
      criticality: task.criticality || 'Medium',
      urgency: task.urgency || 'Within 3 Days',
      safety_impact: task.safety_impact || 'Low',
      estimated_duration_minutes: task.estimated_duration_minutes || 120,
      required_resources: task.required_resources || '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : '',
      status: task.status || 'Pending',
      required_track_possession: task.required_track_possession ?? true,
      required_power_block: task.required_power_block ?? false,
      required_traffic_block: task.required_traffic_block ?? true
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient.post('/maintenance/tasks', {
        ...formData,
        estimated_duration_minutes: parseInt(formData.estimated_duration_minutes) || 120
      });
      setIsCreateModalOpen(false);
      showNotification("Maintenance task successfully scheduled.");
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error("Failed to create task", err);
      alert("Error creating maintenance task: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!taskToEdit) return;
    try {
      setActionLoading(true);
      await apiClient.put(`/maintenance/tasks/${taskToEdit.id}`, {
        ...formData,
        estimated_duration_minutes: parseInt(formData.estimated_duration_minutes) || 120
      });
      setIsEditModalOpen(false);
      showNotification(`Task ${taskToEdit.task_code} updated successfully.`);
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error("Failed to update task", err);
      alert("Error updating task: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/maintenance/tasks/${taskToDelete.id}`);
      setIsDeleteModalOpen(false);
      showNotification(`Task ${taskToDelete.task_code} deleted successfully.`);
      setTaskToDelete(null);
      fetchTasks();
      fetchStats();
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("Error deleting task: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Badge helpers
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
        return <Badge variant="secondary">{code}</Badge>;
    }
  };

  const getCriticalityBadge = (crit) => {
    switch (crit) {
      case 'Critical':
        return <Badge variant="critical" className="bg-rose-100 text-rose-800 border-rose-300 font-bold">Critical</Badge>;
      case 'High':
        return <Badge variant="warning" className="bg-orange-100 text-orange-800 border-orange-300 font-semibold">High</Badge>;
      case 'Medium':
        return <Badge variant="primary" className="bg-blue-100 text-blue-800 border-blue-300">Medium</Badge>;
      default:
        return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In_Progress':
        return <Badge variant="primary" className="animate-pulse bg-blue-600 text-white font-bold">In Progress</Badge>;
      case 'Completed':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 border-emerald-300">Completed</Badge>;
      case 'Scheduled':
        return <Badge variant="ai" className="bg-purple-100 text-purple-800 border-purple-300">Scheduled</Badge>;
      case 'Cancelled':
        return <Badge variant="secondary" className="line-through">Cancelled</Badge>;
      default:
        return <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-300">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Wrench className="w-6 h-6 text-blue-600" />
              <span>Maintenance Work Orders Management</span>
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              SIH26027
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track possessions, power blocks, resource assignments, and multi-department work order lifecycle
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
            <span>Create Maintenance Task</span>
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Statistics Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Tasks</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats?.total_tasks ?? '...'}</span>
              <Wrench className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] text-slate-400">All departments</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Pending Sanction</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600">{stats?.pending_count ?? '...'}</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] text-slate-400">Awaiting block slot</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Scheduled</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-purple-600">{stats?.scheduled_count ?? '...'}</span>
              <Calendar className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-[10px] text-slate-400">Window approved</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">In Progress</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-600">{stats?.in_progress_count ?? '...'}</span>
              <HardHat className="w-4 h-4 text-blue-500 animate-bounce" />
            </div>
            <span className="text-[10px] text-slate-400">Track occupied</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white col-span-2 md:col-span-1">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Critical / High</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-600">
                {(stats?.critical_count || 0) + (stats?.high_count || 0)}
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] text-slate-400">{stats?.critical_count ?? 0} emergency</span>
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
                placeholder="Search Task ID, title, description, location, or task type..."
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
                  className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Departments</option>
                  <option value="ENG">Civil (ENG)</option>
                  <option value="SNT">Signal (S&T)</option>
                  <option value="TRD">Traction (TRD)</option>
                </select>
              ) : (
                <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{userDept === 'ENG' ? 'Civil (ENG)' : userDept === 'TRD' ? 'Traction (TRD)' : 'Signal (S&T)'}</span>
                </div>
              )}

              {/* Status */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In_Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              {/* Criticality */}
              <select
                value={criticalityFilter}
                onChange={(e) => { setCriticalityFilter(e.target.value); setPage(1); }}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Criticality</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="id">Sort: Default (Newest)</option>
                <option value="due_date">Sort: Due Date</option>
                <option value="estimated_duration_minutes">Sort: Duration</option>
                <option value="criticality">Sort: Criticality</option>
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
                  setStatusFilter('ALL');
                  setCriticalityFilter('ALL');
                  setSortBy('id');
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

      {/* Main Data Table */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th className="px-3 py-3">Task ID</th>
                  <th className="px-3 py-3">Asset & Department</th>
                  <th className="px-3 py-3">Location & Section</th>
                  <th className="px-3 py-3">Task Type & Description</th>
                  <th className="px-3 py-3 text-center">Criticality</th>
                  <th className="px-3 py-3">Urgency & Safety</th>
                  <th className="px-3 py-3 text-center">Duration</th>
                  <th className="px-3 py-3">Required Resources</th>
                  <th className="px-3 py-3">Due Date</th>
                  <th className="px-3 py-3 text-center">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                      Loading maintenance work orders...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400">
                      No maintenance tasks match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Task ID */}
                      <td className="px-3 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {task.task_code}
                      </td>

                      {/* Asset & Department */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 block truncate max-w-[130px]" title={task.asset_name || task.asset_code || 'General Track'}>
                            {task.asset_code || 'TRK-GEN'}
                          </span>
                          {getDeptBadge(task.department_code)}
                        </div>
                      </td>

                      {/* Location & Section */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 max-w-[160px]">
                          <span className="font-semibold text-slate-800 block truncate" title={task.location}>
                            {task.location || 'Nagpur Division'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Sec: {task.section_code || 'NGP-WR'}
                          </span>
                        </div>
                      </td>

                      {/* Task Type & Description */}
                      <td className="px-3 py-3">
                        <div className="space-y-0.5 max-w-[200px]">
                          <span className="font-bold text-slate-900 block truncate" title={task.title}>
                            {task.task_type || task.title}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate" title={task.description}>
                            {task.description || task.title}
                          </span>
                        </div>
                      </td>

                      {/* Criticality */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getCriticalityBadge(task.criticality)}
                      </td>

                      {/* Urgency & Safety Impact */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="space-y-0.5 text-[11px]">
                          <span className="font-semibold text-slate-700 block">{task.urgency || 'Routine'}</span>
                          <span className="text-[10px] text-rose-600 font-medium block truncate max-w-[120px]" title={task.safety_impact}>
                            {task.safety_impact || 'Low'}
                          </span>
                        </div>
                      </td>

                      {/* Estimated Duration */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {task.estimated_duration_minutes}m ({Math.round((task.estimated_duration_minutes / 60) * 10) / 10}h)
                        </span>
                      </td>

                      {/* Required Resources */}
                      <td className="px-3 py-3">
                        <span className="text-[11px] text-slate-600 block truncate max-w-[140px]" title={task.required_resources}>
                          {task.required_resources || 'P-Way Gang'}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 text-[11px] font-mono">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Flexible'}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenDetail(task)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(task)}
                            className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Edit Task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setTaskToDelete(task);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Task"
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
              <span>Showing {tasks.length} of {totalItems} tasks</span>
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

      {/* ================= MODAL 1: TASK DETAILS ================= */}
      {isDetailModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base">{selectedTask.task_code}</h3>
                    {getStatusBadge(selectedTask.status)}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedTask.task_type || 'Track Work Order'}</p>
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
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{selectedTask.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedTask.description || 'No detailed work description specified.'}</p>
              </div>

              {/* 13 Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedTask.department_code}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Asset Code</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedTask.asset_code || 'General Track'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Section</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedTask.section_code || 'NGP-WR'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedTask.location}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Criticality</span>
                  <div className="mt-0.5">{getCriticalityBadge(selectedTask.criticality)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Urgency</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedTask.urgency || 'Routine'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Safety Impact</span>
                  <span className="font-semibold text-rose-600 mt-0.5 block">{selectedTask.safety_impact || 'Low'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Duration</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">{selectedTask.estimated_duration_minutes} minutes</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Due Date</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Resource & Block Requirements */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 block uppercase tracking-wider">Required Machinery & G&SR Possessions</span>
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Assigned Track Machines / Gangs:</span>
                    <span className="font-bold text-slate-900">{selectedTask.required_resources || 'Manual Trackman Gang'}</span>
                  </div>
                  <div className="flex items-center space-x-4 pt-1 border-t border-blue-100">
                    <span className={`inline-flex items-center text-[11px] font-semibold ${selectedTask.required_track_possession ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Track Possession
                    </span>
                    <span className={`inline-flex items-center text-[11px] font-semibold ${selectedTask.required_power_block ? 'text-amber-700' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5 mr-1" /> OHE Power Block
                    </span>
                    <span className={`inline-flex items-center text-[11px] font-semibold ${selectedTask.required_traffic_block ? 'text-blue-700' : 'text-slate-400'}`}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Traffic Block
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenEdit(selectedTask);
                }}
              >
                Edit Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CREATE TASK ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Create New Maintenance Task</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Task Title / Work Order Name *</label>
                  <Input
                    required
                    placeholder="e.g. Ultrasonic USFD Flaw Clamping & Tamping"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Department Branch *</label>
                    <select
                      value={formData.department_code}
                      onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="ENG">Civil Engineering (P-Way)</option>
                      <option value="SNT">Signal & Telecom (S&T)</option>
                      <option value="TRD">Traction Distribution (TRD)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Task Type *</label>
                    <select
                      value={formData.task_type}
                      onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Track Tamping & Lining">Track Tamping & Lining</option>
                      <option value="Deep Ballast Screening (BCM)">Deep Ballast Screening (BCM)</option>
                      <option value="Rail Weld Flaw Replacement">Rail Weld Flaw Replacement</option>
                      <option value="Turnout & Point Overhaul">Turnout & Point Overhaul</option>
                      <option value="OHE Catenary Sag Adjustment">OHE Catenary Sag Adjustment</option>
                      <option value="Relay Interlocking Testing">Relay Interlocking Testing</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Location (KM / Section) *</label>
                    <Input
                      required
                      placeholder="e.g. KM 842/12 - 845/00, Wardha - Sevagram"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Estimated Duration (Minutes) *</label>
                    <Input
                      type="number"
                      min="15"
                      max="480"
                      required
                      value={formData.estimated_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Criticality</label>
                    <select
                      value={formData.criticality}
                      onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Urgency</label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Immediate">Immediate</option>
                      <option value="Within 24 Hours">Within 24 Hours</option>
                      <option value="Within 3 Days">Within 3 Days</option>
                      <option value="Routine">Routine Scheduled</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Safety Impact</label>
                    <select
                      value={formData.safety_impact}
                      onChange={(e) => setFormData({ ...formData, safety_impact: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Derailment Risk">Derailment Risk</option>
                      <option value="Speed Restriction Imposed">Speed Restriction Imposed</option>
                      <option value="Signal Failure Risk">Signal Failure Risk</option>
                      <option value="OHE Tripping Risk">OHE Tripping Risk</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Required Track Machinery / Gangs</label>
                  <Input
                    placeholder="e.g. 1x 09-3X Tamping Machine, 15 P-Way Gang"
                    value={formData.required_resources}
                    onChange={(e) => setFormData({ ...formData, required_resources: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Due Date Target</label>
                    <Input
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Pending">Pending Sanction</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="In_Progress">In Progress</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Detailed Work Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide execution details, safety precautions, and supervisor remarks..."
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
                  {actionLoading ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT TASK ================= */}
      {isEditModalOpen && taskToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Edit Maintenance Task: {taskToEdit.task_code}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Task Title *</label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Status *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Scheduled">Scheduled</option>
                      <option value="In_Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Estimated Duration (Minutes)</label>
                    <Input
                      type="number"
                      value={formData.estimated_duration_minutes}
                      onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
                    />
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
                    <label className="font-bold text-slate-700 block mb-1">Required Resources</label>
                    <Input
                      value={formData.required_resources}
                      onChange={(e) => setFormData({ ...formData, required_resources: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Criticality</label>
                    <select
                      value={formData.criticality}
                      onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Urgency</label>
                    <select
                      value={formData.urgency}
                      onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Immediate">Immediate</option>
                      <option value="Within 24 Hours">Within 24 Hours</option>
                      <option value="Within 3 Days">Within 3 Days</option>
                      <option value="Routine">Routine</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Safety Impact</label>
                    <select
                      value={formData.safety_impact}
                      onChange={(e) => setFormData({ ...formData, safety_impact: e.target.value })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Derailment Risk">Derailment Risk</option>
                      <option value="Speed Restriction Imposed">Speed Restriction Imposed</option>
                      <option value="Signal Failure Risk">Signal Failure Risk</option>
                      <option value="OHE Tripping Risk">OHE Tripping Risk</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description / Log Remarks</label>
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

      {/* ================= MODAL 4: DELETE CONFIRMATION ================= */}
      {isDeleteModalOpen && taskToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Delete Maintenance Task?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{taskToDelete.task_code}</strong> ({taskToDelete.title})? This action cannot be undone.
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
