import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Train, ShieldCheck, Lock, User, ArrowRight, AlertCircle, Check, Sparkles } from 'lucide-react';
import apiClient from '../api/client';
import { USER_ROLES } from '../constants/roles';

export default function LoginView({ setActiveUser }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDemoRole, setSelectedDemoRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e, customCreds = null) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const loginUser = customCreds ? customCreds.username : username.trim();
    const loginPass = customCreds ? customCreds.password : password;

    try {
      const res = await apiClient.post('/auth/login', {
        username: loginUser,
        password: loginPass
      });

      const access_token = res.data.access_token;
      const user = res.data.user || {
        username: res.data.username,
        role: res.data.canonical_role || res.data.role,
        system_role: res.data.role,
        canonical_role: res.data.canonical_role || res.data.role,
        department: res.data.department || 'ALL',
        full_name: res.data.full_name
      };

      localStorage.setItem('ir_access_token', access_token);
      localStorage.setItem('ir_user_role', user.canonical_role || user.role);
      localStorage.setItem('ir_system_role', user.system_role || user.role);
      localStorage.setItem('ir_user_dept', user.department || 'ALL');
      localStorage.setItem('ir_user_name', user.full_name);

      if (setActiveUser) setActiveUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectAndLoginRole = (roleItem) => {
    setSelectedDemoRole(roleItem.id);
    setUsername(roleItem.username);
    setPassword(roleItem.password);
    handleLogin(null, { username: roleItem.username, password: roleItem.password });
  };

  return (
    <div className="relative min-h-screen app-wallpaper-bg flex flex-col justify-center items-center p-4">
      {/* Frosted Glass Backdrop Scrim */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-emerald-950/40 backdrop-blur-sm pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
        {/* Header Emblem */}
        <div className="text-center mb-6 max-w-lg">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/30 mb-3 border border-white/40 ring-4 ring-emerald-400/20">
            <Train className="w-9 h-9" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md">
            RailOptima &bull; Indian Railways
          </h1>
          <p className="text-emerald-300 font-semibold text-sm mt-0.5 drop-shadow-sm">
            AI-Powered Automatic Block Planning & Optimization
          </p>
          <span className="inline-flex items-center space-x-1.5 mt-2.5 text-[10px] font-mono uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-md px-3 py-1 rounded-full shadow-sm">
            <Sparkles className="w-3 h-3 text-emerald-300" />
            <span>RBAC ACCESS &bull; 6 RAILWAY OPERATIONAL ROLES</span>
          </span>
        </div>

        {/* Main Login Glass Card */}
        <div className="w-full glass-card bg-white/90 border border-white/80 shadow-2xl rounded-2xl p-6 md:p-8 backdrop-blur-xl">
          <div className="mb-5 text-center sm:text-left">
            <h2 className="text-lg font-bold text-slate-900">Operations Console Authentication</h2>
            <p className="text-xs text-slate-600 mt-0.5">Select a pre-configured role for 1-click instant login or enter credentials</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 6 One-Click Demo Accounts Grid */}
          <div className="mb-6">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>One-Click Role Authentication</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Instant Access
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {USER_ROLES.map((r) => {
                const isSelected = selectedDemoRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => selectAndLoginRole(r)}
                    disabled={loading}
                    className={`text-left p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between hover:shadow-md ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                        : 'bg-white/80 border-slate-200/90 text-slate-700 hover:bg-emerald-50/40 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                        <span className={`w-2 h-2 rounded-full ${r.color}`}></span>
                        <span>{r.role}</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {r.department}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium truncate">{r.title}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">user: {r.username}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
              <span className="bg-white/90 px-3 py-0.5 rounded-full border border-slate-200">Or Sign In Manually</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username / Designation</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin, drm, engineering_officer"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2 active:scale-98"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Disclaimer */}
        <p className="mt-5 text-xs text-white/80 font-medium text-center max-w-md drop-shadow-sm">
          Indian Railways AI Block Planning Platform &bull; Problem Statement SIH26027.
        </p>
      </div>
    </div>
  );
}
