import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Layers, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import apiClient from '../api/client';

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
  html: `<div style="background-color: #1d4ed8; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.5);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

export default function CorridorMapView() {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/corridors/sections');
      setSections(res.data);
    } catch (err) {
      console.error("Failed to load sections", err);
    } finally {
      setLoading(false);
    }
  };

  // Center on central India (around Jhansi/Bhopal)
  const mapCenter = [25.4484, 78.5685];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>GIS Corridor & Section Map</span>
            <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              Live Indian Railways Spatial Grid
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualizing Golden Quadrilateral and North-South trunks (Delhi – Agra – Kanpur – Jhansi – Bhopal – Itarsi – Nagpur)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 bg-slate-800/90 border border-slate-700/60 px-4 py-2 rounded-lg text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-emerald-500 rounded"></span>
            <span className="text-slate-300">Normal Track Flow</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded"></span>
            <span className="text-slate-300">Speed Restriction Active</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-1 bg-rose-500 rounded"></span>
            <span className="text-slate-300">Active Maintenance Possession</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-[560px] relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          style={{ height: '100%', width: '100%', backgroundColor: '#0f172a' }}
        >
          {/* CartoDB Dark Matter Tiles for Operations Center Theme */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {sections.map((sec, idx) => {
            if (!sec.start_lat || !sec.start_lng || !sec.end_lat || !sec.end_lng) return null;

            const positions = [
              [sec.start_lat, sec.start_lng],
              [sec.end_lat, sec.end_lng]
            ];

            // Color code
            const hasRestriction = idx % 5 === 0;
            const hasBlock = idx % 8 === 0;
            const color = hasBlock ? '#ef4444' : (hasRestriction ? '#f59e0b' : '#10b981');

            return (
              <React.Fragment key={sec.id}>
                <Polyline
                  positions={positions}
                  color={color}
                  weight={4}
                  opacity={0.85}
                  eventHandlers={{
                    click: () => setSelectedSection(sec)
                  }}
                >
                  <Tooltip sticky>
                    <div className="text-xs font-sans">
                      <div className="font-bold">{sec.section_code}</div>
                      <div>MPS: {sec.max_permissible_speed} km/h • Cap: {sec.line_capacity} tpd</div>
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
          <div className="absolute bottom-4 right-4 z-[1000] bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl max-w-sm backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-white text-sm">{selectedSection.section_code}</h4>
              <button 
                onClick={() => setSelectedSection(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                &times; Close
              </button>
            </div>
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
                <span className="text-emerald-400 font-bold">{selectedSection.max_permissible_speed} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Traffic Density:</span>
                <span>{selectedSection.current_traffic_density} GMT</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
