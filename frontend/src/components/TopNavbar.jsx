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
  CalendarDays,
  MessageSquare
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
      titleTop: 'Operations',
      titleBottom: '& Assets',
      icon: Activity,
      primaryPath: '/dashboard',
      items: [
        { path: "/dashboard", label: "Executive Dashboard", description: "Real-time network KPIs & health", icon: Activity },
        { path: "/whatsapp-dispatcher", label: "WhatsApp Field Dispatcher", description: "2-Way ground crew dispatch & re-sequencer", icon: MessageSquare, badge: "WhatsApp" },
        { path: "/trains", label: "Train Timetable & Tracking", description: "Live train positions & ETA delay", icon: Train },
        { path: "/maintenance", label: "Maintenance Tasks", description: "Civil, TRD & S&T work orders", icon: Wrench },
        { path: "/defects", label: "Defects & USFD Backlog", description: "Track flaws & speed restrictions", icon: ShieldAlert, badge: "P0/P1" },
        { path: "/assets", label: "Fixed Assets Registry", description: "Infrastructure assets & lifecycle", icon: Database },
        { path: "/blocks", label: "Block Possessions", description: "Corridor possession registry", icon: Layers }
      ]
    },
    {
      id: 'ai_studio',
      label: 'AI Planning & Studio',
      titleTop: 'AI Planning',
      titleBottom: '& Studio',
      icon: Sparkles,
      primaryPath: '/optimization-studio',
      isAi: true,
      items: [
        { path: "/optimization-studio", label: "Block Optimization Studio", description: "Multi-objective block solver", icon: Cpu, badge: "Optimal" },
        { path: "/ai-planning", label: "Block Prioritization", description: "Asset risk & traffic conflict engine", icon: Sparkles },
        { path: "/block-planning", label: "Possession Planner", description: "Calendar & window scheduler", icon: Calendar },
        { path: "/weekly-planner", label: "7-Day & 30-Day Schedule", description: "Gantt timeline & corridor windows", icon: CalendarDays },
        { path: "/what-if", label: "What-If Sandbox Simulation", description: "Disruption impact forecasting", icon: Sliders },
        { path: "/resources", label: "Resource Allocation", description: "Machinery & maintenance gangs", icon: Truck }
      ]
    },
    {
      id: 'coordination',
      label: 'Coordination & GIS',
      titleTop: 'Coordination',
      titleBottom: '& GIS',
      icon: Layers,
      primaryPath: '/department-coordination',
      items: [
        { path: "/department-coordination", label: "Integrated Shadow Blocks", description: "Multi-dept joint work & anti-gaming", icon: Scale, badge: "Joint" },
        { path: "/corridor-map", label: "GIS Corridor & Risk Map", description: "Spatial railway corridor tracking", icon: MapPin },
        { path: "/integrations", label: "Enterprise Gateway Feeds", description: "Live TMS, SMMS, TDMS & COA feeds", icon: Network }
      ]
    },
    {
      id: 'governance',
      label: 'Governance & Analytics',
      titleTop: 'Governance',
      titleBottom: '& Analytics',
      icon: ShieldAlert,
      primaryPath: '/approvals',
      items: [
        { path: "/approvals", label: "Officer Sign-Off Queue", description: "Digital concurrence & approvals", icon: CheckCircle2, badge: "DRM" },
        { path: "/alerts", label: "Safety & Speed Alerts", description: "Urgent notifications & alarms", icon: AlertTriangle },
        { path: "/ai-review", label: "Model Review Center", description: "Recommendation validations", icon: Sparkles },
        { path: "/reports", label: "Executive Reports & KPIs", description: "Dossier generation & punctuality", icon: BarChart3 },
        { path: "/audit-logs", label: "Statutory Audit Trail", description: "Immutable decision logs", icon: History },
        { path: "/settings", label: "System Preferences", description: "Department scopes & thresholds", icon: Settings }
      ]
    }
  ];

  // Quick Direct Pill Links
  const QUICK_PILLS = [
    { path: "/dashboard", label: "Dashboard", icon: Activity },
    { path: "/whatsapp-dispatcher", label: "WhatsApp Crew", icon: MessageSquare, badge: "WA" },
    { path: "/optimization-studio", label: "Optimizer", icon: Sparkles, isAi: true },
    { path: "/department-coordination", label: "Shadow Blocks", icon: Scale },
    { path: "/corridor-map", label: "GIS Map", icon: MapPin },
    { path: "/trains", label: "Trains", icon: Train },
    { path: "/approvals", label: "Approvals", icon: CheckCircle2, badge: "DRM" }
  ];

  return (
    <header className="sticky top-0 z-50 glass-header-nav select-none shadow-xs">
      {/* Tier 1: Utility Bar */}
      <div className="w-full max-w-full 2xl:max-w-[1720px] mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Identity */}
          <div 
            className="flex items-center space-x-3 cursor-pointer shrink-0 group select-none" 
            onClick={() => navigate('/dashboard')}
            title="RailOptima • Indian Railways AI Block Planning & Optimization"
          >
            <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 shadow-md shadow-emerald-600/25 group-hover:shadow-lg group-hover:shadow-emerald-500/40 transition-all duration-300 transform group-hover:scale-105">
              <div className="w-full h-full rounded-full bg-slate-900/90 overflow-hidden flex items-center justify-center p-0.5 border border-emerald-300/60">
                <img 
                  src="/railoptima-logo.png" 
                  alt="RailOptima Logo" 
                  className="w-full h-full object-contain filter drop-shadow group-hover:rotate-2 transition-transform duration-300"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-xs" title="Live AI System Active">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping opacity-75"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  RailOptima
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-sky-500/15 text-emerald-950 border border-emerald-400/60 shadow-2xs">
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

            {/* AI Copilot Mascot Button in Header */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-railoptima-chatbot'))}
              className="flex items-center space-x-1.5 px-3 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-full text-[11px] font-bold shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              title="Open RailOptima Agentic Copilot"
            >
              <div className="w-4 h-4 rounded-full overflow-hidden border border-white/80 shrink-0">
                <img src="/chatbot_avatar.png" alt="Bot" className="w-full h-full object-cover" />
              </div>
              <span className="hidden sm:inline">AI Copilot</span>
              <Sparkles className="w-3 h-3 text-cyan-200 animate-pulse" />
            </button>

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
      <div className="bg-white/95 border-t border-slate-200/80 shadow-xs backdrop-blur-md relative z-40">
        <div className="w-full max-w-full 2xl:max-w-[1720px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between py-1 gap-1.5 relative" ref={navDropdownsRef}>
            
            {/* Direct Quick Pills (Left Scrollable Strip) */}
            <div className="flex items-center space-x-1 shrink-0 overflow-x-auto no-scrollbar py-0.5">
              {QUICK_PILLS.map((pill) => {
                const Icon = pill.icon;
                const isActive = location.pathname === pill.path;

                return (
                  <NavLink
                    key={pill.path}
                    to={pill.path}
                    className={({ isActive }) => `flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive 
                        ? 'nav-pill-active' 
                        : pill.isAi
                          ? 'text-purple-700 hover:bg-purple-50 hover:text-purple-900'
                          : 'text-slate-600 hover:bg-emerald-50/70 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
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

            {/* Mega Dropdown Group Trigger Buttons (Right Section) */}
            <div className="hidden lg:flex items-center space-x-1 shrink-0 border-l border-slate-200/80 pl-1.5 ml-1">
              {NAV_GROUPS.map((group) => {
                const GroupIcon = group.icon;
                const isGroupActive = group.items.some(item => item.path === location.pathname);
                const isDropdownOpen = openDropdownId === group.id;

                return (
                  <div key={group.id} className="relative">
                    {/* Category Group Button with stacked 2-line layout */}
                    <button
                      onClick={() => {
                        if (isDropdownOpen) {
                          setOpenDropdownId(null);
                        } else {
                          setOpenDropdownId(group.id);
                        }
                      }}
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer select-none text-left ${
                        isGroupActive
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-300/90 shadow-2xs'
                          : isDropdownOpen
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border border-transparent hover:border-emerald-200/80'
                      }`}
                      title={`Explore ${group.label} modules`}
                    >
                      <GroupIcon className={`w-3.5 h-3.5 shrink-0 ${isGroupActive ? 'text-emerald-700' : isDropdownOpen ? 'text-cyan-300' : 'text-emerald-600'}`} />
                      <div className="flex flex-col leading-[1.05] min-w-0">
                        <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">{group.titleTop}</span>
                        <span className={`text-[9px] font-semibold whitespace-nowrap ${isGroupActive ? 'text-emerald-800' : isDropdownOpen ? 'text-cyan-200' : 'text-slate-500'}`}>{group.titleBottom}</span>
                      </div>
                      <ChevronDown className={`w-3 h-3 shrink-0 ml-0.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-cyan-300' : 'text-slate-400'}`} />
                    </button>

                    {/* Popover Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 z-[100] animate-in fade-in zoom-in-95 duration-150">
                        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-950/20 border border-slate-200/90 p-2.5 text-xs">
                          {/* Dropdown Header */}
                          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="p-1 rounded-lg bg-emerald-50 text-emerald-700">
                                <GroupIcon className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-extrabold text-slate-800">{group.label}</span>
                            </div>
                            {group.primaryPath && (
                              <button
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  navigate(group.primaryPath);
                                }}
                                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                              >
                                View Main &rarr;
                              </button>
                            )}
                          </div>

                          {/* Sub-item List */}
                          <div className="py-1 space-y-0.5 max-h-[380px] overflow-y-auto">
                            {group.items.map((subItem) => {
                              const SubIcon = subItem.icon;
                              const isSubActive = location.pathname === subItem.path;

                              return (
                                <button
                                  key={subItem.path}
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    navigate(subItem.path);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer text-left ${
                                    isSubActive
                                      ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200 shadow-2xs'
                                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div className={`p-1.5 rounded-lg shrink-0 ${isSubActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                      <SubIcon className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold truncate">{subItem.label}</div>
                                      {subItem.description && (
                                        <div className="text-[10px] text-slate-400 font-normal truncate">{subItem.description}</div>
                                      )}
                                    </div>
                                  </div>
                                  {subItem.badge && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 ml-2">
                                      {subItem.badge}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-4 animate-in slide-in-from-top max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSearchSubmit} className="mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </form>

          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1.5">
              <div className="flex items-center space-x-1.5 text-[11px] font-extrabold uppercase text-slate-500 px-2">
                <group.icon className="w-3.5 h-3.5 text-emerald-600" />
                <span>{group.label}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                      isActive ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-50 hover:bg-emerald-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <item.icon className="w-3.5 h-3.5" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-800">
                        {item.badge}
                      </span>
                    )}
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
