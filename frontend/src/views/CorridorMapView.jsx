import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Layers, AlertTriangle, ShieldCheck, Clock, ShieldAlert, 
  Activity, ArrowUpRight, MapPin, Search, Database, Globe
} from 'lucide-react';
import apiClient from '../api/client';
import { Badge } from '../components/ui/Badge';

// Fix Leaflet marker icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Station Pins
const stationIcon = L.divIcon({
  className: 'custom-station-pin',
  html: `<div style="background-color: #059669; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(5,150,105,0.8);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// Helper component to pan/zoom map programmatically
function MapController({ targetPos }) {
  const map = useMap();
  useEffect(() => {
    if (targetPos) {
      map.flyTo(targetPos, 9, { duration: 1.5 });
    }
  }, [targetPos, map]);
  return null;
}

export default function CorridorMapView() {
  const [sections, setSections] = useState([]);
  const [survivalMap, setSurvivalMap] = useState({});
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [panTarget, setPanTarget] = useState(null);
  const [mapLayer, setMapLayer] = useState('google_hybrid'); // 'google_hybrid', 'google_sat', 'google_streets', 'google_terrain'
  const [mongoStatus, setMongoStatus] = useState('connecting');

  const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_MAP_API_KEY || 'AIzaSyAnidLeEYWpn5GYU7h7GWKrkWr7f58lbd0';

  useEffect(() => {
    fetchMapData();
    checkMongoDB();
  }, []);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const [secRes, survRes] = await Promise.all([
        apiClient.get('/corridors/sections'),
        apiClient.get('/ai/survival/sections').catch(() => ({ data: [] }))
      ]);

      const survLookup = {};
      (survRes.data || []).forEach(item => {
        survLookup[item.section_code] = item;
      });

      setSections(secRes.data || []);
      setSurvivalMap(survLookup);
    } catch (err) {
      console.error("Failed to load map spatial telemetry", err);
    } finally {
      setLoading(false);
    }
  };

  const checkMongoDB = async () => {
    try {
      const res = await apiClient.get('/mongodb/status');
      if (res.data?.connection?.connected) {
        setMongoStatus('connected');
      } else {
        setMongoStatus('standby');
      }
    } catch {
      setMongoStatus('standby');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toLowerCase();
    
    // Search in section codes or station names
    const match = sections.find(s => 
      s.section_code?.toLowerCase().includes(query) ||
      s.start_station?.toLowerCase().includes(query) ||
      s.end_station?.toLowerCase().includes(query)
    );

    if (match && match.start_lat && match.start_lng) {
      setPanTarget([match.start_lat, match.start_lng]);
      setSelectedSection({ ...match, survival: survivalMap[match.section_code] || {} });
    }
  };

  // Map Tile Configuration (Google Maps API Suite)
  const getTileUrl = () => {
    switch (mapLayer) {
      case 'google_sat':
        return `https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&key=${googleApiKey}`;
      case 'google_streets':
        return `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleApiKey}`;
      case 'google_terrain':
        return `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&key=${googleApiKey}`;
      case 'google_hybrid':
      default:
        return `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${googleApiKey}`;
    }
  };

  const getTileAttribution = () => {
    return '&copy; <a href="https://maps.google.com" target="_blank" rel="noreferrer">Google Maps</a> Telemetry';
  };

  // Center on central Indian Railways trunk (Jhansi / Bhopal hub)
  const mapCenter = [25.4484, 78.5685];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <span>GIS Corridor & Section Risk Heatmap</span>
            <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded">
              Google Maps &bull; Weibull AFT Telemetry
            </span>
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            Spatial monitoring of trunk corridors (Delhi &ndash; Agra &ndash; Kanpur &ndash; Jhansi &ndash; Bhopal &ndash; Itarsi &ndash; Nagpur) with continuous survival hazard gradients.
          </p>
        </div>

        {/* Status Indicators & Search */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search station or section (e.g. Jhansi, NDLS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>

          {/* Cloud Sync Badge */}
          <div className="flex items-center space-x-1 text-xs px-2.5 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>MongoDB Atlas:</span>
            <span className={`font-semibold ${mongoStatus === 'connected' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {mongoStatus === 'connected' ? 'Live Synced' : 'Online / Buffered'}
            </span>
          </div>
        </div>
      </div>

      {/* Layer Switcher & Risk Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 glass-card px-4 py-2 border border-slate-200/80 shadow-sm text-xs">
        {/* Layer Toggle */}
        <div className="flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-semibold text-slate-700">Map Mode:</span>
          <div className="inline-flex rounded-md shadow-sm">
            <button
              onClick={() => setMapLayer('google_hybrid')}
              className={`px-3 py-1 text-xs font-semibold rounded-l-md border ${
                mapLayer === 'google_hybrid' ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Google Hybrid
            </button>
            <button
              onClick={() => setMapLayer('google_sat')}
              className={`px-3 py-1 text-xs font-semibold border-t border-b ${
                mapLayer === 'google_sat' ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Satellite (HD)
            </button>
            <button
              onClick={() => setMapLayer('google_streets')}
              className={`px-3 py-1 text-xs font-semibold border-t border-b ${
                mapLayer === 'google_streets' ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Road & Rail
            </button>
            <button
              onClick={() => setMapLayer('google_terrain')}
              className={`px-3 py-1 text-xs font-semibold rounded-r-md border ${
                mapLayer === 'google_terrain' ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Topography
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1.5 bg-rose-500 rounded"></span>
            <span className="text-slate-700 font-medium">Critical Risk (RUL &le; 30d)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1.5 bg-amber-500 rounded"></span>
            <span className="text-slate-700 font-medium">Elevated Risk (30d &ndash; 60d)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1.5 bg-emerald-500 rounded"></span>
            <span className="text-slate-700 font-medium">Nominal Health (RUL &gt; 60d)</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="glass-card border border-slate-200/80 rounded-xl overflow-hidden shadow-2xl h-[580px] relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          key={mapLayer} // Re-render tile engine when user toggles Google Maps
          style={{ height: '100%', width: '100%', backgroundColor: mapLayer.startsWith('google') ? '#1e293b' : '#0f172a' }}
        >
          <MapController targetPos={panTarget} />

          {/* Active Tile Layer (CartoDB or Google Maps) */}
          <TileLayer
            attribution={getTileAttribution()}
            url={getTileUrl()}
          />

          {sections.map((sec) => {
            if (!sec.start_lat || !sec.start_lng || !sec.end_lat || !sec.end_lng) return null;

            const survInfo = survivalMap[sec.section_code] || {};
            const failRisk = survInfo.failure_probability_30d ?? 0.25;
            const rulDays = survInfo.estimated_rul_days ?? 75;

            // Color coding based on ML failure risk
            let color = '#10b981'; // Green
            let weight = 4;
            if (failRisk >= 0.75 || rulDays <= 30) {
              color = '#f43f5e'; // Rose / Crimson
              weight = 6;
            } else if (failRisk >= 0.40 || rulDays <= 60) {
              color = '#f59e0b'; // Amber
              weight = 5;
            }

            const positions = [
              [sec.start_lat, sec.start_lng],
              [sec.end_lat, sec.end_lng]
            ];

            return (
              <React.Fragment key={sec.id}>
                <Polyline
                  positions={positions}
                  color={color}
                  weight={weight}
                  opacity={0.92}
                  eventHandlers={{
                    click: () => setSelectedSection({ ...sec, survival: survInfo })
                  }}
                >
                  <Tooltip sticky>
                    <div className="text-xs font-sans p-1">
                      <div className="font-bold text-slate-900">{sec.section_code}</div>
                      <div className="text-slate-600 font-medium">
                        30d Failure Risk: <strong className={failRisk >= 0.5 ? 'text-rose-600' : 'text-emerald-700'}>{Math.round(failRisk * 100)}%</strong>
                      </div>
                      <div className="text-slate-600">
                        Remaining Useful Life: <strong>{rulDays} days</strong>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        MPS: {sec.max_permissible_speed} km/h • {sec.current_traffic_density} GMT
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>

                {/* Station Pins */}
                <Marker position={[sec.start_lat, sec.start_lng]} icon={stationIcon}>
                  <Popup>
                    <div className="text-xs font-sans p-1 text-slate-900">
                      <strong>Station {sec.start_station}</strong>
                      <div>Section: {sec.section_code}</div>
                      <div>Speed Limit: {sec.max_permissible_speed} km/h</div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* Selected Section Flyout Overlay */}
        {selectedSection && (
          <div className="absolute bottom-4 right-4 z-[1000] glass-card bg-white/95 border border-slate-200/90 p-5 rounded-xl shadow-2xl max-w-sm backdrop-blur space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedSection.section_code}</h4>
                <span className="text-xs text-slate-500">{selectedSection.corridor?.name || "Main Corridor"}</span>
              </div>
              <button 
                onClick={() => setSelectedSection(null)}
                className="text-xs text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                &times; Close
              </button>
            </div>

            {/* Survival & RUL Metrics */}
            <div className="bg-slate-50/90 p-3 rounded-lg border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">30-Day Failure Hazard:</span>
                <span className="font-mono font-bold text-rose-600">
                  {selectedSection.survival?.risk_percentage || Math.round((selectedSection.survival?.failure_probability_30d || 0.3) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (selectedSection.survival?.failure_probability_30d || 0) >= 0.75 ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${selectedSection.survival?.risk_percentage || 30}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Estimated RUL:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {selectedSection.survival?.estimated_rul_days || 72} Days
                </span>
              </div>
            </div>

            {/* Section Physical Details */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="font-medium">{selectedSection.start_station} &rarr; {selectedSection.end_station}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Track Type:</span>
                <span className="font-mono text-emerald-700 font-semibold">{selectedSection.track_type} Line</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Length:</span>
                <span className="font-medium">{selectedSection.length_km} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Max Permissible Speed:</span>
                <span className="text-emerald-700 font-bold font-mono">{selectedSection.max_permissible_speed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Traffic Density:</span>
                <span className="font-mono font-semibold">{selectedSection.current_traffic_density} GMT</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
