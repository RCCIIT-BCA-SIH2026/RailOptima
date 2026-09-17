import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { isRouteAllowed, USER_ROLES } from '../constants/roles';

export default function RouteGuard({ path, activeUser, children }) {
  const navigate = useNavigate();
  const currentRole = activeUser?.canonical_role || activeUser?.role || localStorage.getItem('ir_user_role') || 'DRM';
  const currentDept = activeUser?.department || localStorage.getItem('ir_user_dept') || 'HQ';
  const allowed = isRouteAllowed(path, currentRole);

  if (allowed) {
    return children;
  }

  // Find authorized roles for this path to inform the user
  const authorizedRoles = USER_ROLES.filter(r => isRouteAllowed(path, r.role));

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-rose-200 shadow-xl overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-4 text-white flex items-center space-x-3">
          <div className="p-2 bg-white/15 rounded-lg">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">403 - Access Forbidden</h2>
            <p className="text-xs text-rose-100 font-medium">Department Role-Based Access Control (RBAC)</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-start space-x-3.5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-900">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold">Strict Department Isolation Active: </span>
              Your current authenticated session does not have permission to access <code className="px-1.5 py-0.5 bg-rose-100/80 rounded font-mono text-rose-800 font-bold">{path}</code>.
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 font-medium">Active User:</span>
              <span className="font-bold text-slate-900">{activeUser?.full_name || localStorage.getItem('ir_user_name') || 'Authenticated User'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <span className="text-slate-500 font-medium">Active Role:</span>
              <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">
                {currentRole}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Department Scope:</span>
              <span className="font-mono font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded">
                {currentDept}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Authorized Roles For This Module:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {authorizedRoles.map(r => (
                <span key={r.id} className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  {r.label}
                </span>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Operations Dashboard</span>
            </button>

            <span className="text-[11px] text-slate-400">
              Use header profile to switch role
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

