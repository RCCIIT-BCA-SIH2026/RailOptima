import React, { useEffect, useState } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  MapPin, 
  Activity, 
  CheckCircle2, 
  Wrench, 
  Clock,
  Layers
} from 'lucide-react';
import apiClient from '../api/client';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function ResourcesView() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchResources();
  }, [typeFilter, statusFilter]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = {};
      if (typeFilter !== 'ALL') params.resource_type = typeFilter;
      if (statusFilter !== 'ALL') params.availability_status = statusFilter;

      const res = await apiClient.get('/resources', { params });
      setResources(res.data.resources || []);
    } catch (err) {
      console.error("Failed to load resources", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResources = resources.filter(r => {
    return !searchQuery ||
      r.resource_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.resource_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.base_station?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return <Badge variant="success">Available</Badge>;
      case 'Deployed':
        return <Badge variant="primary">Deployed on Block</Badge>;
      case 'In_Maintenance':
        return <Badge variant="warning">In Maintenance Depot</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Track Maintenance Machines & Gang Allocation
            </h2>
            <Badge variant="warning">SIMULATED DEMO DATA</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track machines (BCM, Dynamic Tamping 09-3X, Tower Wagons, Rail Grinders) and departmental gang labor.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="px-3 py-1 font-mono text-xs font-bold">
            {resources.length} Units Stationed
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {['ALL', 'BCM', 'Tamping_Machine', 'Tower_Wagon', 'Rail_Grinder', 'Gang_Labor'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  typeFilter === type
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'ALL' ? 'All Resources' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resource code, base depot..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resources Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading equipment and gang rosters from database...</span>
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            No maintenance resources matching selected criteria.
          </div>
        ) : (
          filteredResources.map((r) => (
            <Card key={r.id || r.resource_code} className="hover:shadow-md transition">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {r.resource_code}
                  </span>
                  {getStatusBadge(r.availability_status)}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{r.resource_name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{r.department_name} ({r.department_code})</p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Machine Category:</span>
                    <span className="font-semibold text-slate-800">{r.resource_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Base Depot Station:</span>
                    <span className="font-mono font-bold text-blue-700 flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{r.base_station}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Assignment:</span>
                  <span className="font-semibold text-slate-700">
                    {r.availability_status === 'Available' ? 'Ready for Call-Out' : 'Attached to Active Block'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

