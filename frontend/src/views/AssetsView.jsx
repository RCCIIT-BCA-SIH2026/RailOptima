import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Database, 
  Search, 
  Filter, 
  Activity, 
  Layers, 
  Server, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Lock
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function AssetsView() {
  const { activeUser } = useOutletContext() || {};

  const currentRole = (activeUser?.canonical_role || activeUser?.role || localStorage.getItem('ir_user_role') || 'ENGINEERING').toUpperCase();
  const userDept = (activeUser?.department || localStorage.getItem('ir_user_dept') || 'ENG').toUpperCase();
  const isAdmin = currentRole === 'ADMIN' || currentRole === 'ADMINISTRATOR';

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState(isAdmin ? 'ALL' : userDept);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Keep departmentFilter synced if user switches
  useEffect(() => {
    if (!isAdmin) {
      setDepartmentFilter(userDept);
    }
  }, [isAdmin, userDept]);

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Non-admin users are strictly locked to their department code
      if (!isAdmin) {
        params.department_code = userDept;
      } else if (departmentFilter !== 'ALL') {
        params.department_code = departmentFilter;
      }

      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await apiClient.get('/assets', { params });
      setAssets(res.data.assets || []);
    } catch (err) {
      console.error("Failed to load assets", err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userDept, departmentFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAssets();
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'bg-emerald-600 text-emerald-700';
    if (score >= 60) return 'bg-amber-500 text-amber-700';
    return 'bg-rose-600 text-rose-700';
  };

  const getDepartmentName = (code) => {
    switch (code) {
      case 'ENG': return 'Civil Engineering (P-Way)';
      case 'TRD': return 'Traction Distribution (TRD)';
      case 'SNT': return 'Signal & Telecom (S&T)';
      default: return code;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Railway Physical Assets Registry
            </h2>
            <Badge variant="warning">SIMULATED DEMO DATA</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin 
              ? "Full central registry across Permanent Way, Signalling Interlocking, and 25kV OHE Catenary infrastructure."
              : `Strictly isolated to ${getDepartmentName(userDept)} infrastructure assets.`}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isAdmin && (
            <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{userDept} Isolated</span>
            </span>
          )}
          <Badge variant="secondary" className="px-3 py-1 font-mono text-xs font-bold">
            {assets.length} Assets Listed
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Department Filter: Admin sees tabs; Non-admin sees locked department pill */}
          {isAdmin ? (
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {['ALL', 'ENG', 'SNT', 'TRD'].map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    departmentFilter === dept
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {dept === 'ALL' ? 'All Assets (Central)' : dept === 'ENG' ? 'Civil (P-Way)' : dept === 'SNT' ? 'Signal (S&T)' : 'Traction (TRD)'}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-blue-50/90 border border-blue-200 rounded-lg text-xs font-bold text-blue-900">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Department Scope: {getDepartmentName(userDept)}</span>
              <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded font-mono font-bold">
                {userDept} ONLY
              </span>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${userDept} assets by code, name...`}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button type="submit" variant="primary" size="sm">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card className="shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Asset Code</th>
                <th className="py-3 px-4">Asset Name & Classification</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Section & Location</th>
                <th className="py-3 px-4">Health Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Inspected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <span>Loading department asset inventory from database...</span>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No railway assets found matching criteria in {getDepartmentName(userDept)}.
                  </td>
                </tr>
              ) : (
                assets.map((a) => (
                  <tr key={a.id || a.asset_code} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {a.asset_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{a.asset_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{a.asset_type}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.department_code === 'ENG' ? 'warning' : a.department_code === 'SNT' ? 'primary' : 'warning'}>
                        {a.department_code}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-900 font-semibold">{a.section_code}</div>
                      <div className="text-[11px] text-slate-500">Km {a.km_location}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold font-mono text-xs ${a.health_score >= 80 ? 'text-emerald-700' : a.health_score >= 60 ? 'text-amber-700' : 'text-rose-700'}`}>
                          {a.health_score}%
                        </span>
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${a.health_score >= 80 ? 'bg-emerald-600' : a.health_score >= 60 ? 'bg-amber-500' : 'bg-rose-600'}`} 
                            style={{ width: `${a.health_score}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={a.status === 'Operational' ? 'success' : a.status === 'Degraded' ? 'warning' : 'critical'}>
                        {a.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {a.installation_date ? new Date(a.installation_date).toLocaleDateString() : 'Active'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
