import React, { useState, useEffect } from 'react';
import { Train, ShieldAlert, CheckCircle2, User, RefreshCw, AlertTriangle } from 'lucide-react';
import apiClient from '../api/client';

import { USER_ROLES } from '../constants/roles';



export default function Navbar({ currentRole, setCurrentRole, activeUser, setActiveUser }) {
  const [systemsStatus, setSystemsStatus] = useState({ TMS: "Online", SMMS: "Online", TDMS: "Online", COA: "Online" });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // Automatically login as selected role on change
    const selected = USER_ROLES.find(r => r.role === currentRole) || USER_ROLES[0];
    loginAsRole(selected);
  }, [currentRole]);

  const loginAsRole = async (roleObj) => {
    try {
      const formData = new FormData();
      formData.append("username", roleObj.user);
      formData.append("password", roleObj.pass);
      const res = await apiClient.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      localStorage.setItem("ir_access_token", res.data.access_token);
      setActiveUser(res.data);
    } catch (err) {
      console.error("Auth switch failed", err);
    }
  };

  const handleRoleChange = (e) => {
    setCurrentRole(e.target.value);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      {/* Top Simulated Demo Warning Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-black font-semibold text-xs px-4 py-1.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-slate-950 animate-pulse" />
          <span>SIH26027 PROTOTYPE — <strong>SIMULATED DEMO DATA</strong> (TMS, SMMS, TDMS & COA represented via realistic simulated APIs)</span>
        </div>
        <div className="hidden md:flex items-center space-x-4 text-[11px] font-mono text-slate-950">
          <span>AI Engine: Active</span>
          <span>•</span>
          <span>OR-Tools CP-SAT: Connected</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Train className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg text-white tracking-wide">RAILWAY-AI BLOCK PLANNER</h1>
              <span className="bg-blue-900/60 text-blue-400 border border-blue-700/50 text-[10px] font-mono px-2 py-0.5 rounded">SIH26027</span>
            </div>
            <p className="text-xs text-slate-400">Automatic Maintenance Optimization for Indian Railways</p>
          </div>
        </div>

        {/* Integration Status Badges */}
        <div className="hidden lg:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
          <span className="text-xs text-slate-400 mr-1 font-medium">Mock Systems:</span>
          {["TMS", "SMMS", "TDMS", "COA"].map(sys => (
            <span key={sys} className="flex items-center space-x-1 text-[11px] bg-slate-900 px-2 py-0.5 rounded text-emerald-400 border border-emerald-900/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{sys}</span>
            </span>
          ))}
        </div>

        {/* Role Switcher */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
            <User className="w-4 h-4 text-slate-400" />
            <div className="text-xs">
              <div className="text-slate-400 text-[10px]">Active Role</div>
              <select
                value={currentRole}
                onChange={handleRoleChange}
                className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
              >
                {USER_ROLES.map(r => (
                  <option key={r.role} value={r.role} className="bg-slate-900 text-white">
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
