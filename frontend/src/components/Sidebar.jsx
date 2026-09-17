import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Activity, 
  Wrench, 
  ShieldAlert, 
  Database, 
  Train, 
  Layers, 
  Calendar, 
  Sparkles, 
  Sliders, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  BarChart3, 
  Settings,
  ChevronRight
} from 'lucide-react';

import { isRouteAllowed } from '../constants/roles';

export default function Sidebar() {
  const location = useLocation();
  const currentRole = localStorage.getItem('ir_user_role') || 'DRM';
  const currentDept = localStorage.getItem('ir_user_dept') || 'ALL';

  const getDepartmentLabel = (baseLabel, path) => {
    const r = currentRole.toUpperCase();
    if (r === 'ENGINEERING') {
      if (path === '/maintenance') return 'Track Maintenance (Civil)';
      if (path === '/defects') return 'P-Way Defects & USFD';
      if (path === '/assets') return 'Track & Civil Assets';
    }
    if (r === 'TRD') {
      if (path === '/maintenance') return 'OHE Traction Maintenance';
      if (path === '/defects') return 'Traction / OHE Defects';
      if (path === '/assets') return 'TRD & Power Assets';
    }
    if (r === 'S&T') {
      if (path === '/maintenance') return 'Signal & Telecom Maintenance';
      if (path === '/defects') return 'Signal & Point Defects';
      if (path === '/assets') return 'S&T Assets Registry';
    }
    return baseLabel;
  };

  const NAV_SECTIONS = [
    {
      title: "OPERATIONS & ASSETS",
      items: [
        { path: "/dashboard", label: "Operations Dashboard", icon: Activity },
        { path: "/maintenance", label: "Maintenance Tasks", icon: Wrench },
        { path: "/defects", label: "Defects & USFD Backlog", icon: ShieldAlert, badge: "P0/P1" },
        { path: "/assets", label: "Assets Registry", icon: Database },
        { path: "/trains", label: "Train Timetable & Tracking", icon: Train },
        { path: "/blocks", label: "Block Possessions", icon: Layers }
      ]
    },
    {
      title: "AI PLANNING & SIMULATION",
      items: [
        { path: "/block-planning", label: "Block Possession Planner", icon: Calendar },
        { path: "/ai-planning", label: "AI Block Optimizer", icon: Sparkles, isAi: true },
        { path: "/what-if", label: "What-If Sandbox", icon: Sliders },
        { path: "/resources", label: "Resource Allocation", icon: Truck }
      ]
    },
    {
      title: "GOVERNANCE & ANALYTICS",
      items: [
        { path: "/ai-review", label: "AI Review Center", icon: Sparkles, badge: "ADMIN", isAi: true },
        { path: "/approvals", label: "Officer Approvals", icon: CheckCircle2, badge: "DRM" },
        { path: "/alerts", label: "Safety Alerts", icon: AlertTriangle },
        { path: "/reports", label: "Analytics & Reports", icon: BarChart3 },
        { path: "/settings", label: "System Settings", icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0b1329] text-slate-300 flex flex-col border-r border-slate-800 shrink-0 select-none shadow-xl z-20">
      {/* Active Role Scope Banner */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-[10px] flex items-center justify-between">
        <span className="font-bold text-slate-400 uppercase tracking-wider">Role Scope</span>
        <span className="font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
          {currentRole} ({currentDept})
        </span>
      </div>

      {/* Navigation Links Scroll Container */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter(item => isRouteAllowed(item.path, currentRole));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-2">
                {section.title}
              </h3>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const displayLabel = getDepartmentLabel(item.label, item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                      isActive
                        ? item.isAi 
                          ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/30' 
                          : 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                        : item.isAi
                          ? 'text-purple-300 hover:text-white hover:bg-purple-950/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : item.isAi ? 'text-purple-400' : 'text-slate-400 group-hover:text-blue-400'
                      }`} />
                      <span className="truncate">{displayLabel}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : item.badge === 'DRM' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Sidebar Footer: Gateway status indicator */}
      <div className="p-3 bg-[#080f21] border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Connected Gateways</span>
          <span className="flex items-center space-x-1 text-emerald-400 text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>4 / 4 Live</span>
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px] font-bold">
          <span className="bg-slate-800/80 py-1 rounded border border-slate-700/60 text-amber-400">TMS</span>
          <span className="bg-slate-800/80 py-1 rounded border border-slate-700/60 text-blue-400">SMMS</span>
          <span className="bg-slate-800/80 py-1 rounded border border-slate-700/60 text-yellow-400">TDMS</span>
          <span className="bg-slate-800/80 py-1 rounded border border-slate-700/60 text-emerald-400">COA</span>
        </div>
      </div>
    </aside>
  );
}
