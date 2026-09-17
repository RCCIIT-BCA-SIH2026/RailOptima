import React, { useEffect, useState, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  CalendarDays,
  Layers, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  TrendingDown, 
  TrendingUp,
  Activity, 
  Zap, 
  Filter,
  AlertTriangle,
  AlertOctagon,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Train,
  Wrench,
  Radio,
  Sliders,
  Check,
  RefreshCw,
  Award,
  FileCheck,
  HelpCircle,
  Plus,
  Move,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Gauge
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// Department Color Helpers
const DEPARTMENT_COLORS = {
  ENG: {
    badge: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300',
    card: 'border-l-4 border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/30 border-amber-200',
    accent: 'bg-amber-500 text-white',
    name: 'Civil Eng (P-Way)'
  },
  SNT: {
    badge: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300',
    card: 'border-l-4 border-l-blue-500 bg-blue-50/70 dark:bg-blue-950/30 border-blue-200',
    accent: 'bg-blue-600 text-white',
    name: 'Signal & Telecom'
  },
  TRD: {
    badge: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300',
    card: 'border-l-4 border-l-purple-500 bg-purple-50/70 dark:bg-purple-950/30 border-purple-200',
    accent: 'bg-purple-600 text-white',
    name: 'Traction TRD'
  },
  INT: {
    badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300',
    card: 'border-l-4 border-l-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200',
    accent: 'bg-emerald-600 text-white',
    name: 'Integrated Shadow'
  }
};

const STATUS_BADGES = {
  Approved: { variant: 'success', label: 'Approved' },
  Proposed: { variant: 'default', label: 'Proposed' },
  Active: { variant: 'warning', label: 'Active Live' },
  Completed: { variant: 'outline', label: 'Completed' },
  Rescheduled: { variant: 'ai', label: 'Rescheduled' }
};

export default function BlockPlanningView() {
  // Navigation Tabs: 'weekly' | 'monthly' | 'coordination' | 'conflicts'
  const [activeMainTab, setActiveMainTab] = useState('weekly');

  // ==================== WEEKLY PLANNER STATE ====================
  const [weeklyData, setWeeklyData] = useState({
    start_date: '2026-09-14',
    end_date: '2026-09-20',
    days: [],
    blocks: [],
    department_breakdown: { ENG: 0, SNT: 0, TRD: 0, INT: 0 },
    total_blocks: 0
  });
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [selectedDayTab, setSelectedDayTab] = useState(0); // 0 = Monday, 6 = Sunday
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragHoverDay, setDragHoverDay] = useState(null);
  const [dragHoverHour, setDragHoverHour] = useState(null);

  // Drag-and-Drop Conflict Modal State
  const [rescheduleConflictModal, setRescheduleConflictModal] = useState({
    isOpen: false,
    blockId: null,
    targetDate: null,
    targetHour: null,
    conflictData: null,
    loading: false
  });
  const [rescheduleFeedback, setRescheduleFeedback] = useState(null);

  // ==================== MONTHLY PLANNER STATE ====================
  const [monthlyData, setMonthlyData] = useState({
    month: '2026-09',
    total_blocks: 0,
    critical_tasks_count: 0,
    overdue_tasks_count: 0,
    asset_availability_pct: 94.8,
    department_workload_hours: { ENG: 0, SNT: 0, TRD: 0, INT: 0 },
    calendar_days: []
  });
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedCalDay, setSelectedCalDay] = useState(null);

  // ==================== COORDINATION STATE ====================
  const [coordinationData, setCoordinationData] = useState({ total_opportunities: 0, total_track_hours_saved: 0, recommendations: [] });
  const [coordinationLoading, setCoordinationLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState('NDLS-TKD-UP');
  const [sanctionSuccessMsg, setSanctionSuccessMsg] = useState(null);

  // ==================== CONFLICT RADAR STATE ====================
  const [conflictsData, setConflictsData] = useState({ summary: {}, conflicts: [] });
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [conflictTypeFilter, setConflictTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [resolvingId, setResolvingId] = useState(null);
  const [resolutionSuccessMsg, setResolutionSuccessMsg] = useState(null);

  // Conflict Checker Modal State
  const [isCheckerModalOpen, setIsCheckerModalOpen] = useState(false);
  const [checkerLoading, setCheckerLoading] = useState(false);
  const [checkerForm, setCheckerForm] = useState({
    section_code: 'NDLS-TKD-UP',
    start_time: '2026-09-17T07:30:00',
    end_time: '2026-09-17T10:30:00',
    department_code: 'ENG',
    block_type: 'Traffic',
    required_power_block: true,
    required_traffic_block: true
  });
  const [checkerResult, setCheckerResult] = useState(null);

  // ==================== DATA FETCHING ====================

  // Fetch Weekly Schedule
  const fetchWeeklySchedule = useCallback(async () => {
    try {
      setWeeklyLoading(true);
      const res = await apiClient.get('/blocks/weekly-schedule');
      if (res.data) {
        setWeeklyData(res.data);
      }
    } catch (err) {
      console.error("Failed to load weekly schedule", err);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  // Fetch Monthly Summary
  const fetchMonthlySummary = useCallback(async (monthStr = '2026-09') => {
    try {
      setMonthlyLoading(true);
      const res = await apiClient.get('/blocks/monthly-summary', {
        params: { month: monthStr }
      });
      if (res.data) {
        setMonthlyData(res.data);
        if (res.data.calendar_days?.length > 0 && !selectedCalDay) {
          setSelectedCalDay(res.data.calendar_days[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load monthly summary", err);
    } finally {
      setMonthlyLoading(false);
    }
  }, [selectedCalDay]);

  // Fetch Coordination Opportunities
  const fetchCoordinationOpportunities = useCallback(async () => {
    try {
      setCoordinationLoading(true);
      const res = await apiClient.get('/coordination/opportunities', {
        params: { section_code: selectedSection }
      });
      setCoordinationData(res.data || { total_opportunities: 0, total_track_hours_saved: 0, recommendations: [] });
    } catch (err) {
      console.error("Failed to load coordination opportunities", err);
    } finally {
      setCoordinationLoading(false);
    }
  }, [selectedSection]);

  // Fetch Conflicts
  const fetchConflicts = useCallback(async () => {
    try {
      setConflictsLoading(true);
      const params = {};
      if (conflictTypeFilter !== 'ALL') params.conflict_type = conflictTypeFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;

      const res = await apiClient.get('/conflicts', { params });
      setConflictsData(res.data || { summary: {}, conflicts: [] });
    } catch (err) {
      console.error("Failed to load conflicts", err);
    } finally {
      setConflictsLoading(false);
    }
  }, [conflictTypeFilter, severityFilter]);

  useEffect(() => {
    if (activeMainTab === 'weekly') {
      fetchWeeklySchedule();
    } else if (activeMainTab === 'monthly') {
      fetchMonthlySummary(selectedMonth);
    } else if (activeMainTab === 'coordination') {
      fetchCoordinationOpportunities();
    } else if (activeMainTab === 'conflicts') {
      fetchConflicts();
    }
  }, [activeMainTab, fetchWeeklySchedule, fetchMonthlySummary, fetchCoordinationOpportunities, fetchConflicts, selectedMonth]);

  // ==================== DRAG AND DROP RESCHEDULING ====================

  const handleDragStart = (e, block) => {
    setDraggedBlock(block);
    e.dataTransfer.setData('text/plain', JSON.stringify({ blockId: block.id, blockCode: block.block_code }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, dayIdx, hour) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragHoverDay(dayIdx);
    setDragHoverHour(hour);
  };

  const handleDragLeave = () => {
    setDragHoverDay(null);
    setDragHoverHour(null);
  };

  const handleDrop = async (dayIdx, hour) => {
    setDragHoverDay(null);
    setDragHoverHour(null);
    if (!draggedBlock) return;

    const targetDayObj = weeklyData.days[dayIdx];
    const targetDate = targetDayObj ? targetDayObj.date : '2026-09-17';
    const blockId = draggedBlock.id;

    executeReschedule(blockId, targetDate, hour, false);
    setDraggedBlock(null);
  };

  const executeReschedule = async (blockId, targetDate, targetHour, force = false, slotOverride = null) => {
    try {
      setRescheduleConflictModal(prev => ({ ...prev, loading: true }));
      
      const payload = {
        target_date: targetDate,
        target_hour: targetHour,
        force: force
      };

      if (slotOverride) {
        payload.new_start_time = slotOverride.start_time;
        payload.new_end_time = slotOverride.end_time;
      }

      const res = await apiClient.post(`/blocks/${blockId}/reschedule`, payload);
      const data = res.data;

      if (data.conflict_detected && !force) {
        // Show Conflict Warning & Alternative Slots Modal
        setRescheduleConflictModal({
          isOpen: true,
          blockId: blockId,
          targetDate: targetDate,
          targetHour: targetHour,
          conflictData: data,
          loading: false
        });
      } else {
        // Successfully rescheduled
        setRescheduleConflictModal({ isOpen: false, blockId: null, targetDate: null, targetHour: null, conflictData: null, loading: false });
        setRescheduleFeedback({
          type: 'success',
          message: data.message || `Block successfully moved to ${targetDate} at ${targetHour}:00 with conflict clearance.`
        });
        setTimeout(() => setRescheduleFeedback(null), 6000);
        fetchWeeklySchedule();
      }
    } catch (err) {
      console.error("Rescheduling failed", err);
      setRescheduleConflictModal(prev => ({ ...prev, loading: false }));
      setRescheduleFeedback({
        type: 'error',
        message: 'Reschedule request failed. Please check network and server logs.'
      });
      setTimeout(() => setRescheduleFeedback(null), 6000);
    }
  };

  // Sanction Combined Block
  const handleSanctionCombinedBlock = async (rec) => {
    try {
      await apiClient.post('/coordination/combine-blocks', {
        section_code: rec.section_code,
        tasks: rec.bundled_tasks
      });
      setSanctionSuccessMsg(`Combined Block ${rec.title} successfully sanctioned & dispatched to Section Controller!`);
      setTimeout(() => setSanctionSuccessMsg(null), 6000);
    } catch (err) {
      console.error("Failed to sanction combined block", err);
    }
  };

  // Resolve specific conflict
  const handleResolveConflict = async (conflict) => {
    try {
      setResolvingId(conflict.conflict_id);
      await apiClient.post(`/conflicts/${conflict.conflict_id}/resolve`, {
        action_code: conflict.recommended_resolution?.action_code || 'DEFAULT_RESOLVE',
        rationale: 'Applied automated resolution strategy via Enterprise Block Planner'
      });
      setResolutionSuccessMsg(`Conflict ${conflict.conflict_id} resolved! ${conflict.recommended_resolution?.title || ''}`);
      setTimeout(() => setResolutionSuccessMsg(null), 6000);
      fetchConflicts();
    } catch (err) {
      console.error("Failed to resolve conflict", err);
    } finally {
      setResolvingId(null);
    }
  };

  // Run Conflict Checker
  const handleRunConflictCheck = async () => {
    try {
      setCheckerLoading(true);
      const res = await apiClient.post('/conflicts/check', checkerForm);
      setCheckerResult(res.data);
    } catch (err) {
      console.error("Check failed", err);
    } finally {
      setCheckerLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Layers className="w-6 h-6 text-indigo-600" />
              <span>Railway Block Planning & Timeline Center</span>
            </h2>
            <Badge variant="ai">SIMULATED DEMO DATA</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Indian Railways Weekly 24-Hour Possession Timetable, Monthly Capacity Calendar, Multi-Department Shadow Blocks, and Timetable Conflict Radar.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('weekly')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeMainTab === 'weekly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Weekly 24h Planner</span>
          </button>

          <button
            onClick={() => setActiveMainTab('monthly')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeMainTab === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Monthly Calendar</span>
          </button>

          <button
            onClick={() => setActiveMainTab('coordination')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeMainTab === 'coordination'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Dept Shadow Blocks</span>
          </button>

          <button
            onClick={() => setActiveMainTab('conflicts')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeMainTab === 'conflicts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Conflict Radar</span>
            {conflictsData.summary?.critical_count > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white font-black">
                {conflictsData.summary.critical_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {rescheduleFeedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs animate-in fade-in ${
          rescheduleFeedback.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            {rescheduleFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-bold">{rescheduleFeedback.message}</span>
          </div>
          <Badge variant={rescheduleFeedback.type === 'success' ? 'success' : 'critical'}>
            {rescheduleFeedback.type === 'success' ? 'RESCHEDULE CONFIRMED' : 'VALIDATION ALERT'}
          </Badge>
        </div>
      )}

      {sanctionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">{sanctionSuccessMsg}</span>
          </div>
          <Badge variant="success">INTEGRATED BLOCK SANCTIONED</Badge>
        </div>
      )}

      {resolutionSuccessMsg && (
        <div className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-bold">{resolutionSuccessMsg}</span>
          </div>
          <Badge variant="ai">RESOLUTION APPLIED</Badge>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: WEEKLY 24-HOUR TIMELINE & DRAG-AND-DROP RESCHEDULING               */}
      {/* ========================================================================= */}
      {activeMainTab === 'weekly' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls & Department KPI Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Week & Guidance Banner */}
            <div className="lg:col-span-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white border border-indigo-900 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Monday – Sunday Possession Timeline</span>
                  </span>
                  <Badge variant="outline" className="text-white border-white/20">
                    24h Coordinate Grid
                  </Badge>
                </div>
                <h3 className="text-lg font-black text-white mt-1">
                  Weekly Block Planning (14 Sep – 20 Sep 2026)
                </h3>
                <p className="text-xs text-indigo-200 mt-1">
                  Drag any maintenance block card to reschedule across days or 24-hour time slots. Real-time timetable conflict detection prevents clashes with high-speed passenger traffic.
                </p>
              </div>

              <div className="mt-4 flex items-center space-x-2 text-[11px] bg-white/10 px-3 py-2 rounded-xl text-indigo-100">
                <Move className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span><strong>Drag & Drop Activated:</strong> Grab any block card and drop into any day/hour target cell below.</span>
              </div>
            </div>

            {/* Department Color Legend & Counts */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-amber-500/10 border border-amber-300 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Civil ENG</span>
                  </div>
                  <div className="text-2xl font-black text-amber-950 dark:text-amber-100 mt-1">
                    {weeklyData.department_breakdown?.ENG || 5}
                  </div>
                </div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                  Track Tamping & BCM
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-300 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-blue-900 dark:text-blue-300 flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span>Signal S&T</span>
                  </div>
                  <div className="text-2xl font-black text-blue-950 dark:text-blue-100 mt-1">
                    {weeklyData.department_breakdown?.SNT || 3}
                  </div>
                </div>
                <div className="text-[10px] text-blue-700 dark:text-blue-400 font-medium mt-1">
                  Points & Interlocking
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-300 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                    <span>Traction TRD</span>
                  </div>
                  <div className="text-2xl font-black text-purple-950 dark:text-purple-100 mt-1">
                    {weeklyData.department_breakdown?.TRD || 3}
                  </div>
                </div>
                <div className="text-[10px] text-purple-700 dark:text-purple-400 font-medium mt-1">
                  25kV OHE Catenary
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-300 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 flex items-center space-x-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Integrated INT</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                    {weeklyData.department_breakdown?.INT || 3}
                  </div>
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
                  Joint Shadow Blocks
                </div>
              </div>
            </div>
          </div>

          {/* Weekly 7-Day Matrix Header Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <div className="grid grid-cols-7 gap-2">
              {weeklyData.days?.map((d, idx) => {
                const dayBlocks = weeklyData.blocks?.filter(b => b.day_index === idx) || [];
                const isSelected = selectedDayTab === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDayTab(idx)}
                    onDragOver={(e) => handleDragOver(e, idx, 2.0)}
                    onDrop={() => handleDrop(idx, 2.0)}
                    className={`p-3 rounded-xl text-left border transition-all relative ${
                      dragHoverDay === idx 
                        ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-400'
                        : isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                        {d.day_name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {d.date.split('-')[2]} Sep
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-medium text-slate-500">
                        {dayBlocks.length} {dayBlocks.length === 1 ? 'block' : 'blocks'}
                      </span>
                      <div className="flex space-x-1">
                        {dayBlocks.map((b, bi) => (
                          <span 
                            key={bi} 
                            className={`w-2 h-2 rounded-full ${
                              b.department === 'ENG' ? 'bg-amber-500' :
                              b.department === 'SNT' ? 'bg-blue-500' :
                              b.department === 'TRD' ? 'bg-purple-500' : 'bg-emerald-500'
                            }`} 
                          />
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 24-Hour Timeline Grid (Monday–Sunday Columns) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-bold">
                  24-Hour Visual Corridor Timeline & Possessions
                </CardTitle>
              </div>

              {/* Time Window Legend */}
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1 text-slate-600">
                  <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 inline-block" />
                  <span>Night Off-Peak (01:00 – 05:00)</span>
                </span>
                <span className="flex items-center space-x-1 text-slate-600">
                  <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400 inline-block" />
                  <span>Daytime Peak (07:00 – 21:00)</span>
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 overflow-x-auto">
              {weeklyLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <p className="text-xs">Loading 24-hour weekly block schedule...</p>
                </div>
              ) : (
                <div className="min-w-[900px] space-y-4">
                  {/* Day Columns */}
                  <div className="grid grid-cols-7 gap-3">
                    {weeklyData.days?.map((dayObj, dayIdx) => {
                      const dayBlocks = weeklyData.blocks?.filter(b => b.day_index === dayIdx) || [];
                      
                      return (
                        <div 
                          key={dayIdx} 
                          className={`flex flex-col rounded-xl border p-2.5 transition-all ${
                            dragHoverDay === dayIdx 
                              ? 'border-indigo-500 bg-indigo-50/50' 
                              : 'border-slate-200 bg-slate-50/40'
                          }`}
                        >
                          {/* Day Column Header */}
                          <div className="border-b pb-2 mb-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800">
                                {dayObj.day_name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {dayObj.date.split('-')[2]} Sep
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {dayBlocks.length} Possessions Scheduled
                            </span>
                          </div>

                          {/* Blocks List in Day */}
                          <div className="space-y-2.5 flex-1 min-h-[320px]">
                            {dayBlocks.length === 0 ? (
                              <div 
                                onDragOver={(e) => handleDragOver(e, dayIdx, 2.0)}
                                onDrop={() => handleDrop(dayIdx, 2.0)}
                                className="h-full border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center p-4 text-center text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all"
                              >
                                <Clock className="w-5 h-5 mb-1 text-slate-300" />
                                <span className="text-[11px] font-bold">No Scheduled Blocks</span>
                                <span className="text-[10px]">Drop block here to move to {dayObj.day_name}</span>
                              </div>
                            ) : (
                              dayBlocks.map((block) => {
                                const deptStyle = DEPARTMENT_COLORS[block.department] || DEPARTMENT_COLORS.ENG;
                                const statusStyle = STATUS_BADGES[block.status] || { variant: 'default', label: block.status };
                                const isNightOffPeak = block.start_hour >= 1.0 && block.start_hour <= 4.5;

                                return (
                                  <div
                                    key={block.id}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, block)}
                                    className={`p-3 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all space-y-2 ${deptStyle.card}`}
                                  >
                                    {/* Card Top: Drag Handle + Dept + Status */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-1.5">
                                        <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border uppercase ${deptStyle.badge}`}>
                                          {block.department}
                                        </span>
                                      </div>
                                      <Badge variant={statusStyle.variant} className="text-[9px] px-1.5 py-0">
                                        {statusStyle.label}
                                      </Badge>
                                    </div>

                                    {/* Block Code & Section */}
                                    <div>
                                      <div className="text-xs font-black text-slate-900 tracking-tight flex items-center justify-between">
                                        <span>{block.block_code}</span>
                                        <span className="text-[10px] font-mono text-slate-500">{block.section_code}</span>
                                      </div>
                                      <div className="text-[11px] text-slate-700 font-medium line-clamp-1 mt-0.5">
                                        {block.work_type}
                                      </div>
                                    </div>

                                    {/* Timing Pill */}
                                    <div className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-mono ${
                                      isNightOffPeak 
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-white text-slate-700 border border-slate-200'
                                    }`}>
                                      <div className="flex items-center space-x-1">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        <span>
                                          {String(Math.floor(block.start_hour)).padStart(2, '0')}:{String(Math.round((block.start_hour % 1) * 60)).padStart(2, '0')} - {String(Math.floor(block.end_hour)).padStart(2, '0')}:{String(Math.round((block.end_hour % 1) * 60)).padStart(2, '0')}
                                        </span>
                                      </div>
                                      <span className="font-bold">{block.duration_minutes}m</span>
                                    </div>

                                    {/* Conflict Warning Indicator */}
                                    {block.has_conflict && (
                                      <div className="flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                                        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                        <span>Daytime Traffic Conflict</span>
                                      </div>
                                    )}

                                    {/* Multi-Task Count if Integrated */}
                                    {block.tasks_count > 1 && (
                                      <div className="flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                                        <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>{block.tasks_count} Bundled Multi-Dept Tasks</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}

                            {/* Drop Slot Target at Bottom */}
                            <div
                              onDragOver={(e) => handleDragOver(e, dayIdx, 2.0)}
                              onDrop={() => handleDrop(dayIdx, 2.0)}
                              className="border border-dashed border-slate-300 rounded-lg py-2 text-center text-[10px] font-semibold text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-600 transition-all cursor-pointer"
                            >
                              + Drop to schedule here
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY CAPACITY CALENDAR, WORKLOAD & AVAILABILITY GAUGE           */}
      {/* ========================================================================= */}
      {activeMainTab === 'monthly' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Monthly KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Asset Availability KPI */}
            <Card className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-800">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center space-x-1">
                    <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Asset Availability</span>
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
                    {monthlyData.asset_availability_pct}%
                  </div>
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    Target &gt; 92.0% Achieved
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            {/* Total Monthly Blocks */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Monthly Possessions
                  </span>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {monthlyData.total_blocks} Blocks
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    September 2026 Master Cycle
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Critical Tasks Count */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Critical Safety Tasks
                  </span>
                  <div className="text-2xl font-black text-red-600 mt-1">
                    {monthlyData.critical_tasks_count} Critical
                  </div>
                  <span className="text-[10px] text-red-500 font-semibold">
                    Scheduled in Priority Windows
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                  <Flame className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            {/* Overdue Tasks Alert */}
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Overdue Maintenance
                  </span>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {monthlyData.overdue_tasks_count} Overdue
                  </div>
                  <span className="text-[10px] text-amber-600 font-semibold">
                    Requires Sanction Escalation
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Workload Summary Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Department Monthly Possession Workload (Corridor Hours)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Total Cumulative Track Possession: 391.0 Hours
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-8 rounded-full bg-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Civil Engineering (ENG)</div>
                  <div className="text-lg font-black text-amber-600 font-mono">
                    {monthlyData.department_workload_hours?.ENG || 142.5}h
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-3 h-8 rounded-full bg-blue-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Signal & Telecom (SNT)</div>
                  <div className="text-lg font-black text-blue-600 font-mono">
                    {monthlyData.department_workload_hours?.SNT || 88.0}h
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-3 h-8 rounded-full bg-purple-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Traction (TRD)</div>
                  <div className="text-lg font-black text-purple-600 font-mono">
                    {monthlyData.department_workload_hours?.TRD || 96.5}h
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-3 h-8 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-xs font-bold text-slate-800">Integrated Shadow (INT)</div>
                  <div className="text-lg font-black text-emerald-600 font-mono">
                    {monthlyData.department_workload_hours?.INT || 64.0}h
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Calendar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 30-Day Grid */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    <CardTitle className="text-sm font-bold">
                      September 2026 Block Calendar
                    </CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs font-bold font-mono">September 2026</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-4">
                  {/* Calendar Weekday Names */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 pb-2 border-b">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div>Sun</div>
                  </div>

                  {/* 30 Days Grid */}
                  <div className="grid grid-cols-7 gap-1.5 mt-2">
                    {monthlyData.calendar_days?.map((d) => {
                      const isSelected = selectedCalDay?.date === d.date;
                      return (
                        <button
                          key={d.day_number}
                          onClick={() => setSelectedCalDay(d)}
                          className={`p-2 rounded-xl border text-left flex flex-col justify-between min-h-[75px] transition-all relative ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-300'
                              : 'border-slate-100 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs font-black ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                              {d.day_number}
                            </span>
                            
                            {/* Urgent Badges */}
                            <div className="flex items-center space-x-1">
                              {d.critical_tasks_count > 0 && (
                                <span className="w-2 h-2 rounded-full bg-red-500" title="Critical Safety Task" />
                              )}
                              {d.overdue_tasks_count > 0 && (
                                <span className="w-2 h-2 rounded-full bg-amber-500" title="Overdue Task" />
                              )}
                            </div>
                          </div>

                          {/* Blocks Count & Department Chips */}
                          <div className="w-full space-y-1 mt-1">
                            {d.total_blocks > 0 ? (
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-700">
                                  {d.total_blocks} {d.total_blocks === 1 ? 'blk' : 'blks'}
                                </span>
                                <div className="flex space-x-0.5">
                                  {d.departments_involved?.map((dept, di) => (
                                    <span
                                      key={di}
                                      className={`text-[8px] font-black px-1 rounded text-white ${
                                        dept === 'ENG' ? 'bg-amber-500' :
                                        dept === 'SNT' ? 'bg-blue-500' : 'bg-purple-500'
                                      }`}
                                    >
                                      {dept}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-300">Clean Headway</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Day Focus Panel */}
            <div className="space-y-4">
              <Card className="border-indigo-200">
                <CardHeader className="py-3 bg-indigo-50/50 border-b">
                  <CardTitle className="text-xs font-bold text-indigo-950 flex items-center justify-between">
                    <span>Day Schedule: {selectedCalDay?.date || '2026-09-01'}</span>
                    <Badge variant="outline">{selectedCalDay?.day_name || 'Tue'}</Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Day Capacity Metrics
                    </span>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500">Scheduled Blocks</div>
                        <div className="text-lg font-black text-slate-800">
                          {selectedCalDay?.total_blocks || 0}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500">Critical Tasks</div>
                        <div className="text-lg font-black text-red-600">
                          {selectedCalDay?.critical_tasks_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Blocks on this Date
                    </span>
                    <div className="mt-2 space-y-2">
                      {selectedCalDay?.blocks?.length > 0 ? (
                        selectedCalDay.blocks.map((b, i) => (
                          <div key={i} className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 space-y-1 text-xs">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{b.block_code}</span>
                              <Badge variant="warning">{b.dept}</Badge>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Type: {b.type} | Duration: {b.duration_hrs} Hours
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic py-2">
                          No major track blocks scheduled on this day. Standard running timetable active.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveMainTab('weekly')}
                      className="w-full text-xs font-bold flex items-center justify-center space-x-1"
                    >
                      <span>Open in Weekly 24h Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MULTI-DEPARTMENT COORDINATION & COMBINED BLOCK RECOMMENDATIONS     */}
      {/* ========================================================================= */}
      {activeMainTab === 'coordination' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Department Pillars & 5-Criteria Validation Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-6 text-white border border-indigo-900 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-indigo-400" />
                  <span>Integrated Multi-Department Shadow Block System</span>
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Bundling Civil Engineering + Signal & Telecom + Traction Distribution
                </h3>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
                  Simultaneously executing compatible track possessions eliminates redundant line block closures,
                  saving cumulative corridor hours and cutting train traffic regulations by up to 67%.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0 bg-white/10 p-3 rounded-xl border border-white/10">
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    +{coordinationData.total_track_hours_saved || 4.2} Hrs
                  </div>
                  <div className="text-[11px] text-indigo-200 font-medium">Track Capacity Saved</div>
                </div>
              </div>
            </div>

            {/* 5-Criteria Compatibility Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs pt-1">
              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Location</span>
                </div>
                <p className="text-[11px] text-indigo-200 mt-1">Same section or adjacent kilometer cluster</p>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Compatible Work</span>
                </div>
                <p className="text-[11px] text-indigo-200 mt-1">Track + OHE + Signal inspection verified</p>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3. Time Window</span>
                </div>
                <p className="text-[11px] text-indigo-200 mt-1">Co-timed off-peak possession slot</p>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4. Resource Check</span>
                </div>
                <p className="text-[11px] text-indigo-200 mt-1">Non-competing machine allocations</p>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5. Safety Constraints</span>
                </div>
                <p className="text-[11px] text-indigo-200 mt-1">25kV power isolation & grounding verified</p>
              </div>
            </div>
          </div>

          {/* Section Filter & Opportunities Count */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-700">Corridor Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg px-3 py-1.5 text-slate-800"
              >
                <option value="NDLS-TKD-UP">NDLS - TKD (UP Line)</option>
                <option value="TKD-PWL-UP">TKD - PWL (UP Line)</option>
                <option value="PWL-MTJ-UP">PWL - MTJ (UP Line)</option>
                <option value="MTJ-AGC-UP">MTJ - AGC (UP Line)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 font-medium">Opportunities Identified:</span>
              <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {coordinationData.total_opportunities || 2} Bundled Packages Available
              </span>
            </div>
          </div>

          {/* Recommendations Cards */}
          {coordinationLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              <p className="text-xs">Evaluating 5-criteria compatibility engine...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {coordinationData.recommendations?.map((rec) => (
                <Card key={rec.recommendation_id} className="border-indigo-100 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-5 py-3 text-white flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-indigo-200 uppercase font-mono">
                        {rec.recommendation_id}
                      </span>
                      <span className="text-white text-xs font-black">| {rec.title}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded">
                        Synergy: {rec.synergy_score}/100
                      </span>
                      <Badge variant="ai">Disruption -{rec.train_disruption_reduction_pct}%</Badge>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Metrics Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Separate Executions</span>
                        <span className="font-bold text-slate-700">{rec.separate_total_hours} Hours</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Combined Block Window</span>
                        <span className="font-bold text-indigo-700">{rec.combined_duration_hours} Hours</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Corridor Capacity Saved</span>
                        <span className="font-black text-emerald-600">+{rec.track_capacity_saved_hours} Hours</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Section</span>
                        <span className="font-bold text-slate-800">{rec.section_code}</span>
                      </div>
                    </div>

                    {/* Department Task Cards */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Bundled Department Operations:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {rec.bundled_tasks?.map((task) => {
                          const deptStyle = DEPARTMENT_COLORS[task.department_code] || DEPARTMENT_COLORS.ENG;
                          return (
                            <div
                              key={task.task_id}
                              className={`p-3.5 rounded-xl border text-xs space-y-2 ${deptStyle.card}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-black text-[10px] px-2 py-0.5 rounded border uppercase ${deptStyle.badge}`}>
                                  {deptStyle.name}
                                </span>
                                <span className="font-mono text-slate-400 text-[10px]">{task.task_id}</span>
                              </div>

                              <div className="font-bold text-slate-900 leading-tight">
                                {task.description}
                              </div>

                              <div className="text-[11px] text-slate-600">
                                <div><strong>Location:</strong> {task.location}</div>
                                <div><strong>Duration:</strong> {task.duration_minutes} Minutes</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Statutory Safety Checklist */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Joint Execution Statutory Safety Checklist:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-950">
                        {rec.safety_checklist?.map((item, i) => (
                          <div key={i} className="flex items-start space-x-2">
                            <Check className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sanction Action Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ai"
                        onClick={() => handleSanctionCombinedBlock(rec)}
                        className="text-xs font-bold flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                      >
                        <Award className="w-4 h-4" />
                        <span>Sanction Combined Block Possession</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CONFLICT RADAR & STATUTORY 6-RULE AUDIT                           */}
      {/* ========================================================================= */}
      {activeMainTab === 'conflicts' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Conflict Summary Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="bg-red-50/70 border-red-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-red-700 uppercase">Critical Conflicts</span>
                  <div className="text-2xl font-black text-red-800 mt-1">
                    {conflictsData.summary?.critical_count || 0}
                  </div>
                </div>
                <Flame className="w-6 h-6 text-red-500" />
              </CardContent>
            </Card>

            <Card className="bg-amber-50/70 border-amber-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase">High Severity</span>
                  <div className="text-2xl font-black text-amber-800 mt-1">
                    {conflictsData.summary?.high_count || 0}
                  </div>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase">Total Active Conflicts</span>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {conflictsData.summary?.total_conflicts || 0}
                  </div>
                </div>
                <ShieldAlert className="w-6 h-6 text-indigo-500" />
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/70 border-emerald-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase">Train Delay Prevented</span>
                  <div className="text-2xl font-black text-emerald-800 mt-1">
                    +{conflictsData.summary?.estimated_train_delay_prevented_minutes || 0} min
                  </div>
                </div>
                <Train className="w-6 h-6 text-emerald-600" />
              </CardContent>
            </Card>
          </div>

          {/* Action Bar & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-slate-700">Conflict Category:</span>
                <select
                  value={conflictTypeFilter}
                  onChange={(e) => setConflictTypeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 text-slate-800"
                >
                  <option value="ALL">All Categories (6 Rules)</option>
                  <option value="Maintenance_vs_Train">Maintenance vs Train</option>
                  <option value="Maintenance_vs_Maintenance">Maintenance vs Maintenance</option>
                  <option value="Block_vs_Block">Block vs Block</option>
                  <option value="Department_vs_Department">Department vs Department</option>
                  <option value="Resource_vs_Resource">Resource vs Resource</option>
                  <option value="Safety_Conflict">Safety Constraints</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-slate-700">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg px-2.5 py-1.5 text-slate-800"
                >
                  <option value="ALL">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                </select>
              </div>
            </div>

            <Button
              variant="ai"
              size="sm"
              onClick={() => setIsCheckerModalOpen(true)}
              className="text-xs font-bold flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Verify Proposed Schedule</span>
            </Button>
          </div>

          {/* Conflicts List */}
          {conflictsLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              <p className="text-xs">Scanning 6-category conflict radar...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {conflictsData.conflicts?.length === 0 ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center text-emerald-800">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <div className="font-bold text-sm">Clear Corridor Headway</div>
                  <p className="text-xs text-emerald-700 mt-1">
                    No active spatial or timetable conflicts detected in the selected filter range.
                  </p>
                </div>
              ) : (
                conflictsData.conflicts?.map((conflict) => (
                  <Card key={conflict.conflict_id} className="border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            conflict.severity === 'Critical' ? 'bg-red-500 text-white' :
                            conflict.severity === 'High' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {conflict.severity}
                          </span>
                          <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {conflict.conflict_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-400 text-xs font-mono">{conflict.conflict_id}</span>
                        </div>

                        <div className="text-xs text-slate-500 font-medium">
                          <strong>Location:</strong> {conflict.location}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900">{conflict.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {conflict.description}
                        </p>
                      </div>

                      {/* Recommended Resolution Box */}
                      {conflict.recommended_resolution && (
                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-3.5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-purple-900 flex items-center space-x-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>Recommended Resolution: {conflict.recommended_resolution.title}</span>
                            </span>
                            <Badge variant="ai">
                              Feasibility: {conflict.recommended_resolution.feasibility}
                            </Badge>
                          </div>
                          <p className="text-slate-700 text-[11px]">
                            {conflict.recommended_resolution.details}
                          </p>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ai"
                          size="sm"
                          disabled={resolvingId === conflict.conflict_id}
                          onClick={() => handleResolveConflict(conflict)}
                          className="text-xs font-bold flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Check className={`w-3.5 h-3.5 ${resolvingId === conflict.conflict_id ? 'animate-spin' : ''}`} />
                          <span>{resolvingId === conflict.conflict_id ? 'Applying...' : 'Apply Recommended Resolution'}</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DRAG-AND-DROP CONFLICT DETECTION & ALTERNATIVE TIME SLOTS        */}
      {/* ========================================================================= */}
      {rescheduleConflictModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-amber-600 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
                <div>
                  <h3 className="font-black text-sm text-white">
                    Corridor Possession Conflict Detected!
                  </h3>
                  <p className="text-[11px] text-red-100">
                    Automatic Timetable & Safety Radar flagged a timetable clash.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleConflictModal(prev => ({ ...prev, isOpen: false }))}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Conflict Explanation */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Proposed Reschedule Time Clashes with Passenger Operations</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Target Date: <strong>{rescheduleConflictModal.targetDate}</strong> at hour <strong>{rescheduleConflictModal.targetHour}:00</strong>.
                  Starting track possessions during daytime passenger corridors disrupts scheduled Vande Bharat and Shatabdi Express services.
                </p>
              </div>

              {/* Detected Conflicts */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Detailed Conflict Findings:
                </span>
                {rescheduleConflictModal.conflictData?.conflicts?.map((c, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-red-700 flex items-center justify-between">
                      <span>{c.title}</span>
                      <Badge variant="critical">{c.severity}</Badge>
                    </div>
                    <div className="text-slate-600 text-[11px]">{c.description}</div>
                  </div>
                ))}
              </div>

              {/* Recommended Alternative Safe Time Slots */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Recommended Safe Alternative Time Slots (Clear Headway):</span>
                </span>

                <div className="space-y-2">
                  {rescheduleConflictModal.conflictData?.alternative_time_slots?.map((slot) => (
                    <div
                      key={slot.slot_id}
                      className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        slot.recommended 
                          ? 'border-emerald-300 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-400'
                          : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900">{slot.title}</span>
                          {slot.recommended && (
                            <Badge variant="success" className="text-[10px]">Recommended</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <strong>Passenger Delay:</strong> {slot.passenger_delay_minutes} min | <strong>Freight Delay:</strong> {slot.freight_delay_minutes} min
                        </div>
                        <div className="text-[10px] text-emerald-800 font-medium">
                          💡 {slot.reason}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={slot.recommended ? 'ai' : 'outline'}
                        onClick={() => executeReschedule(
                          rescheduleConflictModal.blockId,
                          rescheduleConflictModal.targetDate,
                          rescheduleConflictModal.targetHour,
                          true,
                          slot
                        )}
                        className={`text-xs font-bold shrink-0 ${
                          slot.recommended ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                        }`}
                      >
                        Accept Safe Slot
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRescheduleConflictModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full sm:w-auto text-xs"
                >
                  Cancel Move
                </Button>

                <Button
                  variant="critical"
                  size="sm"
                  onClick={() => executeReschedule(
                    rescheduleConflictModal.blockId,
                    rescheduleConflictModal.targetDate,
                    rescheduleConflictModal.targetHour,
                    true
                  )}
                  className="w-full sm:w-auto text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Override & Reschedule Anyway (Caution Order)
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STANDALONE PROPOSED SCHEDULE CONFLICT CHECKER                    */}
      {/* ========================================================================= */}
      {isCheckerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Validate Proposed Block Schedule</h3>
              </div>
              <button
                onClick={() => setIsCheckerModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Run the 6-rule Indian Railways Conflict Radar on any proposed block before formal submission to the Divisional Controller.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={checkerForm.section_code}
                    onChange={(e) => setCheckerForm({ ...checkerForm, section_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="NDLS-TKD-UP">NDLS - TKD (UP Line)</option>
                    <option value="TKD-PWL-UP">TKD - PWL (UP Line)</option>
                    <option value="PWL-MTJ-UP">PWL - MTJ (UP Line)</option>
                    <option value="MTJ-AGC-UP">MTJ - AGC (UP Line)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={checkerForm.department_code}
                    onChange={(e) => setCheckerForm({ ...checkerForm, department_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="ENG">Civil Engineering (ENG)</option>
                    <option value="SNT">Signal & Telecom (SNT)</option>
                    <option value="TRD">Traction Distribution (TRD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Block Type</label>
                  <select
                    value={checkerForm.block_type}
                    onChange={(e) => setCheckerForm({ ...checkerForm, block_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                  >
                    <option value="Traffic">Traffic Block</option>
                    <option value="Power">Power Block</option>
                    <option value="Integrated">Integrated Block</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time (ISO)</label>
                  <input
                    type="text"
                    value={checkerForm.start_time}
                    onChange={(e) => setCheckerForm({ ...checkerForm, start_time: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="chk_pwr"
                    checked={checkerForm.required_power_block}
                    onChange={(e) => setCheckerForm({ ...checkerForm, required_power_block: e.target.checked })}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <label htmlFor="chk_pwr" className="font-bold text-slate-800 text-xs">
                    Requires 25kV Traction Power Block (Working within 2.0m of OHE)
                  </label>
                </div>
              </div>

              <Button
                variant="ai"
                onClick={handleRunConflictCheck}
                disabled={checkerLoading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-2"
              >
                <ShieldAlert className={`w-4 h-4 ${checkerLoading ? 'animate-spin' : ''}`} />
                <span>{checkerLoading ? 'Running 6-Rule Conflict Radar...' : 'Validate Schedule for Conflicts'}</span>
              </Button>

              {checkerResult && (
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 animate-in fade-in text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Conflict Radar Result:</span>
                      <div className="text-sm font-bold text-white">
                        {checkerResult.has_conflicts ? `${checkerResult.conflict_count} Conflicts Detected` : 'Zero Conflicts (Safe to Sanction)'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        checkerResult.risk_level === 'Critical' ? 'bg-red-500 text-white' :
                        checkerResult.risk_level === 'High' ? 'bg-amber-500 text-white' :
                        'bg-emerald-500 text-white'
                      }`}>
                        Risk: {checkerResult.risk_level}
                      </span>
                    </div>
                  </div>

                  {checkerResult.conflicts?.map((c, i) => (
                    <div key={i} className="bg-white/5 p-2.5 rounded-lg border border-white/10 space-y-1">
                      <div className="text-amber-400 font-bold">{c.title}</div>
                      <div className="text-slate-300 text-[11px]">{c.description}</div>
                      {c.recommended_resolution && (
                        <div className="text-emerald-400 text-[11px] font-semibold pt-1">
                          💡 Resolution: {c.recommended_resolution.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
