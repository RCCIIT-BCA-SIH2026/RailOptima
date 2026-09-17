import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  Filter, 
  Clock, 
  Bell, 
  Check,
  Zap
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function AlertsView() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, unreadOnly]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (severityFilter !== 'ALL') params.severity = severityFilter;
      if (unreadOnly) params.unread_only = true;

      const res = await apiClient.get('/alerts', { params });
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (alertId) => {
    try {
      await apiClient.post(`/alerts/mark-read/${alertId}`);
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    } catch (err) {
      console.error("Failed to mark alert as read", err);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
              <span>Safety Alerts & Operational Caution Orders</span>
            </h2>
            <Badge variant="warning">SIMULATED DEMO DATA</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time notifications of ultrasonic rail weld flaws, temporary speed restrictions (TSR), and section conflicts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="critical">
            {alerts.filter(a => a.severity === 'Critical').length} Critical Safety Alerts
          </Badge>
        </div>
      </div>

      {/* Filter and Toggles */}
      <Card className="shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {['ALL', 'Critical', 'Warning', 'Info'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  severityFilter === sev
                    ? sev === 'Critical' 
                      ? 'bg-rose-600 text-white shadow-xs' 
                      : sev === 'Warning' 
                        ? 'bg-amber-600 text-white shadow-xs' 
                        : 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sev === 'ALL' ? 'All Alerts' : `${sev} Severity`}
              </button>
            ))}
          </div>

          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Show Unread Only</span>
          </label>
        </CardContent>
      </Card>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading active safety alerts from database...</span>
          </div>
        ) : alerts.length === 0 ? (
          <Card className="p-12 text-center text-slate-500 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <h4 className="font-bold text-slate-800 text-sm">No Active Caution Orders</h4>
            <p className="text-xs text-slate-400 mt-1">All section telemetry is operating within nominal safety thresholds.</p>
          </Card>
        ) : (
          alerts.map((a) => (
            <Card 
              key={a.id} 
              className={`transition hover:shadow-md ${
                !a.is_read ? 'border-l-4 border-l-rose-500 bg-rose-50/10' : ''
              }`}
            >
              <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant={a.severity === 'Critical' ? 'critical' : a.severity === 'Warning' ? 'warning' : 'secondary'}>
                      {a.severity}
                    </Badge>
                    <span className="font-mono font-bold text-xs text-slate-900">{a.section_code}</span>
                    <span className="text-[10px] text-slate-400">
                      {a.created_at ? new Date(a.created_at).toLocaleTimeString() : 'Recent'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 leading-snug">{a.message}</p>
                </div>

                <div className="shrink-0">
                  {!a.is_read ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkRead(a.id)}
                      className="text-xs"
                    >
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      <span>Acknowledge</span>
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Acknowledged</span>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

