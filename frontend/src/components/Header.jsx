import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Search, 
  User, 
  ChevronDown, 
  LogOut, 
  Train, 
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X
} from 'lucide-react';
import apiClient from '../api/client';
import { USER_ROLES } from '../constants/roles';

export default function Header({ activeUser, setActiveUser }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    fetchHeaderAlerts();
  }, []);

  const fetchHeaderAlerts = async () => {
    try {
      const res = await apiClient.get('/alerts?unread_only=true');
      setAlerts(res.data.alerts || []);
    } catch (err) {
      // Fallback
    }
  };

  const handleRoleSelect = async (roleKey) => {
    const creds = USER_ROLES.find(r => r.id === roleKey || r.role === roleKey || r.username === roleKey) || USER_ROLES[roleKey];
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
      setShowProfileMenu(false);
    } catch (err) {
      console.error("Fast role switch failed", err);
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
    } else if (q.includes('asset') || q.includes('rail') || q.includes('mast')) {
      navigate(`/assets?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`/dashboard?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const currentRoleName = activeUser?.role || localStorage.getItem('ir_user_role') || 'DRM';
  const currentFullName = activeUser?.full_name || localStorage.getItem('ir_user_name') || 'Divisional Railway Manager';
  const currentDept = activeUser?.department || localStorage.getItem('ir_user_dept') || 'HQ';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-30 sticky top-0 shadow-2xs">
      {/* Brand Title Area */}
      <div className="flex items-center space-x-3.5 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-400 shadow-md shadow-emerald-500/25">
          <div className="w-full h-full rounded-full bg-slate-900/90 overflow-hidden flex items-center justify-center p-0.5 border border-emerald-300/60">
            <img 
              src="/railoptima-logo.png" 
              alt="RailOptima" 
              className="w-full h-full object-contain filter drop-shadow"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-slate-900 text-sm md:text-base tracking-tight leading-none">
              RailOptima
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
              IR-ABPS AI
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center space-x-1.5">
            <span>Indian Railways Block Planning</span>
            <span className="inline-block w-1 h-1 rounded-full bg-emerald-500"></span>
            <span className="text-emerald-700 font-semibold">Live AI Active</span>
          </p>
        </div>
      </div>

      {/* Universal Search Bar */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trains, defects, blocks, sections (e.g. 12002, USFD, NDLS-AGC)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </form>

      {/* Header Actions & Profile */}
      <div className="flex items-center space-x-3">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {alerts.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {alerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-xs text-slate-900">Safety & Operational Alerts</span>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto mt-2">
                {alerts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No unread alerts</p>
                ) : (
                  alerts.slice(0, 4).map((alt) => (
                    <div key={alt.id} className="py-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${alt.severity === 'Critical' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {alt.severity}
                        </span>
                        <span className="text-[10px] text-slate-400">{alt.section_code}</span>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-tight line-clamp-2">{alt.message}</p>
                    </div>
                  ))
                )}
              </div>
              <button 
                onClick={() => { setShowNotifications(false); navigate('/alerts'); }}
                className="w-full mt-2 pt-2 border-t border-slate-100 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 block"
              >
                View all safety alerts &rarr;
              </button>
            </div>
          )}
        </div>

        {/* User Profile Pill & Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2.5 pl-2 pr-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {currentRoleName.substring(0, 2).toUpperCase()}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight flex items-center space-x-1.5">
                <span>{currentFullName.split(' ')[0]}</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                  {currentRoleName}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                <span className="font-semibold text-slate-700 uppercase">DEPT: {currentDept}</span>
                <span>•</span>
                <span>Bhopal Div</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in duration-150">
              <div className="pb-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentFullName}</p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded">
                    {currentRoleName}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Dept: {currentDept}
                  </span>
                </div>
              </div>

              {/* Fast Role Switcher */}
              <div className="py-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Switch Active Role (RBAC Simulation)
                </p>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {USER_ROLES.map((r) => {
                    const isActive = currentRoleName === r.role || currentRoleName === r.systemRole;
                    return (
                      <button
                        key={r.id}
                        onClick={() => handleRoleSelect(r.id)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-blue-50 text-blue-900 border border-blue-300 font-bold'
                            : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${r.color}`}></span>
                          <div>
                            <span className="block font-semibold">{r.label}</span>
                            <span className="text-[9px] text-slate-400 block">{r.title} ({r.department})</span>
                          </div>
                        </div>
                        {isActive && <span className="text-[10px] text-blue-600 font-bold">ACTIVE</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

