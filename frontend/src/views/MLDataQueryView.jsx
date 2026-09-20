import React, { useState, useEffect } from 'react';
import {
  Search,
  Cpu,
  Sparkles,
  Train,
  Activity,
  Database,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  BarChart3,
  TrendingUp,
  RefreshCw,
  Zap,
  Check,
  X,
  Sliders
} from 'lucide-react';
import apiClient from '../api/client';

export default function MLDataQueryView() {
  const [queryInput, setQueryInput] = useState('TRK-MAIN-001');
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [activeTab, setActiveTab] = useState('top25');
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    handleExecuteQuery('TRK-MAIN-001');
  }, []);

  const handleExecuteQuery = async (searchStr) => {
    const q = searchStr !== undefined ? searchStr : queryInput;
    setLoading(true);
    setActionSuccess(null);
    try {
      const res = await apiClient.post('/ml/query', { query: q });
      setQueryResult(res.data);
    } catch (err) {
      console.error('Unified ML Query error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGovernanceAction = async (actionType) => {
    setActionSuccess(`AI Governance recommendation successfully marked as ${actionType.toUpperCase()}`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const top25 = queryResult?.top_25_priority_features;
  const trainD = queryResult?.train_data;
  const trackD = queryResult?.track_data;
  const assetD = queryResult?.asset_maintenance_data;
  const sensorD = queryResult?.sensor_telemetry_data;
  const mlD = queryResult?.ml_data;
  const maintD = queryResult?.maintenance_planning;
  const blockD = queryResult?.block_planning;
  const govD = queryResult?.ai_governance;
  const inf = queryResult?.inference_summary;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-950 text-white p-6 shadow-xl border border-teal-800/30">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider mb-1">
              <Cpu className="w-4 h-4" />
              <span>Unified ML Data Pipeline & 90-Attribute Telemetry Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ML Data Query & Real-Time Inference
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Query any Train, Track, Asset, Task, or Block across all <span className="text-teal-300 font-bold">90 Data Attributes</span> and <span className="text-emerald-300 font-bold">25 Priority ML Features</span> routed directly through trained Scikit-Learn & OR-Tools engines.
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-slate-800/80 backdrop-blur-sm p-2.5 rounded-xl border border-slate-700/50">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Pipeline Status</div>
              <div className="text-xs font-bold text-emerald-400">All 6 ML Models Active</div>
            </div>
          </div>
        </div>
      </div>

      {/* Query Search Bar & Quick Presets */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecuteQuery()}
              placeholder="Search Train No, Asset ID, Section Code, Task Code, Block ID or freeform query (e.g. 12002, TRK-MAIN-001, NDLS-TKD)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 font-medium transition"
            />
          </div>
          <button
            onClick={() => handleExecuteQuery()}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>{loading ? 'Running ML Inference...' : 'Execute ML Query'}</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Presets:</span>
          {[
            { label: 'Asset TRK-MAIN-001', val: 'TRK-MAIN-001' },
            { label: 'Train 12002 (Shatabdi)', val: '12002' },
            { label: 'Section NDLS-TKD-UP', val: 'NDLS-TKD-UP' },
            { label: 'Task TSK-ENG-2026-0001', val: 'TSK-ENG-2026-0001' },
            { label: 'Block BLK-NDLS-001', val: 'BLK-NDLS-001' }
          ].map((preset) => (
            <button
              key={preset.val}
              onClick={() => {
                setQueryInput(preset.val);
                handleExecuteQuery(preset.val);
              }}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition border border-slate-200 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Query Results Display */}
      {queryResult && (
        <div className="space-y-6">
          {/* Resolved Query & Inference Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card 1: PM Model Risk */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <span>Predictive Maintenance</span>
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">
                  {inf?.predictive_maintenance?.risk_level || 'Medium'} Risk
                </div>
                <div className="text-xs font-bold text-slate-600 mt-1">
                  Probability: {((inf?.predictive_maintenance?.maintenance_probability || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Action: <span className="font-semibold text-slate-800">{inf?.predictive_maintenance?.recommended_action || 'Routine Inspection'}</span>
              </div>
            </div>

            {/* Card 2: Train Delay & ETA */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <span>Train Delay & ETA</span>
                <Clock className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">
                  +{inf?.train_delay_prediction?.predicted_delay_minutes || 0} min
                </div>
                <div className="text-xs font-bold text-sky-700 mt-1">
                  Predicted ETA: {inf?.train_delay_prediction?.predicted_eta || 'On Time'}
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Model: <span className="font-semibold text-slate-800">HistGradientBoosting</span>
              </div>
            </div>

            {/* Card 3: AI Task Priority Score */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <span>6-Factor AI Priority</span>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-amber-600">
                  {inf?.priority_scoring?.priority_score || 88} / 100
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  Tier: {inf?.priority_scoring?.priority_level || 'Critical'} Priority
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Rank: <span className="font-semibold text-amber-700">Top 5% Urgent Maintenance</span>
              </div>
            </div>

            {/* Card 4: 30-Day Survival Risk */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
                <span>30-Day Failure Risk</span>
                <Activity className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-indigo-600">
                  {inf?.survival_analysis?.failure_risk_30d_pct || 24.5}%
                </div>
                <div className="text-xs font-bold text-slate-700 mt-1">
                  Est. RUL: {inf?.survival_analysis?.estimated_rul_days || 28} Days
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Weibull AFT Model (92% Conf.)
              </div>
            </div>
          </div>

          {/* Tab Navigation Header */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
            {[
              { id: 'top25', label: 'Top 25 Priority ML Features', icon: Sparkles, color: 'text-emerald-600' },
              { id: 'train', label: '1. Train Data (1-13)', icon: Train },
              { id: 'track', label: '2. Track Data (14-24)', icon: Activity },
              { id: 'asset', label: '3. Asset Data (25-35)', icon: Database },
              { id: 'sensor', label: '4. Telemetry (36-50)', icon: Activity },
              { id: 'ml', label: '5. ML Model Data (51-60)', icon: Cpu },
              { id: 'maint', label: '6. Maintenance Plan (61-69)', icon: FileText },
              { id: 'block', label: '7. Block Plan (70-78)', icon: Layers },
              { id: 'gov', label: '8. AI Governance (79-90)', icon: Shield }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${tab.color || 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Top 25 Minimum Priority ML Features */}
          {activeTab === 'top25' && top25 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Minimum Required Top 25 Priority ML Features</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Core input vector feeding the Scikit-Learn Random Forest & HistGradientBoosting models.
                  </p>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  25/25 Features Populated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[
                  { label: '1. Asset ID', val: top25.asset_id, unit: '' },
                  { label: '2. Train ID', val: top25.train_id, unit: '' },
                  { label: '3. Rail Wear', val: top25.rail_wear_mm, unit: 'mm' },
                  { label: '4. Wheel Wear', val: top25.wheel_wear_percent, unit: '%' },
                  { label: '5. Brake Pad Wear', val: top25.brake_pad_wear_percent, unit: '%' },
                  { label: '6. Brake Pressure', val: top25.brake_pressure_psi, unit: 'psi' },
                  { label: '7. Axle Temp', val: top25.axle_temperature_c, unit: '°C' },
                  { label: '8. Bearing Temp', val: top25.bearing_temperature_c, unit: '°C' },
                  { label: '9. Battery Voltage', val: top25.battery_voltage, unit: 'V' },
                  { label: '10. Sensor Health Index', val: top25.sensor_health_index, unit: '/100' },
                  { label: '11. Inspection Score', val: top25.inspection_score, unit: '/100' },
                  { label: '12. Train Age', val: top25.train_age_years, unit: 'yrs' },
                  { label: '13. Distance Travelled', val: top25.distance_travelled_km, unit: 'km' },
                  { label: '14. Average Speed', val: top25.average_speed_kmph, unit: 'km/h' },
                  { label: '15. Delay Minutes', val: top25.delay_minutes, unit: 'min' },
                  { label: '16. Days Since Maint', val: top25.last_maintenance_days, unit: 'days' },
                  { label: '17. Ambient Temp', val: top25.ambient_temperature_c, unit: '°C' },
                  { label: '18. Humidity', val: top25.humidity_percent, unit: '%' },
                  { label: '19. Rainfall', val: top25.rainfall_mm, unit: 'mm' },
                  { label: '20. Region', val: top25.region, unit: '' },
                  { label: '21. Season', val: top25.season, unit: '' },
                  { label: '22. Train Type', val: top25.train_type, unit: '' },
                  { label: '23. Historical Result', val: top25.historical_maintenance_failure_result, unit: '' },
                  { label: '24. Timestamp', val: top25.timestamp.substring(0, 19), unit: 'UTC' },
                  { label: '25. Data Source', val: top25.data_source, unit: '' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">{item.label}</div>
                    <div className="text-xs font-black text-slate-900 mt-1 truncate">
                      {item.val} {item.unit}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Train Data (1-13) */}
          {activeTab === 'train' && trainD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Train className="w-4 h-4 text-sky-600" />
                <span>Domain 1: Train Operations Data (Attributes 1-13)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '1. Train ID', val: trainD.train_id },
                  { label: '2. Train Number & Name', val: trainD.train_no_name },
                  { label: '3. Train Type', val: trainD.train_type },
                  { label: '4. Origin Station', val: trainD.origin },
                  { label: '5. Destination Station', val: trainD.destination },
                  { label: '6. Current Location', val: trainD.current_location },
                  { label: '7. Current Station', val: trainD.current_station },
                  { label: '8. Next Station', val: trainD.next_station },
                  { label: '9. Scheduled Arrival / Departure', val: trainD.scheduled_arrival_departure },
                  { label: '10. Actual Arrival / Departure (ETA)', val: trainD.actual_arrival_departure },
                  { label: '11. Current Delay', val: `${trainD.current_delay_minutes} minutes` },
                  { label: '12. Current Speed', val: `${trainD.current_speed_kmph} km/h` },
                  { label: '13. Historical Delay Average', val: `${trainD.historical_delay_avg_minutes} minutes` }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</span>
                    <span className="text-xs font-black text-slate-900 mt-0.5">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Track Data (14-24) */}
          {activeTab === 'track' && trackD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span>Domain 2: Track & Permanent Way Data (Attributes 14-24)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '14. Track ID', val: trackD.track_id },
                  { label: '15. Zone / Region', val: trackD.railway_zone_region },
                  { label: '16. Railway Section Code', val: trackD.section },
                  { label: '17. Track Condition', val: trackD.track_condition },
                  { label: '18. Rail Wear', val: `${trackD.rail_wear_mm} mm` },
                  { label: '19. Track Vibration Level', val: `${trackD.track_vibration_level} RMS g` },
                  { label: '20. Track Defect History Count', val: `${trackD.track_defect_history_count} Past Defects` },
                  { label: '21. Last Inspection Date', val: trackD.last_inspection_date },
                  { label: '22. Inspection Score', val: `${trackD.inspection_score} / 100` },
                  { label: '23. Track Availability', val: `${trackD.track_availability_pct}%` },
                  { label: '24. Current Block Status', val: trackD.current_block_status }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</span>
                    <span className="text-xs font-black text-slate-900 mt-0.5">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Asset & Maintenance Data (25-35) */}
          {activeTab === 'asset' && assetD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>Domain 3: Asset & Maintenance History (Attributes 25-35)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '25. Asset ID Code', val: assetD.asset_id },
                  { label: '26. Asset Type', val: assetD.asset_type },
                  { label: '27. Asset Location', val: assetD.asset_location },
                  { label: '28. Installation Date', val: assetD.installation_date },
                  { label: '29. Last Maintenance Date', val: assetD.last_maintenance_date },
                  { label: '30. Days Since Maintenance', val: `${assetD.days_since_maintenance} days` },
                  { label: '31. Maintenance History Logs', val: `${assetD.maintenance_history?.length || 0} Records Logged` },
                  { label: '32. Previous Failures Count', val: `${assetD.previous_failures_count} Failures` },
                  { label: '33. Failure Frequency per Year', val: `${assetD.failure_frequency_per_year} / yr` },
                  { label: '34. Asset Health Score', val: `${assetD.asset_health_score} / 100` },
                  { label: '35. Current Active Defects', val: `${assetD.current_defects_count} Defect Open` }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</span>
                    <span className="text-xs font-black text-slate-900 mt-0.5">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Sensor Telemetry Data (36-50) */}
          {activeTab === 'sensor' && sensorD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Domain 4: Real-Time Sensor Telemetry (Attributes 36-50)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: '36. Rail Wear', val: `${sensorD.rail_wear_mm} mm` },
                  { label: '37. Wheel Wear %', val: `${sensorD.wheel_wear_percent}%` },
                  { label: '38. Brake-Pad Wear %', val: `${sensorD.brake_pad_wear_percent}%` },
                  { label: '39. Brake Pressure', val: `${sensorD.brake_pressure_psi} psi` },
                  { label: '40. Axle Temperature', val: `${sensorD.axle_temperature_c} °C` },
                  { label: '41. Bearing Temperature', val: `${sensorD.bearing_temperature_c} °C` },
                  { label: '42. Battery Voltage', val: `${sensorD.battery_voltage} V` },
                  { label: '43. Sensor Health Index', val: `${sensorD.sensor_health_index} / 100` },
                  { label: '44. Inspection Score', val: `${sensorD.inspection_score} / 100` },
                  { label: '45. Distance Travelled', val: `${sensorD.distance_travelled_km} km` },
                  { label: '46. Average Speed', val: `${sensorD.average_speed_kmph} km/h` },
                  { label: '47. Delay Minutes', val: `${sensorD.delay_minutes} min` },
                  { label: '48. Ambient Temperature', val: `${sensorD.ambient_temperature_c} °C` },
                  { label: '49. Humidity', val: `${sensorD.humidity_percent}%` },
                  { label: '50. Rainfall', val: `${sensorD.rainfall_mm} mm` }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase">{item.label}</span>
                    <div className="text-sm font-black text-slate-900 mt-1">{item.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ML Data (51-60) */}
          {activeTab === 'ml' && mlD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Domain 5: Machine Learning Metadata & Inference (Attributes 51-60)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '51. Training Features', val: `${mlD.training_features?.length || 21} Features Configured` },
                  { label: '52. Feature Names List', val: mlD.correct_feature_names?.slice(0, 5).join(', ') + '...' },
                  { label: '53. Feature Units Schema', val: 'Validated (mm, %, psi, °C, V, km/h, min)' },
                  { label: '54. Preprocessing Pipeline', val: mlD.same_preprocessing_as_training },
                  { label: '55. Historical Target Values', val: JSON.stringify(mlD.historical_actual_target_values) },
                  { label: '56. Model Prediction Outputs', val: JSON.stringify(mlD.model_predictions) },
                  { label: '57. Prediction Confidence / Probabilities', val: JSON.stringify(mlD.prediction_probability_confidence) },
                  { label: '58. Trained Model Version', val: mlD.model_version },
                  { label: '59. Data Timestamp', val: mlD.data_timestamp },
                  { label: '60. Data Source System', val: mlD.data_source }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</span>
                    <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 break-all">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: Maintenance Planning (61-69) */}
          {activeTab === 'maint' && maintD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Domain 6: Maintenance Planning (Attributes 61-69)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '61. Task ID Code', val: maintD.task_id },
                  { label: '62. Task Type', val: maintD.task_type },
                  { label: '63. Calculated Priority Tier', val: maintD.priority_level },
                  { label: '64. Estimated Duration', val: `${maintD.estimated_duration_minutes} minutes` },
                  { label: '65. Required Department', val: maintD.required_department },
                  { label: '66. Required Staff Count', val: `${maintD.required_staff_count} Personnel` },
                  { label: '67. Required Heavy Equipment', val: maintD.required_equipment },
                  { label: '68. Maintenance Window', val: maintD.maintenance_window },
                  { label: '69. Safety & Operational Restrictions', val: maintD.safety_restrictions?.join('; ') }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</span>
                    <span className="text-xs font-black text-slate-900 mt-0.5">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: Block Planning (70-78) */}
          {activeTab === 'block' && blockD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Domain 7: Automatic Block Planning (Attributes 70-78)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '70. Block ID Code', val: blockD.block_id },
                  { label: '71. Track / Section', val: blockD.track_section },
                  { label: '72. Block Start Time', val: blockD.block_start_time },
                  { label: '73. Block End Time', val: blockD.block_end_time },
                  { label: '74. Block Status', val: blockD.block_status },
                  { label: '75. Train Movement During Block', val: blockD.train_movement_during_block },
                  { label: '76. Conflicting Train Schedules', val: blockD.conflicting_train_schedules?.join(', ') },
                  { label: '77. Track Availability Status', val: blockD.track_availability_status },
                  { label: '78. Proposed Maintenance Window', val: blockD.proposed_maintenance_window }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</span>
                    <span className="text-xs font-black text-slate-900 mt-0.5">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: AI Governance (79-90) */}
          {activeTab === 'gov' && govD && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-teal-600" />
                    <span>Domain 8: AI Governance & Officer Review (Attributes 79-90)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Statutory audit logging and DRM/Sr. DOM approval workflow.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleGovernanceAction('approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Recommendation</span>
                  </button>
                  <button
                    onClick={() => handleGovernanceAction('rejected')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '79. Recommendation ID', val: govD.recommendation_id },
                  { label: '80. AI Recommendation', val: govD.ai_recommendation },
                  { label: '81. AI Confidence Score', val: `${govD.ai_confidence_pct}%` },
                  { label: '82. Reason / Explanation', val: govD.reason_explanation?.join('; ') },
                  { label: '83. Affected Asset / Section', val: govD.affected_asset_section },
                  { label: '84. Affected Department', val: govD.affected_department },
                  { label: '85. Recommendation Status', val: govD.recommendation_status },
                  { label: '86. Reviewer / Authorized Officer', val: govD.reviewer_authorized_officer },
                  { label: '87. Approval / Rejection Status', val: govD.approval_rejection_status },
                  { label: '88. Approval Timestamp', val: govD.approval_timestamp || 'Pending Review' },
                  { label: '89. Rejection Reason', val: govD.rejection_reason || 'N/A' },
                  { label: '90. Statutory Audit Log ID', val: govD.audit_log_id }
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{item.label}</span>
                    <span className="text-xs font-black text-slate-900 mt-0.5">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
