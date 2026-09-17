import React, { useEffect, useState, useCallback } from 'react';
import { 
  Train, 
  Search, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Edit2, 
  Trash2, 
  X, 
  Map as MapIcon, 
  List as ListIcon, 
  RefreshCw,
  Navigation,
  Gauge,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function TrainsView() {
  // Data state
  const [trains, setTrains] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [liveMapTrains, setLiveMapTrains] = useState([]);

  // Filter & Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('priority_level');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals state
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [trainToEdit, setTrainToEdit] = useState(null);
  const [trainToDelete, setTrainToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Form states
  const initialFormState = {
    train_no: '',
    train_name: '',
    train_type: 'Vande_Bharat',
    priority_level: 1,
    max_speed: 160,
    is_freight: false,
    origin: 'New Delhi (NDLS)',
    destination: 'Bhopal Junction (BPL)',
    route: 'NDLS - AGC - GWL - VGLJ - BPL',
    scheduled_departure: new Date(Date.now() + 3600000 * 2).toISOString().slice(0, 16),
    scheduled_arrival: new Date(Date.now() + 3600000 * 10).toISOString().slice(0, 16),
    delay_minutes: 0,
    status: 'On Time'
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await apiClient.get('/trains/statistics');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to load train statistics", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch live tracking for map
  const fetchLiveTracking = async () => {
    try {
      const res = await apiClient.get('/trains/live-tracking');
      setLiveMapTrains(res.data.trains || res.data || []);
    } catch (err) {
      console.error("Failed to load live map trains", err);
    }
  };

  // Fetch trains timetable
  const fetchTrains = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (typeFilter !== 'ALL') params.train_type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await apiClient.get('/trains', { params });
      if (res.data.items) {
        setTrains(res.data.items);
        setTotalPages(res.data.total_pages || 1);
        setTotalItems(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        setTrains(res.data);
        setTotalItems(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to load train timetable", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, typeFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchStats();
    fetchLiveTracking();
  }, []);

  useEffect(() => {
    fetchTrains();
  }, [fetchTrains]);

  const showNotification = (msg) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Handlers
  const handleOpenDetail = (train) => {
    setSelectedTrain(train);
    setIsDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    setFormData(initialFormState);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (train) => {
    setTrainToEdit(train);
    setFormData({
      train_no: train.train_no,
      train_name: train.train_name,
      train_type: train.train_type || 'Mail_Express',
      priority_level: train.priority_level || 3,
      max_speed: train.max_speed || 110,
      is_freight: train.is_freight || false,
      origin: train.origin || '',
      destination: train.destination || '',
      route: train.route || '',
      scheduled_departure: train.scheduled_departure ? new Date(train.scheduled_departure).toISOString().slice(0, 16) : '',
      scheduled_arrival: train.scheduled_arrival ? new Date(train.scheduled_arrival).toISOString().slice(0, 16) : '',
      delay_minutes: train.delay_minutes || 0,
      status: train.status || 'On Time'
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await apiClient.post('/trains', {
        ...formData,
        delay_minutes: parseInt(formData.delay_minutes) || 0,
        max_speed: parseInt(formData.max_speed) || 110,
        priority_level: parseInt(formData.priority_level) || 3
      });
      setIsCreateModalOpen(false);
      showNotification(`Train ${formData.train_no} added to operations timetable.`);
      fetchTrains();
      fetchStats();
    } catch (err) {
      console.error("Failed to create train", err);
      alert("Error adding train: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!trainToEdit) return;
    try {
      setActionLoading(true);
      await apiClient.put(`/trains/${trainToEdit.id}`, {
        ...formData,
        delay_minutes: parseInt(formData.delay_minutes) || 0,
        max_speed: parseInt(formData.max_speed) || 110,
        priority_level: parseInt(formData.priority_level) || 3
      });
      setIsEditModalOpen(false);
      showNotification(`Train ${trainToEdit.train_no} schedule updated.`);
      fetchTrains();
      fetchStats();
    } catch (err) {
      console.error("Failed to update train", err);
      alert("Error updating train: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!trainToDelete) return;
    try {
      setActionLoading(true);
      await apiClient.delete(`/trains/${trainToDelete.id}`);
      setIsDeleteModalOpen(false);
      showNotification(`Train ${trainToDelete.train_no} removed from timetable.`);
      setTrainToDelete(null);
      fetchTrains();
      fetchStats();
    } catch (err) {
      console.error("Failed to delete train", err);
      alert("Error deleting train: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Badge helpers
  const getDelayBadge = (delay) => {
    if (delay === 0 || delay <= 5) {
      return (
        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
          Right Time
        </span>
      );
    }
    if (delay <= 20) {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
          +{delay}m Regulated
        </span>
      );
    }
    return (
      <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
        +{delay}m Delayed
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'On Time':
        return <Badge variant="success">On Time</Badge>;
      case 'Running':
      case 'Departed':
        return <Badge variant="primary" className="animate-pulse bg-blue-600 text-white font-bold">Running</Badge>;
      case 'Delayed':
        return <Badge variant="critical">Delayed</Badge>;
      case 'Arrived':
        return <Badge variant="secondary">Arrived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type, isFreight) => {
    if (isFreight) return <Badge variant="warning" className="bg-yellow-100 text-yellow-900 border-yellow-300">Freight Rake</Badge>;
    if (type?.includes('Vande')) return <Badge variant="ai" className="bg-purple-100 text-purple-900 border-purple-300 font-bold">Vande Bharat</Badge>;
    if (type?.includes('Rajdhani')) return <Badge variant="critical" className="bg-rose-100 text-rose-900 border-rose-300 font-bold">Rajdhani</Badge>;
    if (type?.includes('Shatabdi')) return <Badge variant="primary" className="bg-blue-100 text-blue-900 border-blue-300 font-bold">Shatabdi</Badge>;
    return <Badge variant="secondary">Mail/Express</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Train className="w-6 h-6 text-blue-600" />
              <span>Train Operations & Timetable Control</span>
            </h2>
            <Badge variant="secondary" className="font-mono text-xs">
              COA GATEWAY
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Section schedules, punctuality telemetry, train regulation, and corridor path occupancy
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="warning" className="text-xs">
            SIMULATED DEMO DATA
          </Badge>
          {/* View Toggle */}
          <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              <span>Timetable</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition ${viewMode === 'map' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>GIS Map</span>
            </button>
          </div>

          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Train Schedule</span>
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Trains</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-slate-900">{stats?.total_trains ?? '...'}</span>
              <Train className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-[10px] text-slate-400">Timetabled runs</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">On-Time / RT</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-600">{stats?.on_time_count ?? '...'}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-[10px] text-slate-400">&lt;= 5m threshold</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Regulated / Delayed</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-600">{stats?.delayed_count ?? '...'}</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[10px] text-slate-400">Caution order / block clash</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block">Punctuality Rate</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-purple-600">{stats?.punctuality_rate_pct ?? '...'}%</span>
              <Gauge className="w-4 h-4 text-purple-500" />
            </div>
            <span className="text-[10px] text-slate-400">Target &gt; 92.0%</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white col-span-2 md:col-span-1">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">Goods / Freight</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-amber-600">{stats?.freight_count ?? '...'}</span>
              <Navigation className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-[10px] text-slate-400">Coal, POL, Container rakes</span>
          </CardContent>
        </Card>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filters & Search */}
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search train number, name, origin, destination, or route stops..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
                  >
                    <option value="ALL">All Train Types</option>
                    <option value="Vande_Bharat">Vande Bharat</option>
                    <option value="Rajdhani">Rajdhani</option>
                    <option value="Shatabdi">Shatabdi</option>
                    <option value="Mail_Express">Mail / Express</option>
                    <option value="Freight">Freight Special</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="On Time">On Time</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Running">Running</option>
                    <option value="Departed">Departed</option>
                    <option value="Arrived">Arrived</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
                  >
                    <option value="priority_level">Sort: Priority Level</option>
                    <option value="delay_minutes">Sort: Delay</option>
                    <option value="scheduled_departure">Sort: Sched Departure</option>
                    <option value="train_no">Sort: Train Number</option>
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
                      setTypeFilter('ALL');
                      setStatusFilter('ALL');
                      setSortBy('priority_level');
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

          {/* 12-Field Train Timetable Table */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 select-none">
                    <tr>
                      <th className="px-3 py-3">Train Number</th>
                      <th className="px-3 py-3">Train Name</th>
                      <th className="px-3 py-3">Train Type</th>
                      <th className="px-3 py-3">Origin & Destination</th>
                      <th className="px-3 py-3">Corridor Route</th>
                      <th className="px-3 py-3 text-center">Sched Dep / Arr</th>
                      <th className="px-3 py-3 text-center">Exp Dep / Arr</th>
                      <th className="px-3 py-3 text-center">Delay</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="text-center py-12 text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                          Loading train timetable...
                        </td>
                      </tr>
                    ) : trains.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-12 text-slate-400">
                          No train operations match your search criteria.
                        </td>
                      </tr>
                    ) : (
                      trains.map((train) => (
                        <tr key={train.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Train Number */}
                          <td className="px-3 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                            {train.train_no}
                          </td>

                          {/* Train Name */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900 block" title={train.train_name}>
                              {train.train_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Prio: {train.priority_level} • Max {train.max_speed} km/h
                            </span>
                          </td>

                          {/* Train Type */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            {getTypeBadge(train.train_type, train.is_freight)}
                          </td>

                          {/* Origin & Destination */}
                          <td className="px-3 py-3">
                            <div className="space-y-0.5 max-w-[170px]">
                              <span className="font-semibold text-slate-800 block truncate" title={train.origin}>
                                From: {train.origin || 'NDLS'}
                              </span>
                              <span className="text-[11px] text-slate-500 block truncate" title={train.destination}>
                                To: {train.destination || 'BPL'}
                              </span>
                            </div>
                          </td>

                          {/* Corridor Route */}
                          <td className="px-3 py-3">
                            <span className="text-[11px] text-slate-600 block truncate max-w-[180px]" title={train.route}>
                              {train.route || 'Main Trunk Route'}
                            </span>
                          </td>

                          {/* Sched Dep / Arr */}
                          <td className="px-3 py-3 text-center whitespace-nowrap font-mono text-[11px]">
                            <div className="space-y-0.5">
                              <span className="text-slate-800 font-semibold block">
                                Dep: {train.scheduled_departure ? new Date(train.scheduled_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                              <span className="text-slate-500 block text-[10px]">
                                Arr: {train.scheduled_arrival ? new Date(train.scheduled_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                            </div>
                          </td>

                          {/* Exp Dep / Arr */}
                          <td className="px-3 py-3 text-center whitespace-nowrap font-mono text-[11px]">
                            <div className="space-y-0.5">
                              <span className={`font-semibold block ${train.delay_minutes > 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                                Dep: {train.expected_departure ? new Date(train.expected_departure).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                              <span className={`block text-[10px] ${train.delay_minutes > 5 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                                Arr: {train.expected_arrival ? new Date(train.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </span>
                            </div>
                          </td>

                          {/* Delay */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {getDelayBadge(train.delay_minutes)}
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {getStatusBadge(train.status)}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenDetail(train)}
                                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(train)}
                                className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                                title="Edit Timetable"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setTrainToDelete(train);
                                  setIsDeleteModalOpen(true);
                                }}
                                className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Train"
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
                  <span>Showing {trains.length} of {totalItems} trains</span>
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
        </>
      ) : (
        /* GIS Map View */
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Live Indian Railways Corridor GPS Telemetry</span>
              </CardTitle>
              <p className="text-xs text-slate-500">Real-time GPS coordinates of active passenger and freight rakes</p>
            </div>
            <Badge variant="ai" className="text-[10px]">COA Telemetry Active</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[520px] w-full relative">
              <MapContainer 
                center={[21.1458, 79.0882]} 
                zoom={7} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {liveMapTrains.map((tr, idx) => {
                  const lat = tr.lat || (21.1458 + (idx * 0.15) - 0.5);
                  const lng = tr.lng || (79.0882 + (idx * 0.12) - 0.4);
                  return (
                    <Marker key={idx} position={[lat, lng]}>
                      <Popup>
                        <div className="text-xs space-y-1">
                          <strong className="text-blue-700 block">{tr.train_no} - {tr.train_name}</strong>
                          <p className="text-slate-600">Speed: {tr.speed_kmh || 95} km/h • Delay: +{tr.delay_minutes || 0}m</p>
                          <span className="text-emerald-600 font-bold block">{tr.status || 'Running'}</span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================= MODAL 1: TRAIN DETAILS ================= */}
      {isDetailModalOpen && selectedTrain && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Train className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-base">{selectedTrain.train_no} - {selectedTrain.train_name}</h3>
                    {getStatusBadge(selectedTrain.status)}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedTrain.train_type} • Priority {selectedTrain.priority_level}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Route Banner */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between font-bold text-blue-950">
                  <span>{selectedTrain.origin}</span>
                  <span className="text-blue-400">➔</span>
                  <span>{selectedTrain.destination}</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  <strong>Corridor Route:</strong> {selectedTrain.route}
                </p>
              </div>

              {/* 12 Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Train Number</span>
                  <span className="font-bold text-blue-700 mt-0.5 block font-mono">{selectedTrain.train_no}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Train Name</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">{selectedTrain.train_name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Train Type</span>
                  <div className="mt-0.5">{getTypeBadge(selectedTrain.train_type, selectedTrain.is_freight)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Max Speed</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">{selectedTrain.max_speed} km/h</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Delay</span>
                  <div className="mt-0.5">{getDelayBadge(selectedTrain.delay_minutes)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                  <div className="mt-0.5">{getStatusBadge(selectedTrain.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Scheduled Departure</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedTrain.scheduled_departure ? new Date(selectedTrain.scheduled_departure).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Scheduled Arrival</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                    {selectedTrain.scheduled_arrival ? new Date(selectedTrain.scheduled_arrival).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Expected Arrival</span>
                  <span className="font-bold text-rose-600 mt-0.5 block font-mono">
                    {selectedTrain.expected_arrival ? new Date(selectedTrain.expected_arrival).toLocaleString() : 'N/A'}
                  </span>
                </div>
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
                  handleOpenEdit(selectedTrain);
                }}
              >
                Edit Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD TRAIN ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base">Add Train to Timetable</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Train Number *</label>
                    <Input
                      required
                      placeholder="e.g. 12002 or 22436"
                      value={formData.train_no}
                      onChange={(e) => setFormData({ ...formData, train_no: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Train Name *</label>
                    <Input
                      required
                      placeholder="e.g. Bhopal Shatabdi Express"
                      value={formData.train_name}
                      onChange={(e) => setFormData({ ...formData, train_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Train Type *</label>
                    <select
                      value={formData.train_type}
                      onChange={(e) => setFormData({ ...formData, train_type: e.target.value, is_freight: e.target.value === 'Freight' })}
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800"
                    >
                      <option value="Vande_Bharat">Vande Bharat</option>
                      <option value="Rajdhani">Rajdhani Express</option>
                      <option value="Shatabdi">Shatabdi Express</option>
                      <option value="Mail_Express">Mail / Express</option>
                      <option value="Freight">Freight Special</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Priority Level (1-5)</label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.priority_level}
                      onChange={(e) => setFormData({ ...formData, priority_level: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Max Speed (km/h)</label>
                    <Input
                      type="number"
                      value={formData.max_speed}
                      onChange={(e) => setFormData({ ...formData, max_speed: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Origin Station *</label>
                    <Input
                      required
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Destination Station *</label>
                    <Input
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Corridor Route Stops</label>
                  <Input
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Scheduled Departure</label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_departure}
                      onChange={(e) => setFormData({ ...formData, scheduled_departure: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Scheduled Arrival</label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduled_arrival}
                      onChange={(e) => setFormData({ ...formData, scheduled_arrival: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Adding...' : 'Add Train'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT TRAIN ================= */}
      {isEditModalOpen && trainToEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Edit Train Timetable: {trainToEdit.train_no}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Train Name *</label>
                  <Input
                    required
                    value={formData.train_name}
                    onChange={(e) => setFormData({ ...formData, train_name: e.target.value })}
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
                      <option value="On Time">On Time</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Running">Running</option>
                      <option value="Departed">Departed</option>
                      <option value="Arrived">Arrived</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Delay (Minutes)</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.delay_minutes}
                      onChange={(e) => setFormData({ ...formData, delay_minutes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Origin</label>
                    <Input
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Destination</label>
                    <Input
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Route</label>
                  <Input
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
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

      {/* ================= MODAL 4: DELETE TRAIN ================= */}
      {isDeleteModalOpen && trainToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900">Remove Train from Timetable?</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to remove <strong className="text-slate-900">{trainToDelete.train_no}</strong> ({trainToDelete.train_name})?
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
