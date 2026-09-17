import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { 
  Database, 
  Search, 
  Filter, 
  Activity, 
  Layers, 
  Server, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock,
  X,
  RefreshCw,
  Cpu,
  ArrowRight,
  Sparkles,
  Info,
  Wrench,
  Eye
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function AssetsView() {
  const { activeUser } = useOutletContext() || {};

  const currentRole = (activeUser?.canonical_role || activeUser?.role || localStorage.getItem('ir_user_role') || 'ENGINEERING').toUpperCase();
  const userDept = (activeUser?.department || localStorage.getItem('ir_user_dept') || 'ENG').toUpperCase();
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'ADMINISTRATOR';

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState(isAdmin ? 'ALL' : userDept);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Approved AI Recommendations state (Official Updates)
  const [approvedRecommendations, setApprovedRecommendations] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [selectedApprovedRec, setSelectedApprovedRec] = useState(null);

  // Predictive Maintenance Modal state
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isMLModalOpen, setIsMLModalOpen] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlResult, setMlResult] = useState(null);
  const [mlError, setMlError] = useState(null);

  // Keep departmentFilter synced if user switches
  useEffect(() => {
    if (!isAdmin) {
      setDepartmentFilter(userDept);
    }
  }, [isAdmin, userDept]);

  const fetchApprovedRecommendations = useCallback(async () => {
    try {
      setLoadingApproved(true);
      const params = {};
      if (!isAdmin) {
        params.department_code = userDept;
      }
      const res = await apiClient.get('/ai/recommendations/approved', { params });
      setApprovedRecommendations(res.data.recommendations || []);
    } catch (err) {
      console.error("Failed to load approved recommendations", err);
      setApprovedRecommendations([]);
    } finally {
      setLoadingApproved(false);
    }
  }, [isAdmin, userDept]);

  useEffect(() => {
    fetchApprovedRecommendations();
  }, [fetchApprovedRecommendations]);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Non-admin users are strictly locked to their department code
      if (!isAdmin) {
        params.department_code = userDept;
      } else if (departmentFilter !== 'ALL') {
        params.department_code = departmentFilter;
      }

      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.get('/assets', { params });
      setAssets(res.data.assets || []);
    } catch (err) {
      console.error("Failed to load assets", err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userDept, departmentFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAssets();
  };

  const getDepartmentName = (code) => {
    switch (code) {
      case 'ENG': return 'Civil Engineering (P-Way)';
      case 'TRD': return 'Traction Distribution (TRD)';
      case 'SNT': return 'Signal & Telecom (S&T)';
      default: return code;
    }
  };

  // Helper to format feature labels nicely
  const formatFeatureName = (feat) => {
    const map = {
      rail_wear_mm: 'Rail Wear',
      train_age_years: 'Asset Age',
      brake_pad_wear_percent: 'Brake Pad Wear',
      brake_pressure_psi: 'Brake Pressure',
      battery_voltage: 'Battery Voltage',
      wheel_wear_percent: 'Wheel Wear',
      humidity_percent: 'Humidity',
      track_vibration_level: 'Track Vibration',
      bearing_temperature_c: 'Bearing Temperature',
      axle_temperature_c: 'Axle Temperature',
      rainfall_mm: 'Rainfall',
      sensor_health_index: 'Sensor Health Index',
      inspection_score: 'Inspection Score',
      last_maintenance_days: 'Days Since Last Maintenance',
      distance_travelled_km: 'Distance Travelled',
      average_speed_kmph: 'Average Operating Speed',
      delay_minutes: 'Cascading Delay',
      ambient_temperature_c: 'Ambient Temperature'
    };
    return map[feat] || feat.replace(/_/g, ' ');
  };

  const formatFeatureValue = (feat, val) => {
    if (val === null || val === undefined) return 'N/A';
    if (feat.includes('wear_mm')) return `${val} mm`;
    if (feat.includes('age_years')) return `${val} years`;
    if (feat.includes('percent')) return `${val}%`;
    if (feat.includes('psi')) return `${val} psi`;
    if (feat.includes('temperature_c') || feat.includes('temp_c')) return `${val} °C`;
    if (feat.includes('voltage')) return `${val} V`;
    if (feat.includes('days')) return `${val} days`;
    if (feat.includes('kmph')) return `${val} km/h`;
    if (feat.includes('km')) return `${val.toLocaleString()} km`;
    if (feat.includes('minutes')) return `${val} mins`;
    if (feat.includes('level')) return `${val} mm/s`;
    return String(val);
  };

  // Run the REAL Predictive Maintenance Model on the selected asset
  const runPrediction = async (asset) => {
    try {
      setMlLoading(true);
      setMlError(null);

      // Derive realistic operational telemetry based on asset data
      const health = Number(asset.health_score ?? 80.0);
      const ageYears = asset.installation_date 
        ? Math.max(1, Math.round((new Date() - new Date(asset.installation_date)) / (1000 * 60 * 60 * 24 * 365.25)))
        : 14;

      // Higher wear and vibration for lower health scores
      const railWear = Number(((100.0 - health) * 0.18 + 1.2).toFixed(2));
      const vibration = Number(((100.0 - health) * 0.08 + 1.5).toFixed(2));
      const wheelWear = Number(((100.0 - health) * 0.85 + 10.0).toFixed(1));
      const brakeWear = Number(((100.0 - health) * 0.90 + 10.0).toFixed(1));
      const brakePressure = Number((Math.max(45, 95.0 - (100.0 - health) * 0.45)).toFixed(1));
      const axleTemp = Number((60.0 + (100.0 - health) * 0.25).toFixed(1));
      const bearingTemp = Number((65.0 + (100.0 - health) * 0.30).toFixed(1));

      const payload = {
        asset_id: asset.id,
        asset_code: asset.asset_code,
        department_code: asset.department_code,
        rail_wear_mm: railWear,
        track_vibration_level: vibration,
        wheel_wear_percent: wheelWear,
        brake_pad_wear_percent: brakeWear,
        brake_pressure_psi: brakePressure,
        axle_temperature_c: axleTemp,
        bearing_temperature_c: bearingTemp,
        battery_voltage: 24.0,
        sensor_health_index: health,
        inspection_score: health,
        train_age_years: ageYears,
        distance_travelled_km: 750000,
        average_speed_kmph: 75.0,
        delay_minutes: 15.0,
        last_maintenance_days: 180,
        ambient_temperature_c: 30.0,
        humidity_percent: 60.0,
        rainfall_mm: 15.0,
        region: asset.department_code === 'ENG' ? 'Northern Railway' : (asset.department_code === 'TRD' ? 'Western Railway' : 'Central Railway'),
        season: 'Monsoon',
        train_type: 'Freight'
      };

      // Call the REAL ML endpoint
      const response = await apiClient.post('/ai/predictive-maintenance', payload);
      setMlResult(response.data);
    } catch (err) {
      console.error("Predictive Maintenance inference failed:", err);
      const detail = err.response?.data?.detail || err.message || "Failed to execute ML inference";
      setMlError(detail);
    } finally {
      setMlLoading(false);
    }
  };

  const handleOpenPredictiveML = (asset) => {
    if (!isAdmin) return;
    setSelectedAsset(asset);
    setIsMLModalOpen(true);
    setMlResult(null);
    setMlError(null);
    runPrediction(asset);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Railway Physical Assets Registry
            </h2>
            <Badge variant="warning">SIMULATED DEMO DATA</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin 
              ? "Full central registry across Permanent Way, Signalling Interlocking, and 25kV OHE Catenary infrastructure."
              : `Strictly isolated to ${getDepartmentName(userDept)} infrastructure assets.`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isAdmin && (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{userDept} Isolated</span>
            </span>
          )}
          <Badge variant="secondary" className="px-3 py-1 font-mono text-xs font-bold">
            {assets.length} Assets Listed
          </Badge>
        </div>
      </div>

      {/* Official AI Updates Banner (Non-Admin) or Admin Review Center Banner */}
      {!isAdmin ? (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white shadow-md border border-blue-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Official AI Maintenance Updates & Sanctioned Directives</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-mono border border-emerald-400/40">
                    Approved by Admin
                  </span>
                </h3>
                <p className="text-xs text-blue-200">
                  Showing verified predictive maintenance directives for {getDepartmentName(userDept)}. Non-approved AI predictions remain restricted.
                </p>
              </div>
            </div>
            <Badge variant="success" className="px-2.5 py-1 font-mono text-xs font-bold self-start sm:self-auto">
              {approvedRecommendations.length} Official Directives
            </Badge>
          </div>

          {approvedRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {approvedRecommendations.map((rec) => (
                <div key={rec.id} className="p-3 bg-slate-800/90 rounded-lg border border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-400">{rec.asset_code || rec.entity_id}</span>
                    <Badge variant={rec.risk_level === 'Critical' ? 'critical' : rec.risk_level === 'High' ? 'warning' : 'success'}>
                      {rec.risk_level}
                    </Badge>
                  </div>
                  <div className="text-slate-200 line-clamp-2 text-[11px]">
                    {rec.recommended_action || rec.title}
                  </div>
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Sanctioned by {rec.reviewer_name || 'Admin'}</span>
                    <button 
                      onClick={() => setSelectedApprovedRec(rec)}
                      className="text-blue-300 hover:text-white font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> View Directive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 text-xs text-slate-300">
              No critical maintenance directives currently active for {userDept}. Routine monitoring in effect.
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white shadow-md border border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>AI Governance & Review Center</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/30 text-purple-200 font-mono border border-purple-400/40">
                  Admin Sanction Authority
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                Predictive maintenance diagnostics remain in <strong>PENDING_REVIEW</strong> status until approved by an administrator in the Review Center.
              </p>
            </div>
          </div>
          <Link 
            to="/ai-review"
            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm self-start sm:self-auto shrink-0"
          >
            <span>Open AI Review Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Department Filter: Admin sees tabs; Non-admin sees locked department pill */}
          {isAdmin ? (
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {['ALL', 'ENG', 'SNT', 'TRD'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    departmentFilter === dept
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept === 'ALL' ? 'All Assets (Central)' : dept === 'ENG' ? 'Civil (P-Way)' : dept === 'SNT' ? 'Signal (S&T)' : 'Traction (TRD)'}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-blue-50/90 border border-blue-200 rounded-lg text-xs font-bold text-blue-900">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Department Scope: {getDepartmentName(userDept)}</span>
              <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">
                {userDept} ONLY
              </span>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${userDept} assets by code, name...`}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" variant="primary" size="sm">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card className="shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Asset Code</th>
                <th className="py-3 px-4">Asset Name & Classification</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Section & Location</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Inspected</th>
                <th className="py-3 px-4 text-right">
                  {isAdmin ? "Predictive AI (Admin)" : "Approved AI Status"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading department asset inventory from database...</span>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No railway assets found matching criteria in {getDepartmentName(userDept)}.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.id || a.asset_code} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {a.asset_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{a.asset_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{a.asset_type}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.department_code === 'ENG' ? 'warning' : a.department_code === 'SNT' ? 'primary' : 'warning'}>
                        {a.department_code}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-900 font-semibold">{a.section_code}</div>
                      <div className="text-[11px] text-slate-500">Km {a.km_location}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold font-mono text-xs ${a.health_score >= 80 ? 'text-emerald-700' : a.health_score >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>
                          {a.health_score}%
                        </span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${a.health_score >= 80 ? 'bg-emerald-600' : a.health_score >= 60 ? 'bg-amber-500' : 'bg-rose-600'}`} 
                            style={{ width: `${a.health_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.status === 'Operational' ? 'success' : a.status === 'Degraded' ? 'warning' : 'critical'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {a.installation_date ? new Date(a.installation_date).toLocaleDateString() : 'Active'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isAdmin ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenPredictiveML(a)}
                          className="text-xs font-semibold cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <Activity className="w-3.5 h-3.5 mr-1 text-blue-600" />
                          <span>Run ML Risk</span>
                        </Button>
                      ) : (
                        (() => {
                          const approvedRec = approvedRecommendations.find(
                            r => r.asset_code === a.asset_code || r.asset_id === a.id
                          );
                          if (approvedRec) {
                            return (
                              <div className="flex items-center justify-end space-x-1.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  approvedRec.risk_level === 'Critical' 
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                  Official Directive
                                </span>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => setSelectedApprovedRec(approvedRec)}
                                  className="text-xs cursor-pointer text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                  <Eye className="w-3 h-3 mr-1" /> View
                                </Button>
                              </div>
                            );
                          }
                          return (
                            <span className="text-slate-400 font-mono text-[11px]">
                              Audited (Normal)
                            </span>
                          );
                        })()
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Predictive Maintenance Modal */}
      {isMLModalOpen && selectedAsset && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <Cpu className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>AI Predictive Maintenance Diagnostics</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 font-mono border border-blue-400/30">
                      Real ML Pipeline
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedAsset.asset_code} &bull; {selectedAsset.asset_name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsMLModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Asset Snapshot Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Department</span>
                  <span className="font-semibold text-slate-800">{selectedAsset.department_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Section Location</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedAsset.section_code} Km {selectedAsset.km_location}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Current Health</span>
                  <span className={`font-bold font-mono ${selectedAsset.health_score >= 80 ? 'text-emerald-600' : selectedAsset.health_score >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {selectedAsset.health_score}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Operational Status</span>
                  <Badge variant={selectedAsset.status === 'Operational' ? 'success' : selectedAsset.status === 'Degraded' ? 'warning' : 'critical'}>
                    {selectedAsset.status}
                  </Badge>
                </div>
              </div>

              {/* Loading State */}
              {mlLoading && (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-semibold text-slate-700">
                    Evaluating 21 telemetry features against trained Random Forest model...
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    POST /api/v1/ai/predictive-maintenance
                  </p>
                </div>
              )}

              {/* Error State */}
              {!mlLoading && mlError && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                  <div className="flex items-center space-x-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Inference Error</span>
                  </div>
                  <p className="text-xs text-rose-700">{mlError}</p>
                  <Button size="xs" variant="outline" onClick={() => runPrediction(selectedAsset)}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry Prediction
                  </Button>
                </div>
              )}

              {/* Result State */}
              {!mlLoading && mlResult && (
                <div className="space-y-5">
                  {/* Primary Visual Risk Banner */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    mlResult.risk_level === 'Critical' 
                      ? 'bg-rose-50/80 border-rose-500 text-rose-950 shadow-sm'
                      : mlResult.risk_level === 'High'
                      ? 'bg-amber-50/80 border-amber-500 text-amber-950 shadow-sm'
                      : mlResult.risk_level === 'Medium'
                      ? 'bg-yellow-50/80 border-yellow-400 text-yellow-950'
                      : 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          {mlResult.risk_level === 'Critical' || mlResult.risk_level === 'High' ? (
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          <span className="text-xs font-black uppercase tracking-wider">
                            PREDICTIVE RISK LEVEL: {mlResult.risk_level}
                          </span>
                        </div>
                        <div className="text-2xl font-black mt-1 font-mono tracking-tight">
                          {(mlResult.maintenance_probability * 100).toFixed(2)}% Failure Probability
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-[11px] font-semibold text-slate-500 block uppercase">
                          Maintenance Required
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide mt-1 ${
                          mlResult.maintenance_required 
                            ? 'bg-rose-600 text-white shadow-xs' 
                            : 'bg-emerald-600 text-white shadow-xs'
                        }`}>
                          {mlResult.maintenance_required ? 'YES — IMMEDIATE POSSESSION' : 'NO — SAFE TO OPERATE'}
                        </span>
                      </div>
                    </div>

                    {/* Visual Probability Bar */}
                    <div className="mt-3.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 font-mono">
                        <span>Safe Baseline</span>
                        <span>{(mlResult.maintenance_probability * 100).toFixed(1)}%</span>
                        <span>Critical Threshold</span>
                      </div>
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            mlResult.maintenance_probability >= 0.80 ? 'bg-rose-600' :
                            mlResult.maintenance_probability >= 0.60 ? 'bg-amber-500' :
                            mlResult.maintenance_probability >= 0.40 ? 'bg-yellow-500' : 'bg-emerald-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, mlResult.maintenance_probability * 100))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Recommended Action Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
                      <Wrench className="w-4 h-4 text-blue-600" />
                      <span>Recommended Maintenance Action:</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium pl-6">
                      {mlResult.recommended_action || "Routine monitoring"}
                    </p>
                  </div>

                  {/* Top Risk Factors Attribution */}
                  {mlResult.top_risk_factors && mlResult.top_risk_factors.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          Top Risk Drivers (Attribution)
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          Extracted from Model Feature Importance
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {mlResult.top_risk_factors.map((factor, idx) => (
                          <div 
                            key={factor.feature || idx} 
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs hover:bg-slate-100/70 transition"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold text-[10px] flex items-center justify-center">
                                #{idx + 1}
                              </span>
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {formatFeatureName(factor.feature)}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-1.5 font-mono">
                                  ({(factor.importance * 100).toFixed(1)}% influence)
                                </span>
                              </div>
                            </div>

                            <div className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                              {formatFeatureValue(factor.feature, factor.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Approval Workflow Notice */}
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
                    <div className="flex items-center space-x-2 font-bold text-amber-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>AI Workflow Status: PENDING REVIEW (Official Governance)</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      This diagnostic prediction has been automatically logged as recommendation{' '}
                      <strong>{mlResult.recommendation_code || 'PENDING'}</strong> in the AI Review Center. It requires formal administrative review and sanction before becoming an official update for {selectedAsset.department_code} crews.
                    </p>
                    <div className="pt-1">
                      <Link 
                        to="/ai-review"
                        className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1"
                      >
                        <span>Open AI Review Center to sanction / reject directive</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Model Metadata Footer */}
                  <div className="p-3 bg-slate-100/80 rounded-lg text-[11px] text-slate-500 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-200">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-3.5 h-3.5 text-slate-600" />
                      <span>Model: <strong className="text-slate-800">{mlResult.model_type}</strong></span>
                    </div>
                    <div>
                      <span>Version: <strong className="text-slate-800">{mlResult.model_version || '2.0.0'}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => runPrediction(selectedAsset)}
                disabled={mlLoading}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${mlLoading ? 'animate-spin' : ''}`} />
                <span>Re-run Diagnostics</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsMLModalOpen(false)}
                className="text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official Approved Directive Inspection Modal */}
      {selectedApprovedRec && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-emerald-600 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Official AI Maintenance Directive</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-mono border border-emerald-400/30">
                      Approved & Sanctioned
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {selectedApprovedRec.recommendation_code} &bull; {selectedApprovedRec.asset_code}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedApprovedRec(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Official Status Stamp */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2 text-emerald-950">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Administrative Sanction Verified
                  </span>
                  <Badge variant={selectedApprovedRec.risk_level === 'Critical' ? 'critical' : selectedApprovedRec.risk_level === 'High' ? 'warning' : 'success'}>
                    {selectedApprovedRec.risk_level} Priority
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-emerald-800 font-mono">
                  <div>Sanctioned By: <strong>{selectedApprovedRec.reviewer_name || 'System Administrator'}</strong></div>
                  <div>Date: <strong>{selectedApprovedRec.reviewed_at ? new Date(selectedApprovedRec.reviewed_at).toLocaleDateString() : 'Active'}</strong></div>
                  {selectedApprovedRec.task_id && <div>Official Task ID: <strong>#{selectedApprovedRec.task_id}</strong></div>}
                </div>
                {selectedApprovedRec.approval_comment && (
                  <div className="pt-2 text-xs border-t border-emerald-200/60 text-emerald-900">
                    <strong>Administrator Remark:</strong> "{selectedApprovedRec.approval_comment}"
                  </div>
                )}
              </div>

              {/* Directive Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-slate-900">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span>Approved Maintenance Directive:</span>
                </div>
                <p className="text-slate-700 font-medium pl-6">
                  {selectedApprovedRec.recommended_action || selectedApprovedRec.title}
                </p>
              </div>

              {/* Telemetry Breakdown */}
              {selectedApprovedRec.top_risk_factors && selectedApprovedRec.top_risk_factors.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block text-xs">Primary Telemetry Risk Triggers:</span>
                  <div className="space-y-1">
                    {selectedApprovedRec.top_risk_factors.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="font-semibold text-slate-700">{formatFeatureName(f.feature)}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatFeatureValue(f.feature, f.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedApprovedRec(null)}
                className="text-xs"
              >
                Close Directive
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
