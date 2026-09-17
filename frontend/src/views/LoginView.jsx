import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Train, ShieldCheck, Lock, User, ArrowRight, AlertCircle, Check } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-[#0b1329] via-[#0f172a] to-slate-900 flex flex-col justify-center items-center p-4">
      {/* Header Emblem */}
      <div className="text-center mb-6 max-w-lg">
        <div className="w-16 h-16 mx-auto bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-3 border border-blue-400/30">
          <Train className="w-9 h-9" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Indian Railways
        </h1>
        <p className="text-blue-400 font-semibold text-sm mt-0.5">
          AI-Powered Maintenance Block Planning System
        </p>
        <span className="inline-block mt-2 text-[10px] font-mono uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-0.5 rounded-full">
          RBAC DEMO • 6 INDEPENDENT RAILWAY ROLES
        </span>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8">
        <div className="mb-5 text-center sm:text-left">
          <h2 className="text-lg font-bold text-slate-900">Operations Console Authentication</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select a pre-configured role for 1-click instant login or enter credentials</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 6 One-Click Demo Accounts Grid */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>One-Click Role Login</span>
            <span className="text-[10px] font-normal text-blue-600">Click card to authenticate</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {USER_ROLES.map((r) => {
              const isSelected = selectedDemoRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectAndLoginRole(r)}
                  disabled={loading}
                  className={`text-left p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between hover:shadow-md ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900'
                      : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${r.color}`}></span>
                      <span>{r.role}</span>
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-600">
                      {r.department}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">{r.title}</div>
                  <div className="text-[9px] text-slate-400 font-mono mt-1">user: {r.username}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400"><span className="bg-white px-2">Or Sign In Manually</span></div>
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
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
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
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer Disclaimer */}
      <p className="mt-6 text-xs text-slate-500 text-center max-w-md">
        Indian Railways AI Block Planning Prototype • Problem Statement SIH26027. All operational data is simulated.
      </p>
    </div>
  );
}

