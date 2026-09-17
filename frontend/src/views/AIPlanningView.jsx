import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Sliders, 
  CheckCircle2, 
  TrendingDown, 
  Activity, 
  Layers, 
  ArrowRight, 
  Info, 
  Clock, 
  ShieldAlert, 
  Zap,
  Check,
  AlertTriangle,
  Flame,
  HelpCircle,
  Calculator,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  CheckCircle,
  Train,
  CheckCheck,
  ArrowUpRight,
  ShieldCheck,
  Award,
  Calendar,
  Database
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function AIPlanningView() {
  // Navigation tab: 'priorities' | 'recommendations' | 'optimizer'
  const [activeTab, setActiveTab] = useState('priorities');

  // AI Priorities State
  const [prioritiesData, setPrioritiesData] = useState({ summary: {}, priorities: [] });
  const [prioritiesLoading, setPrioritiesLoading] = useState(false);
  const [priorityFilterLevel, setPriorityFilterLevel] = useState('ALL');
  const [priorityDepartment, setPriorityDepartment] = useState('ALL');
  const [selectedPriorityItem, setSelectedPriorityItem] = useState(null);
  const [isExplainerModalOpen, setIsExplainerModalOpen] = useState(false);

  // Stored AI Recommendations State (PostgreSQL)
  const [recommendationsData, setRecommendationsData] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recFilterLevel, setRecFilterLevel] = useState('ALL');

  // Custom Task Calculator Modal State
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcForm, setCalcForm] = useState({
    task_code: 'D-1001',
    title: 'Turnout Point Machine Detection Overhaul & USFD Flaw Rectification',
    asset_type: 'Turnout Point Machine',
    asset_health: 35,
    criticality: 'Critical',
    urgency: 'Immediate',
    safety_impact: 'Derailment Risk',
    asset_availability_impact: 'Critical',
    overdue_status: 'Overdue',
    operational_impact: 'Critical',
    is_overdue: true,
    traffic_density_gmt: 60.0,
    estimated_duration_minutes: 180,
    required_traffic_block: true,
    required_power_block: true
  });
  const [calcResult, setCalcResult] = useState(null);

  const setScenarioPreset = (preset) => {
    if (preset === 'critical') {
      setCalcForm({
        task_code: 'D-1001',
        title: 'Turnout Point Machine Detection Overhaul & USFD Flaw Rectification',
        asset_type: 'Turnout Point Machine',
        asset_health: 35,
        criticality: 'Critical',
        urgency: 'Immediate',
        safety_impact: 'Derailment Risk',
        asset_availability_impact: 'Critical',
        overdue_status: 'Overdue',
        operational_impact: 'Critical',
        is_overdue: true,
        traffic_density_gmt: 65.0,
        estimated_duration_minutes: 180,
        required_traffic_block: true,
        required_power_block: true
      });
    } else if (preset === 'high') {
      setCalcForm({
        task_code: 'D-1002-HIGH',
        title: 'OHE Catenary Wire Dropper Fatigue Alignment',
        asset_type: '25kV Substation',
        asset_health: 65,
        criticality: 'High',
        urgency: 'Within 24 Hours',
        safety_impact: 'OHE Tripping Risk',
        asset_availability_impact: 'Medium',
        overdue_status: 'Within SLA',
        operational_impact: 'High',
        is_overdue: false,
        traffic_density_gmt: 48.0,
        estimated_duration_minutes: 150,
        required_traffic_block: true,
        required_power_block: true
      });
    } else if (preset === 'medium') {
      setCalcForm({
        task_code: 'D-1003-MED',
        title: 'Level Crossing Gate Barrier Motor Servicing',
        asset_type: 'Rail 60kg',
        asset_health: 75,
        criticality: 'Medium',
        urgency: 'Within 3 Days',
        safety_impact: 'Speed Restriction',
        asset_availability_impact: 'Medium',
        overdue_status: 'Within SLA',
        operational_impact: 'Medium',
        is_overdue: false,
        traffic_density_gmt: 38.0,
        estimated_duration_minutes: 90,
        required_traffic_block: false,
        required_power_block: false
      });
    } else if (preset === 'low') {
      setCalcForm({
        task_code: 'D-1004-LOW',
        title: 'Station Boundary Fence & Cess Maintenance',
        asset_type: 'Cess & Vegetation',
        asset_health: 95,
        criticality: 'Low',
        urgency: 'Routine',
        safety_impact: 'Low',
        asset_availability_impact: 'Low',
        overdue_status: 'Within SLA',
        operational_impact: 'Low',
        is_overdue: false,
        traffic_density_gmt: 25.0,
        estimated_duration_minutes: 60,
        required_traffic_block: false,
        required_power_block: false
      });
    }
  };

  // Optimizer State
  const [selectedSection, setSelectedSection] = useState('NDLS-TKD-UP');
  const [planningHorizon, setPlanningHorizon] = useState(48);
  const [weights, setWeights] = useState({
    assetAvailability: 0.40,
    delayPenalty: 0.35,
    synergyBonus: 0.25
  });
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('Plan_C');
  const [showExplainer, setShowExplainer] = useState(false);

  // Helpers
  const formatTime = (iso) => {
    if (!iso) return '--:--';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return iso;
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return '--';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } catch {
      return iso;
    }
  };

  // Fetch AI Priorities
  const fetchPriorities = useCallback(async () => {
    try {
      setPrioritiesLoading(true);
      const params = { limit: 50 };
      if (priorityFilterLevel !== 'ALL') params.level = priorityFilterLevel;
      if (priorityDepartment !== 'ALL') params.department = priorityDepartment;

      const res = await apiClient.get('/ai/priorities', { params });
      setPrioritiesData(res.data || { summary: {}, priorities: [] });
    } catch (err) {
      console.error("Failed to load AI priorities", err);
    } finally {
      setPrioritiesLoading(false);
    }
  }, [priorityFilterLevel, priorityDepartment]);

  // Fetch Stored AI Recommendations (PostgreSQL)
  const fetchRecommendations = useCallback(async () => {
    try {
      setRecsLoading(true);
      const params = { limit: 50 };
      if (recFilterLevel !== 'ALL') params.level = recFilterLevel;

      const res = await apiClient.get('/ai/recommendations', { params });
      setRecommendationsData(res.data?.recommendations || []);
    } catch (err) {
      console.error("Failed to load stored AI recommendations", err);
    } finally {
      setRecsLoading(false);
    }
  }, [recFilterLevel]);

  useEffect(() => {
    fetchPriorities();
  }, [fetchPriorities]);

  useEffect(() => {
    if (activeTab === 'recommendations') {
      fetchRecommendations();
    }
  }, [activeTab, fetchRecommendations]);

  // Execute single task calculation
  const handleRunTaskCalculation = async () => {
    try {
      setCalcLoading(true);
      const res = await apiClient.post('/ai/priority', calcForm);
      setCalcResult(res.data);
      fetchRecommendations();
    } catch (err) {
      console.error("Failed to score task", err);
    } finally {
      setCalcLoading(false);
    }
  };

  // Run CP-SAT Optimizer with backend endpoint
  const handleRunOptimizer = async (customPayload = null) => {
    try {
      setOptimizing(true);
      const payload = customPayload || {
        section: selectedSection,
        date_range: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + planningHorizon * 3600 * 1000).toISOString()
        }
      };
      const res = await apiClient.post('/ai/optimize-blocks', payload);
      setOptimizationResult(res.data);
    } catch (err) {
      console.error("Optimization run failed", err);
    } finally {
      setOptimizing(false);
    }
  };

  // Run specific scenario: Critical track defect scheduled during low-traffic night window
  const handleRunCriticalScenario = () => {
    const baseDate = new Date();
    const isoDateStr = baseDate.toISOString().split('T')[0];
    const scenarioPayload = {
      section: selectedSection,
      maintenance_tasks: [
        {
          task_code: 'D-1001',
          title: 'Turnout Point Machine Detection Overhaul & USFD Flaw Rectification',
          priority_score: 92,
          criticality: 'Critical',
          urgency: 'Immediate',
          safety_impact: 'Derailment Risk',
          duration_minutes: 180,
          department: 'ENG',
          required_resources: 'P-Way Machine Gang & USFD Trolley',
          speed_restriction_imposed: 30
        },
        {
          task_code: 'S-204',
          title: 'Digital Axle Counter & Point Machine Detection Alignment',
          priority_score: 84,
          criticality: 'Critical',
          urgency: 'Immediate',
          safety_impact: 'Signal Failure Risk',
          duration_minutes: 120,
          department: 'SNT',
          required_resources: 'S&T Signal Calibration Crew',
          speed_restriction_imposed: 0
        },
        {
          task_code: 'T-305',
          title: '25kV Traction Catenary Wire Tension Adjustment',
          priority_score: 75,
          criticality: 'High',
          urgency: 'Within 24 Hours',
          safety_impact: 'OHE Tripping Risk',
          duration_minutes: 120,
          department: 'TRD',
          required_resources: 'TRD Tower Wagon',
          speed_restriction_imposed: 0
        }
      ],
      available_blocks: [
        {
          window_code: 'WIN-NIGHT-01',
          name: 'Night Off-Peak Window (Low Traffic)',
          start_time: `${isoDateStr}T01:30:00`,
          end_time: `${isoDateStr}T04:30:00`,
          is_low_traffic: true
        },
        {
          window_code: 'WIN-DAY-01',
          name: 'Morning Peak Inter-City Window',
          start_time: `${isoDateStr}T07:00:00`,
          end_time: `${isoDateStr}T10:00:00`,
          is_low_traffic: false
        },
        {
          window_code: 'WIN-AFT-01',
          name: 'Afternoon Express Transit Slot',
          start_time: `${isoDateStr}T13:30:00`,
          end_time: `${isoDateStr}T16:30:00`,
          is_low_traffic: false
        }
      ],
      train_schedule: [
        {
          train_no: '22436',
          train_name: 'Vande Bharat Express',
          train_type: 'Vande_Bharat',
          is_freight: false,
          scheduled_departure: `${isoDateStr}T06:00:00`,
          scheduled_arrival: `${isoDateStr}T06:40:00`
        },
        {
          train_no: '12002',
          train_name: 'Bhopal Shatabdi Express',
          train_type: 'Shatabdi',
          is_freight: false,
          scheduled_departure: `${isoDateStr}T06:15:00`,
          scheduled_arrival: `${isoDateStr}T07:00:00`
        },
        {
          train_no: '12952',
          train_name: 'Mumbai Rajdhani Express',
          train_type: 'Rajdhani',
          is_freight: false,
          scheduled_departure: `${isoDateStr}T16:55:00`,
          scheduled_arrival: `${isoDateStr}T17:35:00`
        },
        {
          train_no: 'G-8821',
          train_name: 'BOXN Heavy Haul Coal Freight',
          train_type: 'Freight_Coal',
          is_freight: true,
          scheduled_departure: `${isoDateStr}T02:30:00`,
          scheduled_arrival: `${isoDateStr}T03:15:00`
        }
      ]
    };
    handleRunOptimizer(scenarioPayload);
  };

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'High':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'Medium':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Low':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  const getScoreColorClass = (score) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-amber-600';
    if (score >= 40) return 'text-blue-600';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span>AI Maintenance & Block Intelligence Engine</span>
            </h2>
            <Badge variant="ai">SIMULATED DEMO DATA</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Indian Railways SIH26027 — Explainable 6-Factor Maintenance Priority Ranking & OR-Tools CP-SAT Block Optimization.
          </p>
        </div>

        {/* Tab Navigation Switches */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('priorities')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'priorities'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>AI Maintenance Priority Engine</span>
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'recommendations'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Stored AI Recommendations (DB)</span>
          </button>
          <button
            onClick={() => setActiveTab('optimizer')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'optimizer'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>OR-Tools CP-SAT Optimizer</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI MAINTENANCE PRIORITY ENGINE                                     */}
      {/* ========================================================================= */}
      {activeTab === 'priorities' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <Card className="bg-white border border-slate-200 shadow-xs p-3">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ranked Tasks</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {prioritiesData.summary?.total_ranked || 0}
              </div>
              <span className="text-[10px] text-slate-400">Active backlog</span>
            </Card>

            <Card className="bg-red-50/50 border border-red-200 shadow-xs p-3">
              <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider flex items-center space-x-1">
                <Flame className="w-3 h-3" />
                <span>Critical (80-100)</span>
              </span>
              <div className="text-2xl font-black text-red-600 mt-1">
                {prioritiesData.summary?.critical_count || 0}
              </div>
              <span className="text-[10px] text-red-500">Immediate sanction</span>
            </Card>

            <Card className="bg-amber-50/50 border border-amber-200 shadow-xs p-3">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>High (60-79)</span>
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {prioritiesData.summary?.high_count || 0}
              </div>
              <span className="text-[10px] text-amber-500">Within 24-48 hrs</span>
            </Card>

            <Card className="bg-blue-50/50 border border-blue-200 shadow-xs p-3">
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Medium (40-59)</span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {prioritiesData.summary?.medium_count || 0}
              </div>
              <span className="text-[10px] text-blue-500">Weekly window</span>
            </Card>

            <Card className="bg-emerald-50/50 border border-emerald-200 shadow-xs p-3">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Low (0-39)</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {prioritiesData.summary?.low_count || 0}
              </div>
              <span className="text-[10px] text-emerald-500">Routine preventive</span>
            </Card>

            <Card className="bg-purple-50/50 border border-purple-200 shadow-xs p-3">
              <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Avg Priority</span>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {prioritiesData.summary?.average_score || 0}
              </div>
              <span className="text-[10px] text-purple-500">Scale 0 - 100</span>
            </Card>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            {/* Level Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setPriorityFilterLevel(lvl)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    priorityFilterLevel === lvl
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            {/* Department & Calculator Buttons */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <select
                value={priorityDepartment}
                onChange={(e) => setPriorityDepartment(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
              >
                <option value="ALL">All Departments</option>
                <option value="ENG">Civil (ENG)</option>
                <option value="SNT">Signal (S&T)</option>
                <option value="TRD">Traction (TRD)</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchPriorities}
                disabled={prioritiesLoading}
                className="flex items-center space-x-1 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${prioritiesLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              <Button
                variant="ai"
                size="sm"
                onClick={() => {
                  setCalcResult(null);
                  setIsCalcModalOpen(true);
                }}
                className="flex items-center space-x-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Test Task D-1001</span>
              </Button>
            </div>
          </div>

          {/* Ranked Tasks Table */}
          <Card className="shadow-xs overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Priority Rank & Score</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Task Code & Description</th>
                    <th className="py-3 px-4">Dept / Location</th>
                    <th className="py-3 px-4">Transparent AI Reasons</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prioritiesLoading ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                        <span>Evaluating AI multi-criteria priorities...</span>
                      </td>
                    </tr>
                  ) : prioritiesData.priorities?.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-400">
                        No maintenance tasks match the active filters.
                      </td>
                    </tr>
                  ) : (
                    prioritiesData.priorities?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        {/* Score */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <span className="text-xs font-mono font-bold text-slate-400 w-5">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className={`text-base font-black ${getScoreColorClass(item.priority_score)}`}>
                                {item.priority_score}
                                <span className="text-[10px] text-slate-400 font-normal"> /100</span>
                              </div>
                              <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-0.5">
                                <div
                                  className={`h-full ${
                                    item.priority_score >= 80 ? 'bg-red-500' :
                                    item.priority_score >= 60 ? 'bg-amber-500' :
                                    item.priority_score >= 40 ? 'bg-blue-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${item.priority_score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Level */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getLevelBadgeClass(item.priority_level)}`}>
                            {item.priority_level}
                          </span>
                        </td>

                        {/* Task */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono text-[11px]">
                            {item.task?.task_code}
                          </div>
                          <div className="text-slate-600 line-clamp-1 max-w-xs text-[11px]">
                            {item.task?.title}
                          </div>
                        </td>

                        {/* Dept / Location */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700">{item.task?.department}</span>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {item.task?.location || 'Mainline'}
                          </div>
                        </td>

                        {/* Reasons */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {item.reasons?.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  r.includes('Safety') ? 'bg-red-100 text-red-700' :
                                  r.includes('criticality') ? 'bg-purple-100 text-purple-700' :
                                  r.includes('overdue') ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-700'
                                }`}
                              >
                                • {r}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Inspect Button */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPriorityItem(item);
                              setIsExplainerModalOpen(true);
                            }}
                            className="text-[11px] h-7 px-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <span>Inspect 6 Factors</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STORED AI RECOMMENDATIONS (POSTGRESQL DATABASE)                   */}
      {/* ========================================================================= */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Header & Filter Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-900">
                  Database AI Recommendations (`ai_priority_recommendations`)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparent 6-factor evaluations permanently saved to PostgreSQL. Filter by priority tier and inspect factor breakdowns.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setRecFilterLevel(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      recFilterLevel === lvl
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecommendations}
                disabled={recsLoading}
                className="flex items-center space-x-1 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${recsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {/* Stored Table */}
          <Card className="shadow-xs overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Level</th>
                    <th className="py-3 px-4">Task / Defect</th>
                    <th className="py-3 px-4">Dept</th>
                    <th className="py-3 px-4">6 Factors Summary</th>
                    <th className="py-3 px-4">Decision Reasons</th>
                    <th className="py-3 px-4">Recommended Window</th>
                    <th className="py-3 px-4">Stored At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {recsLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                        <span>Loading saved recommendations from database...</span>
                      </td>
                    </tr>
                  ) : recommendationsData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        No stored recommendations found matching filter.
                      </td>
                    </tr>
                  ) : (
                    recommendationsData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Score */}
                        <td className="py-3 px-4">
                          <div className={`text-base font-black ${getScoreColorClass(item.priority_score)}`}>
                            {item.priority_score}
                            <span className="text-[10px] text-slate-400 font-normal">/100</span>
                          </div>
                        </td>

                        {/* Level */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getLevelBadgeClass(item.priority_level)}`}>
                            {item.priority_level}
                          </span>
                        </td>

                        {/* Task */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono text-[11px]">
                            {item.task_code}
                          </div>
                          <div className="text-slate-600 line-clamp-1 max-w-xs text-[11px]">
                            {item.title}
                          </div>
                        </td>

                        {/* Dept */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-700">{item.department_code || 'ENG'}</span>
                        </td>

                        {/* 6 Factors Summary */}
                        <td className="py-3 px-4">
                          <div className="text-[10px] space-y-0.5 text-slate-600">
                            <div><span className="font-bold">Crit:</span> {item.criticality || 'Critical'}</div>
                            <div><span className="font-bold">Urg:</span> {item.urgency || 'Immediate'}</div>
                            <div><span className="font-bold">Safety:</span> {item.safety_impact || 'Low'}</div>
                          </div>
                        </td>

                        {/* Reasons */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.reasons?.map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  r.includes('Safety') ? 'bg-red-100 text-red-700' :
                                  r.includes('criticality') ? 'bg-purple-100 text-purple-700' :
                                  r.includes('overdue') ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-700'
                                }`}
                              >
                                • {r}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Recommended Window */}
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-semibold text-slate-700">
                            {item.recommended_window || 'Scheduled Block'}
                          </span>
                        </td>

                        {/* Stored At */}
                        <td className="py-3 px-4 text-[10px] text-slate-400">
                          {formatDateTime(item.created_at)}
                        </td>

                        {/* Inspect Button */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPriorityItem(item);
                              setIsExplainerModalOpen(true);
                            }}
                            className="text-[11px] h-7 px-2 border-purple-200 text-purple-700 hover:bg-purple-50"
                          >
                            <span>Inspect 6 Factors</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: OR-TOOLS CP-SAT OPTIMIZER                                          */}
      {/* ========================================================================= */}
      {activeTab === 'optimizer' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Solver Controls & Scenario Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                      <span>Google OR-Tools CP-SAT Block Optimization Engine</span>
                      <Badge variant="ai">Deterministic (Seed 42)</Badge>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Constraint Programming solver enforcing zero passenger delay on premier trains, asset availability maximization, and cross-department shadow block synergy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunCriticalScenario()}
                  disabled={optimizing}
                  className="flex items-center space-x-1.5 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Solve Critical Track Defect Scenario</span>
                </Button>

                <Button
                  variant="ai"
                  size="sm"
                  onClick={() => handleRunOptimizer()}
                  disabled={optimizing}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  <Cpu className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
                  <span>{optimizing ? 'Executing CP-SAT Solver...' : 'Run Optimizer on Backlog'}</span>
                </Button>
              </div>
            </div>

            {/* Corridor & Horizon Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Corridor Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                >
                  <option value="NDLS-TKD-UP">NDLS-TKD-UP (New Delhi - Tuglakabad UP Fast)</option>
                  <option value="TKD-PWL-UP">TKD-PWL-UP (Tuglakabad - Palwal Mainline)</option>
                  <option value="PWL-MTJ-UP">PWL-MTJ-UP (Palwal - Mathura HDN Quadruple)</option>
                  <option value="MTJ-AGC-UP">MTJ-AGC-UP (Mathura - Agra Cantt Gatimaan Section)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Planning Horizon</label>
                <select
                  value={planningHorizon}
                  onChange={(e) => setPlanningHorizon(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-800"
                >
                  <option value={24}>Next 24 Hours (Immediate Possession)</option>
                  <option value={48}>Next 48 Hours (Rolling Two-Day Plan)</option>
                  <option value={72}>Next 72 Hours (Weekly Corridor Plan)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Solver Preset</label>
                <div className="flex items-center space-x-2 p-2 bg-purple-50/60 rounded-lg border border-purple-100 text-[11px] text-purple-800 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>Zero Passenger Disruption Mode (Heavy Express Penalty)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Solver Configuration Panel */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>Multi-Objective Function Weights</span>
              </CardTitle>
              <p className="text-xs text-slate-500">
                Tune constraint programming objective weights before executing the solver.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-700">Asset Availability Maximization:</span>
                    <span className="font-mono text-purple-700 font-bold">{Math.round(weights.assetAvailability * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={weights.assetAvailability}
                    onChange={(e) => setWeights({ ...weights, assetAvailability: parseFloat(e.target.value) })}
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Prioritizes clearing critical track weld flaws and caution orders.</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-700">Passenger Delay Minimization:</span>
                    <span className="font-mono text-blue-700 font-bold">{Math.round(weights.delayPenalty * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={weights.delayPenalty}
                    onChange={(e) => setWeights({ ...weights, delayPenalty: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Penalizes schedule conflicts on Vande Bharat, Rajdhani & Shatabdi.</p>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-slate-700">Multi-Dept Synergy Bonus:</span>
                    <span className="font-mono text-emerald-700 font-bold">{Math.round(weights.synergyBonus * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={weights.synergyBonus}
                    onChange={(e) => setWeights({ ...weights, synergyBonus: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Rewards bundling Civil, Signal, and Traction into Integrated blocks.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State Prompt */}
          {!optimizationResult && !optimizing && (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-black text-slate-900">Run Automatic CP-SAT Optimization</h4>
                <p className="text-xs text-slate-500">
                  Click below to trigger the Google OR-Tools CP-SAT solver. The engine evaluates candidate windows, enforces safety headways, bundles cross-department tasks, and eliminates passenger train regulation.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <Button
                  variant="ai"
                  onClick={() => handleRunCriticalScenario()}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Solve Critical Defect Low-Traffic Scenario</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRunOptimizer()}
                  className="text-xs font-semibold"
                >
                  <span>Solve Active Database Backlog</span>
                </Button>
              </div>
            </div>
          )}

          {/* Optimization Results Section */}
          {optimizationResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Solver Info & Explainable Reasoning Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white rounded-2xl p-5 border border-purple-900 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-800/60 pb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="font-extrabold text-sm tracking-wide text-white">
                      CP-SAT Explainable Decision Reasoning
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold border border-purple-400/30">
                      {optimizationResult.solver_info?.engine || 'Google OR-Tools CP-SAT'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-400/30">
                      Status: {optimizationResult.solver_info?.status || 'OPTIMAL'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-purple-200">
                    <span className="font-mono">Seed: {optimizationResult.solver_info?.deterministic_seed || 42} (100% Deterministic)</span>
                    <Badge variant="ai">SIMULATED DEMO DATA</Badge>
                  </div>
                </div>

                <div className="text-xs leading-relaxed text-purple-100 font-medium bg-white/5 p-3.5 rounded-xl border border-white/10">
                  <p className="italic">
                    "{optimizationResult.reasoning}"
                  </p>
                </div>
              </div>

              {/* 4 Top Impact KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Passenger Train Delay */}
                <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Passenger Delay</span>
                    <Train className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                    {optimizationResult.estimated_train_impact?.passenger_delay_minutes || 0} min
                  </div>
                  <div className="mt-1 flex items-center space-x-1 text-[11px] text-emerald-700 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Premier Trains 100% Protected</span>
                  </div>
                </Card>

                {/* KPI 2: Asset Availability Gain */}
                <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Asset Availability Gain</span>
                    <Activity className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-600 mt-1 font-mono">
                    +{optimizationResult.asset_availability_improvement?.availability_gain_pct || 0}%
                  </div>
                  <div className="mt-1 flex items-center space-x-1 text-[11px] text-purple-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Line Speed 130 km/h Restored</span>
                  </div>
                </Card>

                {/* KPI 3: Block Possession Utilization */}
                <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Window Utilization</span>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-600 mt-1 font-mono">
                    {optimizationResult.recommended_block?.utilization_pct || 0}%
                  </div>
                  <div className="mt-1 flex items-center space-x-1 text-[11px] text-blue-700 font-bold">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Full Window Scheduled</span>
                  </div>
                </Card>

                {/* KPI 4: Multi-Department Synergy */}
                <Card className="p-4 bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                    <span>Coordinated Departments</span>
                    <Layers className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-black text-indigo-600 mt-1 font-mono">
                    {optimizationResult.recommended_block?.departments?.join(' + ') || 'ENG'}
                  </div>
                  <div className="mt-1 flex items-center space-x-1 text-[11px] text-indigo-700 font-bold">
                    <Award className="w-3.5 h-3.5" />
                    <span>Integrated Shadow Block</span>
                  </div>
                </Card>
              </div>

              {/* Recommended Block Header Card */}
              {optimizationResult.recommended_block && (
                <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
                        OPT
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-purple-700">
                            {optimizationResult.recommended_block.block_code}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold uppercase">
                            {optimizationResult.recommended_block.block_type} Block
                          </span>
                          {optimizationResult.recommended_block.is_low_traffic_window && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center space-x-1">
                              <span>🌙 Off-Peak Low Traffic Window</span>
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-black text-slate-900 mt-0.5">
                          Section: {optimizationResult.recommended_block.section_code} • Slot {optimizationResult.recommended_block.window_code}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-semibold">Possession Duration</div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        {optimizationResult.recommended_block.duration_minutes} Mins
                        <span className="text-xs text-slate-400 font-normal"> ({(optimizationResult.recommended_block.duration_minutes / 60).toFixed(1)} hrs)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 font-medium">Scheduled Timing:</span>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {formatTime(optimizationResult.recommended_block.start_time)} — {formatTime(optimizationResult.recommended_block.end_time)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Lead Department:</span>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {optimizationResult.recommended_block.lead_department}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Bundled Departments:</span>
                      <div className="font-bold text-purple-700 mt-0.5">
                        {optimizationResult.recommended_block.departments?.join(', ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Tasks Scheduled:</span>
                      <div className="font-bold text-slate-900 mt-0.5">
                        {optimizationResult.recommended_block.total_tasks_scheduled} Tasks Coordinated
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Scheduled Maintenance Tasks Table */}
              <Card className="shadow-xs overflow-hidden border border-slate-200">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black text-slate-900 flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span>Scheduled Maintenance Tasks in Optimized Possession</span>
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tasks mathematically sequenced to prevent machine contention and maximize track availability.
                      </p>
                    </div>
                    <Badge variant="ai">{optimizationResult.scheduled_tasks?.length || 0} Tasks</Badge>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Task Code & Description</th>
                        <th className="py-2.5 px-4">Priority Score</th>
                        <th className="py-2.5 px-4">Dept</th>
                        <th className="py-2.5 px-4">Scheduled Slot</th>
                        <th className="py-2.5 px-4">Duration</th>
                        <th className="py-2.5 px-4">Assigned Resources</th>
                        <th className="py-2.5 px-4 text-right">Safety Impact Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {optimizationResult.scheduled_tasks?.map((task, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="font-mono font-bold text-purple-700 text-[11px]">
                              {task.task_code}
                            </div>
                            <div className="font-medium text-slate-900 max-w-xs truncate text-[11px]">
                              {task.title}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center space-x-2">
                              <span className={`font-black font-mono text-sm ${getScoreColorClass(task.priority_score)}`}>
                                {task.priority_score}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${getLevelBadgeClass(task.criticality)}`}>
                                {task.criticality}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                              {task.department}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-700 text-[11px]">
                            {formatTime(task.scheduled_start)} — {formatTime(task.scheduled_end)}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                            {task.duration_minutes}m
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                            {task.required_resources || 'P-Way Gang'}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {task.speed_restriction_imposed > 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                                Restores 130 km/h (SR Cleared)
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                                Preventive Possession
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              {/* Corridor Train Schedule Impact Table */}
              <Card className="shadow-xs overflow-hidden border border-slate-200">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-black text-slate-900 flex items-center space-x-2">
                        <Train className="w-4 h-4 text-emerald-600" />
                        <span>Corridor Train Disruption Analysis</span>
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        High-priority express services (Vande Bharat, Rajdhani, Shatabdi) evaluated for right-of-way safety buffers.
                      </p>
                    </div>
                    <Badge variant="outline">
                      {optimizationResult.affected_trains?.length || 0} Corridor Services Evaluated
                    </Badge>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Train Number & Name</th>
                        <th className="py-2.5 px-4">Service Type</th>
                        <th className="py-2.5 px-4">Delay Incurred</th>
                        <th className="py-2.5 px-4">Operational Regulation Action</th>
                        <th className="py-2.5 px-4 text-right">Impact Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {optimizationResult.affected_trains?.map((tr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {tr.train_no}
                            </span>
                            <div className="text-slate-600 font-medium text-[11px]">
                              {tr.train_name}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tr.train_type?.includes('Vande') ? 'bg-purple-100 text-purple-800' :
                              tr.train_type?.includes('Rajdhani') ? 'bg-red-100 text-red-800' :
                              tr.train_type?.includes('Shatabdi') ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {tr.train_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            {tr.delay_minutes === 0 ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>0 min (On-Time)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                                <Clock className="w-3 h-3" />
                                <span>+{tr.delay_minutes} min (Regulated)</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-800 text-[11px]">
                            {tr.regulation_action}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-500 text-[11px]">
                            {tr.impact}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Strategic Window Alternatives (Tradeoff Comparison) */}
              {optimizationResult.alternative_blocks?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                        <Sliders className="w-4 h-4 text-slate-700" />
                        <span>Alternative Candidate Windows Evaluated by Solver</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Sub-optimal alternatives ranked lower by CP-SAT solver due to passenger delays or lower utilization.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {optimizationResult.alternative_blocks.map((alt, idx) => (
                      <Card key={idx} className="p-4 bg-white border border-slate-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Alternative #{idx + 1}
                            </span>
                            <div className="text-xs font-black text-slate-900">{alt.strategy_name}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700 text-[10px] font-bold">
                            {alt.window_code}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <span className="text-slate-400 text-[10px]">Timing:</span>
                            <div className="font-bold text-slate-800">
                              {formatTime(alt.start_time)} — {formatTime(alt.end_time)}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Duration:</span>
                            <div className="font-bold text-slate-800">{alt.duration_minutes} Minutes</div>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Passenger Delay:</span>
                            <div className={`font-black ${alt.passenger_delay_minutes > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {alt.passenger_delay_minutes} Minutes
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px]">Window Utilization:</span>
                            <div className="font-bold text-blue-700">{alt.utilization_pct}%</div>
                          </div>
                        </div>

                        <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                          {alt.passenger_delay_minutes > 0 ? (
                            <span className="text-amber-700 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>Sub-optimal: Introduces {alt.passenger_delay_minutes} min passenger regulation during daytime express traffic.</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              Viable fallback window with lower available track possession duration.
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INSPECT 6 FACTORS EXPLAINABILITY MODAL                           */}
      {/* ========================================================================= */}
      {isExplainerModalOpen && selectedPriorityItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-900">
                  AI Explainability: 6-Factor Priority Scoring
                </h3>
              </div>
              <button
                onClick={() => setIsExplainerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Task Header */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-purple-700">
                    {selectedPriorityItem.task?.task_code || selectedPriorityItem.task_code}
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedPriorityItem.task?.title || selectedPriorityItem.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {selectedPriorityItem.task?.department || selectedPriorityItem.department_code || 'ENG'} • {selectedPriorityItem.task?.location || 'Mainline Section'}
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-3xl font-black ${getScoreColorClass(selectedPriorityItem.priority_score)}`}>
                    {selectedPriorityItem.priority_score}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getLevelBadgeClass(selectedPriorityItem.priority_level)}`}>
                    {selectedPriorityItem.priority_level}
                  </span>
                </div>
              </div>

              {/* Reasons */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Decision Reasons
                </h4>
                <div className="space-y-1.5">
                  {selectedPriorityItem.reasons?.map((r, i) => (
                    <div key={i} className="flex items-start space-x-2 text-xs bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                      <CheckCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <span className="font-medium text-slate-800">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6 Factors Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Transparent 6-Factor Points Calculation
                </h4>
                <div className="space-y-2.5">
                  {selectedPriorityItem.factor_breakdown && Object.entries(selectedPriorityItem.factor_breakdown).map(([key, f]) => (
                    <div key={key} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-slate-800 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                        <span className="font-mono font-bold text-purple-700">
                          {f.score} / {f.max_score} pts ({f.weight_pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${(f.score / f.max_score) * 100}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {f.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExplainerModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CUSTOM TASK D-1001 CALCULATOR MODAL                              */}
      {/* ========================================================================= */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Calculator className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-slate-900">
                  AI Maintenance Priority Simulator (Task D-1001)
                </h3>
              </div>
              <button
                onClick={() => setIsCalcModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Scenario Presets Bar */}
              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100 space-y-1.5">
                <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block">
                  Quick Load Test Scenarios:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setScenarioPreset('critical')}
                    className="px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold text-left shadow-xs transition-all"
                  >
                    <div className="flex items-center space-x-1">
                      <Flame className="w-3 h-3 shrink-0" />
                      <span>Critical (80-100)</span>
                    </div>
                    <div className="text-[9px] text-red-200 font-normal truncate">D-1001 Turnout USFD</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScenarioPreset('high')}
                    className="px-2 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold text-left shadow-xs transition-all"
                  >
                    <div className="flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>High (60-79)</span>
                    </div>
                    <div className="text-[9px] text-amber-200 font-normal truncate">OHE Wire Sag</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScenarioPreset('medium')}
                    className="px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold text-left shadow-xs transition-all"
                  >
                    <div className="flex items-center space-x-1">
                      <Activity className="w-3 h-3 shrink-0" />
                      <span>Medium (40-59)</span>
                    </div>
                    <div className="text-[9px] text-blue-200 font-normal truncate">LC Gate Motor</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScenarioPreset('low')}
                    className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold text-left shadow-xs transition-all"
                  >
                    <div className="flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Low (0-39)</span>
                    </div>
                    <div className="text-[9px] text-emerald-200 font-normal truncate">Boundary Fence</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Task Code</label>
                  <input
                    type="text"
                    value={calcForm.task_code}
                    onChange={(e) => setCalcForm({ ...calcForm, task_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Asset Criticality</label>
                  <select
                    value={calcForm.criticality}
                    onChange={(e) => setCalcForm({ ...calcForm, criticality: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="Critical">Critical (18 pts max)</option>
                    <option value="High">High (14 pts max)</option>
                    <option value="Medium">Medium (10 pts max)</option>
                    <option value="Low">Low (5 pts max)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Safety Impact</label>
                  <select
                    value={calcForm.safety_impact}
                    onChange={(e) => setCalcForm({ ...calcForm, safety_impact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="Derailment Risk">Derailment Risk (25 pts)</option>
                    <option value="Signal Failure Risk">Signal Failure Risk (21 pts)</option>
                    <option value="OHE Tripping Risk">OHE Tripping Risk (18 pts)</option>
                    <option value="Speed Restriction">Speed Restriction (16 pts)</option>
                    <option value="Low">Low (5 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={calcForm.urgency}
                    onChange={(e) => setCalcForm({ ...calcForm, urgency: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="Immediate">Immediate (20 pts)</option>
                    <option value="Within 24 Hours">Within 24 Hours (15 pts)</option>
                    <option value="Within 3 Days">Within 3 Days (10 pts)</option>
                    <option value="Routine">Routine (4 pts)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Asset Availability Impact</label>
                  <select
                    value={calcForm.asset_availability_impact}
                    onChange={(e) => setCalcForm({ ...calcForm, asset_availability_impact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="Critical">Critical (12 pts - Combined Traffic & Power Block)</option>
                    <option value="High">High (10 pts - Traffic Block & Long Duration)</option>
                    <option value="Medium">Medium (6 pts - Standard Corridor Possession)</option>
                    <option value="Low">Low (3 pts - Minimal Availability Disruption)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operational Impact</label>
                  <select
                    value={calcForm.operational_impact}
                    onChange={(e) => setCalcForm({ ...calcForm, operational_impact: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  >
                    <option value="Critical">Critical (15 pts - HDN Trunk Corridor \u003e 60 GMT)</option>
                    <option value="High">High (13 pts - Heavy Freight / Passenger Trunk)</option>
                    <option value="Medium">Medium (8 pts - Branch Line Traffic)</option>
                    <option value="Low">Low (3 pts - Low Density Siding / Loop)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_overdue"
                    checked={calcForm.is_overdue}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCalcForm({
                        ...calcForm,
                        is_overdue: checked,
                        overdue_status: checked ? 'Overdue' : 'Within SLA'
                      });
                    }}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <label htmlFor="is_overdue" className="font-bold text-slate-800">
                    Maintenance Overdue (SLA Exceeded - 8 to 10 pts)
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="req_traffic"
                    checked={calcForm.required_traffic_block}
                    onChange={(e) => setCalcForm({ ...calcForm, required_traffic_block: e.target.checked })}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <label htmlFor="req_traffic" className="font-bold text-slate-800">
                    Requires Traffic Possession Block
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="ai"
                  onClick={handleRunTaskCalculation}
                  disabled={calcLoading}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-2"
                >
                  <Sparkles className={`w-4 h-4 ${calcLoading ? 'animate-spin' : ''}`} />
                  <span>{calcLoading ? 'Calculating 6-Factor Score...' : 'Score Task with AI (POST /api/ai/priority)'}</span>
                </Button>
              </div>

              {/* Instant Output Preview */}
              {calcResult && (
                <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-xs text-slate-400">Task {calcResult.task?.task_code}</span>
                      <div className="text-sm font-bold text-white">{calcResult.task?.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-red-400">
                        Score: {calcResult.priority_score}
                      </div>
                      <div className="text-xs font-bold text-red-300 uppercase">
                        Level: {calcResult.priority_level}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider block mb-1">
                      Reasons:
                    </span>
                    <ul className="space-y-1">
                      {calcResult.reasons?.map((r, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-center space-x-2">
                          <span className="text-purple-400 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
