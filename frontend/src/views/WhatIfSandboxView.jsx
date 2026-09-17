import React, { useState } from 'react';
import { FlaskConical, Play, Sparkles, TrendingUp, AlertTriangle, Clock, Layers } from 'lucide-react';
import apiClient from '../api/client';

export default function WhatIfSandboxView() {
  const [freightSurge, setFreightSurge] = useState(20);
  const [emergencyDefects, setEmergencyDefects] = useState(2);
  const [speedRestriction, setSpeedRestriction] = useState(15);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  const handleSimulate = async () => {
    try {
      setIsSimulating(true);
      const res = await apiClient.post('/simulation/run', {
        name: `Simulation Surge +${freightSurge}% & ${emergencyDefects} Emergencies`,
        freight_surge_pct: freightSurge,
        emergency_defects_count: emergencyDefects,
        speed_restriction_pct: speedRestriction,
        section_code: "NDLS-TKD-UP"
      });
      setSimulationResult(res.data);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>What-If Simulation Sandbox</span>
            <span className="text-xs font-mono font-normal text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
              Predictive Operational Impact
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate the ripple effects of sudden freight surges, track fractures, or speed reductions before committing maintenance blocks.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl shadow-xl space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-700/60 pb-3">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Simulation Parameters</h3>
          </div>

          {/* Slider 1: Freight Surge */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Freight Density Surge:</span>
              <span className="font-mono font-bold text-amber-400">+{freightSurge}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={freightSurge}
              onChange={(e) => setFreightSurge(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">Simulates sudden diversion of coal/container rakes</span>
          </div>

          {/* Slider 2: Emergency Defects */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Emergency Defects Injected:</span>
              <span className="font-mono font-bold text-rose-400">{emergencyDefects} Fractures</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={emergencyDefects}
              onChange={(e) => setEmergencyDefects(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">Simulates sudden USFD flaw detection requiring immediate block</span>
          </div>

          {/* Slider 3: Speed Restriction */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Speed Restriction Penalty:</span>
              <span className="font-mono font-bold text-blue-400">-{speedRestriction}% MPS</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="5"
              value={speedRestriction}
              onChange={(e) => setSpeedRestriction(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500 block">Simulates cautionary speed orders across adjacent sections</span>
          </div>

          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-amber-600/20 transition flex items-center justify-center space-x-2"
          >
            {isSimulating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Executing Sandbox Model...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Simulate Operational Impact</span>
              </>
            )}
          </button>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/60 p-6 rounded-xl shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="font-bold text-white text-sm">Simulation Projection Output</h3>
              <span className="text-xs font-mono text-slate-400">Monte Carlo & Queuing Model</span>
            </div>

            {simulationResult ? (
              <div className="mt-4 space-y-4">
                {/* Result Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-[11px] text-slate-400">Total Projected Delay:</span>
                    <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                      {simulationResult.metrics.projected_total_delay_minutes}m
                    </div>
                  </div>
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-[11px] text-slate-400">Passenger Delay:</span>
                    <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                      {simulationResult.metrics.passenger_delay_minutes}m
                    </div>
                  </div>
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-[11px] text-slate-400">Timetable Conflicts:</span>
                    <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                      {simulationResult.metrics.projected_conflicts} Clashes
                    </div>
                  </div>
                  <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-700/50">
                    <span className="text-[11px] text-slate-400">Punctuality Score:</span>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                      {simulationResult.metrics.corridor_punctuality_projected_pct}%
                    </div>
                  </div>
                </div>

                {/* AI Mitigating Recommendation */}
                <div className="bg-blue-950/40 border border-blue-800/60 p-4 rounded-lg space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-blue-300">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>AI Strategic Recommendation for this Scenario:</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {simulationResult.metrics.recommendation}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-2">
                <FlaskConical className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-400">Adjust the parameters on the left and click "Simulate Operational Impact".</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-700/60 text-[11px] text-slate-500">
            Powered by IR Delay Impact Predictor & Traffic Density Curves (SIMULATED DEMO DATA)
          </div>
        </div>
      </div>
    </div>
  );
}
