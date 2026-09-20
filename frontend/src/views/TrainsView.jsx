import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
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
  Sparkles,
  Cpu,
  ShieldCheck,
  Wrench,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function TrainsView() {
  const { activeUser } = useOutletContext() || {};
  const currentRole = (activeUser?.canonical_role || activeUser?.role || localStorage.getItem('ir_user_role') || 'CONTROL_OFFICE').toUpperCase();

  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) {
        return timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
      }
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return '--:--';
    }
  };


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

  // Train Delay ML Predictor Modal state
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);
  const [delayLoading, setDelayLoading] = useState(false);
  const [delayResult, setDelayResult] = useState(null);
  const [delayError, setDelayError] = useState(null);
  const [delaySelectedTrain, setDelaySelectedTrain] = useState(null);
  const [delayFormData, setDelayFormData] = useState({
    rainfall_mm: 15.0,
    humidity_percent: 65.0,
    ambient_temperature_c: 30.0,
    average_speed_kmph: 75.0,
    distance_travelled_km: 350000,
    train_age_years: 8,
    last_maintenance_days: 45,
    season: 'Monsoon',
    region: 'Northern Railway',
    train_type: 'Express',
    scheduled_arrival: ''
  });

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

  const handleOpenDelayPredictor = (train = null) => {
    setDelaySelectedTrain(train);
    if (train) {
      const mappedType = train.is_freight 
        ? 'Freight' 
        : (train.train_type?.includes('Vande') || train.train_type?.includes('Rajdhani') || train.train_type?.includes('Shatabdi')) 
        ? 'Express' 
        : (train.train_type || 'Express');
      
      const schedArr = train.scheduled_arrival ? new Date(train.scheduled_arrival).toISOString().slice(0, 16) : '';
      setDelayFormData({
        rainfall_mm: 15.0,
        humidity_percent: 65.0,
        ambient_temperature_c: 30.0,
        average_speed_kmph: train.max_speed ? Math.round(train.max_speed * 0.75) : 75.0,
        distance_travelled_km: 350000,
        train_age_years: 8,
        last_maintenance_days: 45,
        season: 'Monsoon',
        region: 'Northern Railway',
        train_type: mappedType,
        scheduled_arrival: schedArr
      });
    }
    setDelayResult(null);
    setDelayError(null);
    setIsDelayModalOpen(true);
  };

  const handleRunDelayPrediction = async (e) => {
    if (e) e.preventDefault();
    try {
      setDelayLoading(true);
      setDelayError(null);
      
      const payload = {
        rainfall_mm: delayFormData.rainfall_mm !== '' ? parseFloat(delayFormData.rainfall_mm) : null,
        humidity_percent: delayFormData.humidity_percent !== '' ? parseFloat(delayFormData.humidity_percent) : null,
        ambient_temperature_c: delayFormData.ambient_temperature_c !== '' ? parseFloat(delayFormData.ambient_temperature_c) : null,
        average_speed_kmph: delayFormData.average_speed_kmph !== '' ? parseFloat(delayFormData.average_speed_kmph) : null,
        distance_travelled_km: delayFormData.distance_travelled_km !== '' ? parseFloat(delayFormData.distance_travelled_km) : null,
        train_age_years: delayFormData.train_age_years !== '' ? parseFloat(delayFormData.train_age_years) : null,
        last_maintenance_days: delayFormData.last_maintenance_days !== '' ? parseFloat(delayFormData.last_maintenance_days) : null,
        season: delayFormData.season || 'Monsoon',
        region: delayFormData.region || 'Northern Railway',
        train_type: delayFormData.train_type || 'Express',
        scheduled_arrival: delayFormData.scheduled_arrival ? new Date(delayFormData.scheduled_arrival).toISOString() : null
      };

      if (delaySelectedTrain) {
        payload.train_no = delaySelectedTrain.train_no;
        payload.train_id = delaySelectedTrain.id;
      }

      const res = await apiClient.post('/ai/train-delay-prediction', payload);
      setDelayResult(res.data);
    } catch (err) {
      console.error("Train delay prediction failed:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to execute train delay ML prediction";
      setDelayError(detail);
    } finally {
      setDelayLoading(false);
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
            variant="outline" 
            size="sm" 
            onClick={() => handleOpenDelayPredictor()}
            className="flex items-center space-x-1.5 border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>AI Delay / ETA Predictor</span>
          </Button>

          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
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
                                Dep: {formatTime(train.scheduled_departure)}
                              </span>
                              <span className="text-slate-500 block text-[10px]">
                                Arr: {formatTime(train.scheduled_arrival)}
                              </span>
                            </div>
                          </td>

                          {/* Exp Dep / Arr */}
                          <td className="px-3 py-3 text-center whitespace-nowrap font-mono text-[11px]">
                            <div className="space-y-0.5">
                              <span className={`font-semibold block ${train.delay_minutes > 5 ? 'text-amber-600' : 'text-slate-800'}`}>
                                Dep: {formatTime(train.expected_departure)}
                              </span>
                              <span className={`block text-[10px] ${train.delay_minutes > 5 ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                                Arr: {formatTime(train.expected_arrival)}
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
                                onClick={() => handleOpenDelayPredictor(train)}
                                className="p-1 rounded text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition cursor-pointer"
                                title="Predict Delay & ETA via ML"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>
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
              <p className="text-xs text-slate-500">Real-time GPS coordinates of active passenger and freight rakes across Central & Northern Trunk Corridors</p>
            </div>
            <Badge variant="ai" className="text-[10px]">COA Telemetry Active</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[560px] w-full relative">
              <MapContainer 
                center={[25.4484, 78.5685]} 
                zoom={6} 
                style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
                  url={`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${import.meta.env.VITE_MAP_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`}
                />

                {/* Trunk Corridor Railway Lines */}
                <Polyline
                  positions={[
                    [28.6430, 77.2194], // NDLS
                    [28.5085, 77.2847], // TKD
                    [28.1487, 77.3320], // PWL
                    [27.4924, 77.6737], // MTJ
                    [27.1591, 78.0081], // AGC
                    [26.2183, 78.1828], // GWL
                    [25.4484, 78.5685], // VGLJ
                    [24.1714, 78.1866], // BINA
                    [23.2599, 77.4126], // BPL
                    [22.6120, 77.7641], // ET
                    [21.1524, 79.0882]  // NGP
                  ]}
                  color="#2563eb"
                  weight={5}
                  opacity={0.85}
                />
                <Polyline
                  positions={[
                    [28.6430, 77.2194], // NDLS
                    [26.4547, 80.3507], // CNB
                    [25.4358, 81.8463], // PRYJ
                    [25.2818, 83.1186], // DDU
                    [25.3262, 82.9866]  // BSB
                  ]}
                  color="#7c3aed"
                  weight={5}
                  opacity={0.85}
                />

                {/* Major Junction Station Pins */}
                {[
                  { name: "New Delhi (NDLS)", coords: [28.6430, 77.2194] },
                  { name: "Agra Cantt (AGC)", coords: [27.1591, 78.0081] },
                  { name: "Gwalior (GWL)", coords: [26.2183, 78.1828] },
                  { name: "VGL Jhansi (VGLJ)", coords: [25.4484, 78.5685] },
                  { name: "Bhopal (BPL)", coords: [23.2599, 77.4126] },
                  { name: "Itarsi (ET)", coords: [22.6120, 77.7641] },
                  { name: "Nagpur (NGP)", coords: [21.1524, 79.0882] },
                  { name: "Kanpur (CNB)", coords: [26.4547, 80.3507] },
                  { name: "Prayagraj (PRYJ)", coords: [25.4358, 81.8463] },
                  { name: "DDU Junction", coords: [25.2818, 83.1186] }
                ].map((st, i) => (
                  <Marker key={`st-${i}`} position={st.coords}>
                    <Popup>
                      <div className="text-xs font-bold text-emerald-800">
                        Station: {st.name}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Active Live Trains Positions */}
                {liveMapTrains.map((tr, idx) => {
                  const lat = tr.lat || (28.6430 - (idx % 10) * 0.7);
                  const lng = tr.lng || (77.2194 + (idx % 8) * 0.6);
                  return (
                    <Marker key={`tr-${idx}`} position={[lat, lng]}>
                      <Popup>
                        <div className="text-xs space-y-1.5 p-0.5">
                          <div className="font-bold text-blue-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                            <span>{tr.train_no} - {tr.train_name}</span>
                          </div>
                          <p className="text-slate-600 font-mono">
                            Section: <strong>{tr.current_section || 'Trunk'}</strong><br />
                            Speed: <strong>{tr.current_speed_kmh || tr.speed_kmh || 95} km/h</strong><br />
                            Delay: <strong className={tr.delay_minutes > 5 ? 'text-rose-600' : 'text-emerald-600'}>+{tr.delay_minutes || 0}m</strong>
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {tr.train_type || 'Express'}
                            </span>
                            <span className="text-emerald-600 font-extrabold text-[10px] uppercase">
                              {tr.status || tr.punctuality_status || 'Running'}
                            </span>
                          </div>
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
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleOpenDelayPredictor(selectedTrain);
                }}
                className="border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                Predict Delay / ETA
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

      {/* ================= MODAL 5: AI TRAIN DELAY & ETA PREDICTOR ================= */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>AI Train Delay & ETA Predictor</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono border border-purple-400/30">
                      Real ML Pipeline
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {delaySelectedTrain ? `${delaySelectedTrain.train_no} • ${delaySelectedTrain.train_name}` : 'Multi-Factor Corridor Operational & Environmental Inference'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDelayModalOpen(false)} 
                className="p-1 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Input Form */}
              <form onSubmit={handleRunDelayPrediction} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    Input Environmental & Operational Parameters
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    POST /api/v1/ai/train-delay-prediction
                  </span>
                </div>

                {/* Grid 1: Environmental & Context */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Season</label>
                    <select
                      value={delayFormData.season}
                      onChange={(e) => setDelayFormData({ ...delayFormData, season: e.target.value })}
                      className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    >
                      <option value="Monsoon">Monsoon (Heavy Rain)</option>
                      <option value="Summer">Summer</option>
                      <option value="Winter">Winter (Foggy)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Zonal Region</label>
                    <select
                      value={delayFormData.region}
                      onChange={(e) => setDelayFormData({ ...delayFormData, region: e.target.value })}
                      className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    >
                      <option value="Northern Railway">Northern Railway (NR)</option>
                      <option value="Western Railway">Western Railway (WR)</option>
                      <option value="Central Railway">Central Railway (CR)</option>
                      <option value="Eastern Railway">Eastern Railway (ER)</option>
                      <option value="Southern Railway">Southern Railway (SR)</option>
                      <option value="South Central Railway">South Central Railway (SCR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Rainfall (mm)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={delayFormData.rainfall_mm}
                      onChange={(e) => setDelayFormData({ ...delayFormData, rainfall_mm: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Humidity (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={delayFormData.humidity_percent}
                      onChange={(e) => setDelayFormData({ ...delayFormData, humidity_percent: e.target.value })}
                    />
                  </div>
                </div>

                {/* Grid 2: Operational & Rolling Stock */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Train Classification</label>
                    <select
                      value={delayFormData.train_type}
                      onChange={(e) => setDelayFormData({ ...delayFormData, train_type: e.target.value })}
                      className="w-full border border-slate-300 bg-white rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                    >
                      <option value="Express">Express / Superfast</option>
                      <option value="Passenger">Passenger Ordinary</option>
                      <option value="Freight">Freight Rake (Goods)</option>
                      <option value="Metro">Suburban / Metro</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Avg Speed (km/h)</label>
                    <Input
                      type="number"
                      step="1"
                      min="10"
                      max="160"
                      value={delayFormData.average_speed_kmph}
                      onChange={(e) => setDelayFormData({ ...delayFormData, average_speed_kmph: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Ambient Temp (°C)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={delayFormData.ambient_temperature_c}
                      onChange={(e) => setDelayFormData({ ...delayFormData, ambient_temperature_c: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Trip Distance (km)</label>
                    <Input
                      type="number"
                      step="1000"
                      min="0"
                      value={delayFormData.distance_travelled_km}
                      onChange={(e) => setDelayFormData({ ...delayFormData, distance_travelled_km: e.target.value })}
                    />
                  </div>
                </div>

                {/* Grid 3: Maintenance & Optional Timetable */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Train Age (years)</label>
                    <Input
                      type="number"
                      min="1"
                      max="35"
                      value={delayFormData.train_age_years}
                      onChange={(e) => setDelayFormData({ ...delayFormData, train_age_years: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Days Since Overhaul</label>
                    <Input
                      type="number"
                      min="0"
                      max="365"
                      value={delayFormData.last_maintenance_days}
                      onChange={(e) => setDelayFormData({ ...delayFormData, last_maintenance_days: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>Scheduled Arrival</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Optional for ETA)</span>
                    </label>
                    <Input
                      type="datetime-local"
                      value={delayFormData.scheduled_arrival}
                      onChange={(e) => setDelayFormData({ ...delayFormData, scheduled_arrival: e.target.value })}
                    />
                  </div>
                </div>

                {/* Form Action Button */}
                <div className="flex items-center justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={delayLoading}
                    className="flex items-center space-x-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold"
                  >
                    <Sparkles className={`w-4 h-4 ${delayLoading ? 'animate-spin' : ''}`} />
                    <span>{delayLoading ? 'Evaluating Model...' : 'Calculate Predicted Delay & ETA'}</span>
                  </Button>
                </div>
              </form>

              {/* Loading State */}
              {delayLoading && (
                <div className="py-8 text-center space-y-3 bg-white p-6 rounded-xl border border-slate-200">
                  <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold text-slate-700">
                    Executing real-time inference via HistGradientBoostingRegressor pipeline...
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    POST /api/v1/ai/train-delay-prediction
                  </p>
                </div>
              )}

              {/* Error State */}
              {!delayLoading && delayError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Delay Inference Error</span>
                  </div>
                  <p className="text-xs text-rose-700">{delayError}</p>
                </div>
              )}

              {/* Result State */}
              {!delayLoading && delayResult && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Primary Stats Grid */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    delayResult.delay_severity_tier === 'Major Delay'
                      ? 'bg-rose-50/80 border-rose-500 text-rose-950 shadow-sm'
                      : delayResult.delay_severity_tier === 'Moderate Delay'
                      ? 'bg-amber-50/80 border-amber-500 text-amber-950 shadow-sm'
                      : delayResult.delay_severity_tier === 'Minor Delay'
                      ? 'bg-yellow-50/80 border-yellow-400 text-yellow-950'
                      : 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                  }`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Stat 1: Predicted Delay */}
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                          Predicted Train Delay
                        </span>
                        <div className="text-3xl font-black mt-0.5 font-mono tracking-tight">
                          {delayResult.predicted_delay_minutes.toFixed(2)} mins
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1.5 ${
                          delayResult.is_delayed ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                        }`}>
                          {delayResult.is_delayed ? 'DELAYED' : 'RIGHT TIME / ON TIME'}
                        </span>
                      </div>

                      {/* Stat 2: Severity Tier */}
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">
                          Delay Severity Tier
                        </span>
                        <div className="text-xl font-bold mt-1 text-slate-800">
                          {delayResult.delay_severity_tier}
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-1">
                          Threshold: {delayResult.predicted_delay_minutes <= 5 ? '≤ 5m (Right Time)' : delayResult.predicted_delay_minutes <= 15 ? '5-15m (Minor)' : delayResult.predicted_delay_minutes <= 30 ? '15-30m (Moderate)' : '> 30m (Major)'}
                        </span>
                      </div>

                      {/* Stat 3: ETA Comparison */}
                      <div className="bg-white/80 p-3 rounded-lg border border-slate-200/80 text-xs">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block mb-1">
                          Arrival Timings & ETA
                        </span>
                        {delayResult.predicted_eta ? (
                          <div className="space-y-1 font-mono">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Sched:</span>
                              <span className="font-semibold text-slate-800">
                                {new Date(delayResult.scheduled_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Predicted ETA:</span>
                              <span className="font-bold text-purple-700">
                                {new Date(delayResult.predicted_eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="text-[10px] text-amber-700 pt-0.5 border-t border-slate-100 flex justify-between">
                              <span>Delay Shift:</span>
                              <span>+{delayResult.predicted_delay_minutes}m</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-500 text-[11px] space-y-1">
                            <p><strong>Scheduled Arrival:</strong> Not specified</p>
                            <p><strong>Predicted ETA:</strong> Not calculated</p>
                            <p className="text-[10px] text-slate-400 italic">Enter a scheduled arrival time to compute the exact station ETA.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Recommendation */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
                      <Wrench className="w-4 h-4 text-purple-600" />
                      <span>Recommended Operating Directive:</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium pl-6">
                      {delayResult.recommended_action || "Maintain regular dispatch priority."}
                    </p>
                  </div>

                  {/* Top Contributing Factors */}
                  {delayResult.top_contributing_factors && delayResult.top_contributing_factors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          Top Delay Drivers (Model Feature Contribution)
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Permutation Importance on Test Partition
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {delayResult.top_contributing_factors.map((factor, idx) => (
                          <div
                            key={factor.feature || idx}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-mono font-bold text-[10px] flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {factor.feature.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {factor.category} • {factor.importance_pct}% weight
                                </span>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                              {factor.feature_value !== null && factor.feature_value !== undefined ? String(factor.feature_value) : 'Default'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Model Metadata Footer */}
                  <div className="p-3 bg-slate-100/80 rounded-lg text-[11px] text-slate-500 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-200">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-3.5 h-3.5 text-slate-600" />
                      <span>Model: <strong className="text-slate-800">{delayResult.model_type}</strong></span>
                    </div>
                    <div>
                      <span>Trained Artifact: <strong className="text-slate-800">{delayResult.model_version || 'v1.0.0'}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[11px] text-slate-400 font-mono">
                Formula: ETA = Scheduled Arrival + Predicted Delay
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDelayModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
