import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Search,
  Bell,
  User,
  ChevronDown,
  LogOut,
  MapPin,
  Scale,
  Menu,
  X,
  Zap,
  Cpu,
  History,
  Network,
  CalendarDays
} from 'lucide-react';
import apiClient from '../api/client';
import { USER_ROLES, isRouteAllowed } from '../constants/roles';

export default function TopNavbar({ activeUser, setActiveUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const roleMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notifMenuRef = useRef(null);
  const navDropdownsRef = useRef(null);

  const currentRole = activeUser?.canonical_role || activeUser?.role || localStorage.getItem('ir_user_role') || 'DRM';
  const currentFullName = activeUser?.full_name || localStorage.getItem('ir_user_name') || 'Divisional Railway Manager';
  const currentDept = activeUser?.department || localStorage.getItem('ir_user_dept') || 'HQ';

  useEffect(() => {
    fetchHeaderAlerts();
    const handleClickOutside = (event) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target)) {
        setShowRoleMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (navDropdownsRef.current && !navDropdownsRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdownId(null);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const fetchHeaderAlerts = async () => {
    try {
      const res = await apiClient.get('/alerts?unread_only=true');
      setAlerts(res.data.alerts || []);
    } catch {
      // Fallback
    }
  };

  const handleRoleSelect = async (roleKey) => {
    const creds = USER_ROLES.find(r => r.id === roleKey || r.role === roleKey || r.canonical_role === roleKey || r.username === roleKey) || USER_ROLES[0];
    if (!creds) return;

    try {
      const res = await apiClient.post('/auth/login', {
        username: creds.username,
        password: creds.password
      });
      const access_token = res.data.access_token;
      const user = res.data.user || {
        username: res.data.username,
        role: res.data.canonical_role || res.data.role,
        canonical_role: res.data.canonical_role || res.data.role,
        department: res.data.department || 'ALL',
        full_name: res.data.full_name
      };

      localStorage.setItem('ir_access_token', access_token);
      localStorage.setItem('ir_user_role', user.canonical_role || user.role);
      localStorage.setItem('ir_user_dept', user.department || 'ALL');
      localStorage.setItem('ir_user_name', user.full_name);
      setActiveUser(user);
      setShowRoleMenu(false);
      setShowProfileMenu(false);
    } catch (err) {
      console.error("Role switch failed", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ir_access_token');
    localStorage.removeItem('ir_user_role');
    localStorage.removeItem('ir_user_dept');
    localStorage.removeItem('ir_user_name');
    setActiveUser(null);
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('train') || !isNaN(q)) {
      navigate(`/trains?q=${encodeURIComponent(searchQuery)}`);
    } else if (q.includes('defect') || q.includes('usfd')) {
      navigate(`/defects?q=${encodeURIComponent(searchQuery)}`);
    } else if (q.includes('block')) {
      navigate(`/blocks?q=${encodeURIComponent(searchQuery)}`);
    } else if (q.includes('asset')) {
      navigate(`/assets?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/dashboard?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Nav Groups Structure
  const NAV_GROUPS = [
    {
      id: 'operations',
      label: 'Operations & Assets',
      icon: Activity,
      items: [
        { path: "/dashboard", label: "Executive Dashboard", icon: Activity },
        { path: "/trains", label: "Train Timetable & Tracking", icon: Train },
        { path: "/maintenance", label: "Maintenance Tasks", icon: Wrench },
        { path: "/defects", label: "Defects & USFD Backlog", icon: ShieldAlert, badge: "P0/P1" },
        { path: "/assets", label: "Fixed Assets Registry", icon: Database },
        { path: "/blocks", label: "Block Possessions", icon: Layers }
      ]
    },
    {
      id: 'ai_studio',
      label: 'AI Planning & Studio',
      icon: Sparkles,
      isAi: true,
      items: [
        { path: "/optimization-studio", label: "AI Block Optimization Studio", icon: Cpu, isAi: true, badge: "CP-SAT" },
        { path: "/ai-planning", label: "AI Block Prioritization", icon: Sparkles, isAi: true },
        { path: "/block-planning", label: "Block Possession Planner", icon: Calendar },
        { path: "/weekly-planner", label: "7-Day & 30-Day Gantt Schedule", icon: CalendarDays },
        { path: "/what-if", label: "What-If Sandbox Simulation", icon: Sliders },
        { path: "/resources", label: "Machinery & Gang Allocation", icon: Truck }
      ]
    },
    {
      id: 'coordination',
      label: 'Coordination & GIS',
      icon: Layers,
      items: [
        { path: "/department-coordination", label: "Multi-Dept Shadow Blocks & Anti-Gaming", icon: Scale, badge: "SHADOW" },
        { path: "/corridor-map", label: "GIS Corridor & Section Risk Map", icon: MapPin },
        { path: "/integrations", label: "TMS / SMMS / TDMS / COA Feeds", icon: Network }
      ]
    },
    {
      id: 'governance',
      label: 'Governance & Analytics',
      icon: ShieldAlert,
      items: [
        { path: "/approvals", label: "Officer Sign-Off Queue", icon: CheckCircle2, badge: "DRM" },
        { path: "/alerts", label: "Safety & Speed Alerts", icon: AlertTriangle },
        { path: "/ai-review", label: "AI Model Review Center", icon: Sparkles, isAi: true },
        { path: "/reports", label: "Executive Reports & KPIs", icon: BarChart3 },
        { path: "/audit-logs", label: "Audit Logs & Statutory Trail", icon: History },
        { path: "/settings", label: "System Preferences", icon: Settings }
      ]
    }
  ];

  // Quick Direct Pill Links
  const QUICK_PILLS = [
    { path: "/dashboard", label: "Dashboard", icon: Activity },
    { path: "/optimization-studio", label: "AI Optimizer", icon: Sparkles, isAi: true },
    { path: "/department-coordination", label: "Shadow Blocks", icon: Scale },
    { path: "/corridor-map", label: "GIS Map", icon: MapPin },
    { path: "/trains", label: "Trains", icon: Train },
    { path: "/approvals", label: "Approvals", icon: CheckCircle2, badge: "DRM" }
  ];

  return (
    <header className="sticky top-0 z-50 glass-header-nav select-none shadow-xs">
      {/* Tier 1: Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => navigate('/dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/25">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black tracking-tight text-slate-900">
                  RailOptima
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  IR-ABPS AI
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1.5">
                <span>Indian Railways Block Planning</span>
                <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-700 font-bold">Live AI Active</span>
              </p>
            </div>
          </div>

          {/* Universal Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trains, defects, blocks, sections (e.g. 12002, USFD, NDLS-AGC)..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-white/90 border border-slate-200/90 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition shadow-2xs"
              />
            </div>
          </form>

          {/* Right Header Utilities */}
          <div className="flex items-center space-x-2 shrink-0">
            
            {/* Live Gateway Telemetry Status Badge */}
            <div className="hidden lg:flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>4 Gateways Online</span>
            </div>

            {/* Notifications Popover */}
            <div className="relative" ref={notifMenuRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-emerald-50 rounded-xl relative transition cursor-pointer"
                title="Notifications & Alerts"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-xs">
                    {alerts.length}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-slate-900 text-xs">Safety & Dispatch Alerts</span>
                    <span className="text-[10px] text-emerald-700 font-bold">{alerts.length} unread</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto mt-2 space-y-2">
                    {alerts.length > 0 ? (
                      alerts.slice(0, 4).map((a, i) => (
                        <div key={i} className="pt-2 text-slate-700 hover:bg-emerald-50/50 p-1.5 rounded-lg transition">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span>{a.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{a.message}</p>
                        </div>
                      ))
                    ) : (
                      <div className="py-4 text-center text-slate-400">All corridors clear • Zero active safety alerts</div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 mt-2 text-center">
                    <button 
                      onClick={() => { setShowNotifications(false); navigate('/alerts'); }}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      View All Alerts &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fast Role Switcher Dropdown */}
            <div className="relative" ref={roleMenuRef}>
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-800 shadow-2xs transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-mono text-emerald-900">{currentRole}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-2 z-50 text-xs animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Fast Role Switcher (Demo)</span>
                  </div>
                  <div className="py-1 space-y-1">
                    {USER_ROLES.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => handleRoleSelect(role.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition cursor-pointer ${
                          currentRole === (role.canonical_role || role.role)
                            ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200' 
                            : 'hover:bg-emerald-50/40 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-bold">{role.name}</div>
                          <div className="text-[10px] text-slate-500">{role.department} • {role.canonical_role || role.role}</div>
                        </div>
                        {currentRole === (role.canonical_role || role.role) && (
                          <span className="text-[10px] font-black text-emerald-700">ACTIVE</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 p-1.5 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {currentFullName.charAt(0)}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in">
                  <div className="pb-2 border-b border-slate-100">
                    <div className="font-extrabold text-slate-900">{currentFullName}</div>
                    <div className="text-[11px] text-emerald-700 font-semibold">{currentRole} • {currentDept}</div>
                  </div>
                  <div className="py-2 space-y-1">
                    <button 
                      onClick={() => { setShowProfileMenu(false); navigate('/settings'); }}
                      className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 rounded-lg text-slate-700 flex items-center space-x-2 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Settings & Preferences</span>
                    </button>
                    <button 
                      onClick={() => { setShowProfileMenu(false); navigate('/reports'); }}
                      className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 rounded-lg text-slate-700 flex items-center space-x-2 cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Analytics Reports</span>
                    </button>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-bold flex items-center space-x-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tier 2: Category & Navigation Pill Bar */}
      <div className="bg-white/85 border-t border-slate-200/80 shadow-2xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-1.5 overflow-x-auto no-scrollbar gap-1.5" ref={navDropdownsRef}>
            
            {/* Direct Quick Pills */}
            <div className="flex items-center space-x-1 shrink-0">
              {QUICK_PILLS.map((pill) => {
                const Icon = pill.icon;
                const isActive = location.pathname === pill.path;

                return (
                  <NavLink
                    key={pill.path}
                    to={pill.path}
                    className={({ isActive }) => `flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'nav-pill-active' 
                        : pill.isAi
                          ? 'text-purple-700 hover:bg-purple-50 hover:text-purple-900'
                          : 'text-slate-600 hover:bg-emerald-50/60 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{pill.label}</span>
                    {pill.badge && (
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pill.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Mega Dropdown Group Trigger Pills */}
            <div className="hidden lg:flex items-center space-x-1 shrink-0 border-l border-slate-200 pl-2">
              {NAV_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const isGroupActive = group.items.some(item => item.path === location.pathname);
                const isDropdownOpen = openDropdownId === group.id;

                return (
                  <div key={group.id} className="relative group">
                    <button
                      onClick={() => setOpenDropdownId(isDropdownOpen ? null : group.id)}
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isGroupActive
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : isDropdownOpen
                            ? 'bg-slate-100 text-slate-900 border border-slate-300'
                            : 'text-slate-600 hover:bg-emerald-50/60 hover:text-slate-900'
                      }`}
                    >
                      <GroupIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-600" />
                      <span>{group.label}</span>
                      <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : 'group-hover:rotate-180'}`} />
                    </button>

                    {/* Dropdown Menu Container (Hover or Click) */}
                    <div className={`absolute right-0 top-full pt-1.5 w-68 z-50 transition-all ${
                      isDropdownOpen ? 'block' : 'hidden group-hover:block'
                    }`}>
                      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200 p-2 text-xs animate-in fade-in">
                        <div className="space-y-1">
                          {group.items.filter(item => isRouteAllowed(item.path, currentRole)).map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = location.pathname === subItem.path;

                            return (
                              <NavLink
                                key={subItem.path}
                                to={subItem.path}
                                onClick={() => setOpenDropdownId(null)}
                                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                                  isSubActive
                                    ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                                    : 'text-slate-700 hover:bg-emerald-50/40'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                                  <span>{subItem.label}</span>
                                </div>
                                {subItem.badge && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
                                    {subItem.badge}
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-3 animate-in slide-in-from-top">
          <form onSubmit={handleSearchSubmit} className="mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </form>

          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 px-2">{group.label}</span>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.filter(item => isRouteAllowed(item.path, currentRole)).map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `p-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 ${
                      isActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50/60 text-slate-700'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
