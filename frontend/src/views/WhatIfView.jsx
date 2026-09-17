import React, { useState } from 'react';
import { 
  Sliders, 
  Play, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Train,
  CheckCircle2,
  RefreshCw,
  Zap
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function WhatIfView() {
  const [params, setParams] = useState({
    durationExtensionMinutes: 30,
    speedRestrictionDropKmh: 20,
    freightSurgePct: 15,
    emergencyDefectsCount: 2
  });
  const [running, setRunning] = useState(false);
  const [simResult, setSimResult] = useState(null);

  const handleRunSimulation = async () => {
    try {
      setRunning(true);
      const res = await apiClient.post('/simulation/run', {
        duration_extension_minutes: params.durationExtensionMinutes,
        speed_restriction_drop_kmh: params.speedRestrictionDropKmh,
        freight_surge_pct: params.freightSurgePct,
        emergency_defects_count: params.emergencyDefectsCount
      });
      setSimResult(res.data);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Sliders className="w-6 h-6 text-blue-600" />
              <span>What-If Corridor Scenario Simulation Sandbox</span>
            </h2>
            <Badge variant="warning">SIMULATED DEMO DATA</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate downstream delay cascades and asset impacts before granting emergency blocks or speed restrictions.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleRunSimulation}
          disabled={running}
          className="flex items-center space-x-2 shadow-lg"
        >
          <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Simulating Cascade...' : 'Execute What-If Simulation'}</span>
        </Button>
      </div>

      {/* Interactive Parameter Controls */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Perturbation & Scenario Stress Testing Parameters</CardTitle>
          <p className="text-xs text-slate-500">Inject dynamic operational variations into the trunk corridor timetable model.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700">Block Duration Overrun:</span>
                <span className="font-mono text-blue-700 font-bold">+{params.durationExtensionMinutes} min</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="15"
                value={params.durationExtensionMinutes}
                onChange={(e) => setParams({ ...params, durationExtensionMinutes: parseInt(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">Simulates machine breakdown or delayed clearance.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700">Speed Restriction Penalty:</span>
                <span className="font-mono text-amber-700 font-bold">-{params.speedRestrictionDropKmh} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="10"
                value={params.speedRestrictionDropKmh}
                onChange={(e) => setParams({ ...params, speedRestrictionDropKmh: parseInt(e.target.value) })}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">Temporary Caution Order (TCO) speed drop.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700">Goods Freight Surge:</span>
                <span className="font-mono text-purple-700 font-bold">+{params.freightSurgePct}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={params.freightSurgePct}
                onChange={(e) => setParams({ ...params, freightSurgePct: parseInt(e.target.value) })}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">Additional coal and container rakes running.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-700">Emergency Defects Injected:</span>
                <span className="font-mono text-rose-700 font-bold">{params.emergencyDefectsCount} defects</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={params.emergencyDefectsCount}
                onChange={(e) => setParams({ ...params, emergencyDefectsCount: parseInt(e.target.value) })}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400 mt-1">Simulates sudden rail fracture or point failure.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Grid: Baseline Plan vs Simulated Cascade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Baseline Plan */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Baseline Operational Plan</CardTitle>
              <Badge variant="secondary">NOMINAL TIMETABLE</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600 font-medium">Passenger Delay Minutes:</span>
              <span className="font-bold text-slate-900 font-mono text-base">
                {simResult?.baseline?.passenger_delay_minutes || 0} min
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600 font-medium">Freight Rakes Regulated:</span>
              <span className="font-bold text-slate-900 font-mono text-base">
                {simResult?.baseline?.freight_regulated_count || 1} Rakes
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-600 font-medium">System Punctuality Index:</span>
              <span className="font-bold text-emerald-700 font-mono text-base">
                {simResult?.baseline?.punctuality_pct || 94.2}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Simulated Scenario */}
        <Card className="shadow-xs border-rose-200 bg-rose-50/10">
          <CardHeader className="bg-rose-50/40 pb-3 border-b border-rose-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-rose-950">Simulated Scenario Cascade</CardTitle>
              <Badge variant="critical">STRESSED ENVIRONMENT</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-white border border-rose-100 rounded-xl">
              <span className="text-slate-600 font-medium">Projected Passenger Delay:</span>
              <span className="font-bold text-rose-700 font-mono text-base">
                {simResult?.simulated?.passenger_delay_minutes || (params.durationExtensionMinutes * 1.8).toFixed(0)} min
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white border border-rose-100 rounded-xl">
              <span className="text-slate-600 font-medium">Projected Freight Regulation:</span>
              <span className="font-bold text-amber-700 font-mono text-base">
                {simResult?.simulated?.freight_regulated_count || (params.emergencyDefectsCount * 2 + 3)} Rakes
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white border border-rose-100 rounded-xl">
              <span className="text-slate-600 font-medium">Degraded Punctuality Index:</span>
              <span className="font-bold text-amber-700 font-mono text-base">
                {simResult?.simulated?.punctuality_pct || (94.2 - params.durationExtensionMinutes * 0.08).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

