import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Layers, AlertTriangle, ShieldCheck, Clock, ShieldAlert, Activity, ArrowUpRight } from 'lucide-react';
import apiClient from '../api/client';
import { Badge } from '../components/ui/Badge';

// Fix Leaflet marker icon issue in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Station Icons
const stationIcon = L.divIcon({
  className: 'custom-station-pin',
  html: `<div style="background-color: #2563eb; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

export default function CorridorMapView() {
  const [sections, setSections] = useState([]);
  const [survivalMap, setSurvivalMap] = useState({});
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMapData();
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

  // Center on central Indian Railways trunk (Jhansi / Bhopal hub)
  const mapCenter = [25.4484, 78.5685];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>GIS Corridor & Section Risk Heatmap</span>
            <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              Weibull AFT + XGBoost Telemetry
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Spatial monitoring of trunk corridors (Delhi &ndash; Agra &ndash; Kanpur &ndash; Jhansi &ndash; Bhopal &ndash; Itarsi &ndash; Nagpur) with continuous survival hazard gradients.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-800/90 border border-slate-700/60 px-4 py-2 rounded-lg text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1.5 bg-rose-500 rounded"></span>
            <span className="text-slate-300 font-medium">Critical Risk (RUL &le; 30d)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1.5 bg-amber-500 rounded"></span>
            <span className="text-slate-300 font-medium">Elevated Risk (30d &ndash; 60d)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1.5 bg-emerald-500 rounded"></span>
            <span className="text-slate-300 font-medium">Nominal Health (RUL &gt; 60d)</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[580px] relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
        >
          {/* CartoDB Dark Matter Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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
                  opacity={0.88}
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
          <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/95 border border-slate-700 p-5 rounded-xl shadow-2xl max-w-sm backdrop-blur space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <div>
                <h4 className="font-bold text-white text-sm">{selectedSection.section_code}</h4>
                <span className="text-xs text-slate-400">{selectedSection.corridor?.name || "Main Corridor"}</span>
              </div>
              <button 
                onClick={() => setSelectedSection(null)}
                className="text-xs text-slate-400 hover:text-white p-1"
              >
                &times; Close
              </button>
            </div>

            {/* Survival & RUL Metrics */}
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">30-Day Failure Hazard:</span>
                <span className="font-mono font-bold text-rose-400">
                  {selectedSection.survival?.risk_percentage || Math.round((selectedSection.survival?.failure_probability_30d || 0.3) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    (selectedSection.survival?.failure_probability_30d || 0) >= 0.75 ? 'bg-rose-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${selectedSection.survival?.risk_percentage || 30}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Estimated RUL:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedSection.survival?.estimated_rul_days || 72} Days
                </span>
              </div>
            </div>

            {/* Section Physical Details */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Route:</span>
                <span>{selectedSection.start_station} &rarr; {selectedSection.end_station}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Track Type:</span>
                <span className="font-mono text-blue-400">{selectedSection.track_type} Line</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Length:</span>
                <span>{selectedSection.length_km} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Permissible Speed:</span>
                <span className="text-emerald-400 font-bold font-mono">{selectedSection.max_permissible_speed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Traffic Density:</span>
                <span className="font-mono">{selectedSection.current_traffic_density} GMT</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
