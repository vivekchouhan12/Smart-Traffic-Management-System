
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Junction, RouteInfo, TrafficIncident } from '../types';
import { BHOPAL_CENTER } from '../constants';

// Fix Leaflet marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  junctions: Junction[];
  onJunctionSelect: (junction: Junction) => void;
  route?: RouteInfo | null;
  incidents?: TrafficIncident[];
  onBoundsChange?: (bbox: [number, number, number, number]) => void;
}

const ZoomToBhopal = () => {
  const map = useMap();
  useEffect(() => {
    map.setView(BHOPAL_CENTER, 13);
  }, [map]);
  return null;
};

const BoundsReporter: React.FC<{ onBoundsChange?: (bbox: [number, number, number, number]) => void }> = ({ onBoundsChange }) => {
  const map = useMap();
  useEffect(() => {
    const handler = () => {
      if (!onBoundsChange) return;
      const b = map.getBounds();
      const bbox: [number, number, number, number] = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()];
      onBoundsChange(bbox);
    };
    // Report once after mount without causing loops
    handler();
    map.on('moveend', handler);
    return () => { map.off('moveend', handler); };
  }, [map, onBoundsChange]);
  return null;
};

const MapView: React.FC<MapViewProps> = ({ junctions, onJunctionSelect, route, incidents, onBoundsChange }) => {
  const [showTrafficTiles, setShowTrafficTiles] = useState(true);
  const trafficTileUrl = (import.meta as any).env?.VITE_TRAFFIC_TILE_URL as string | undefined;
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'alert': return '#ef4444'; // Red
      case 'warning': return '#f97316'; // Orange
      default: return '#22c55e'; // Green
    }
  };

  const routeLatLngs = (() => {
    if (!route || !route.path || route.path.length < 2) return null;
    const getCoord = (id: string) => {
      const j = junctions.find(j => j.id === id);
      return j ? [j.lat, j.lng] as [number, number] : null;
    };
    const coords = route.path.map(getCoord).filter(Boolean) as Array<[number, number]>;
    return coords.length >= 2 ? coords : null;
  })();


  return (
    <div className="h-full w-full rounded-2xl overflow-hidden glass-panel border border-indigo-500/20 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
      <MapContainer center={BHOPAL_CENTER} zoom={13} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {trafficTileUrl && showTrafficTiles && (
          <TileLayer
            url={trafficTileUrl}
            opacity={0.6}
          />
        )}
        <ZoomToBhopal />
        <BoundsReporter onBoundsChange={onBoundsChange} />
        {junctions.map((junction) => (
          <React.Fragment key={junction.id}>
            <Marker
              position={[junction.lat, junction.lng]}
              eventHandlers={{
                click: () => onJunctionSelect(junction),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <h3 className="font-black text-gray-900 drop-shadow-sm">{junction.name}</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2">Real-time Metrics</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-100 p-2 rounded-lg border border-gray-200 shadow-inner">
                      <div className="text-[9px] uppercase font-bold text-gray-400">Flow</div>
                      <div className="font-black text-gray-800">{junction.vehicleCount} <span className="font-medium text-xs text-gray-500">v/h</span></div>
                    </div>
                    <div className="bg-gray-100 p-2 rounded-lg border border-gray-200 shadow-inner">
                      <div className="text-[9px] uppercase font-bold text-gray-400">Density</div>
                      <div className="font-black text-gray-800">{junction.density}%</div>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[junction.lat, junction.lng]}
              radius={junction.density * 5}
              pathOptions={{
                fillColor: getStatusColor(junction.status),
                color: getStatusColor(junction.status),
                fillOpacity: 0.2
              }}
            />
          </React.Fragment>
        ))}
        {routeLatLngs && (
          <Polyline
            positions={routeLatLngs}
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }}
          />
        )}
        {incidents && incidents.filter(i => !i.resolved && typeof i.lat === 'number' && typeof i.lng === 'number').map(inc => (
          <Marker key={inc.id} position={[inc.lat as number, inc.lng as number]}>
            <Popup>
              <div className="p-1">
                <div className="text-xs font-bold">{inc.type.replace('_', ' ')}</div>
                <div className="text-[10px] text-gray-500">{inc.severity} • {new Date(inc.timestamp).toLocaleString()}</div>
                <p className="text-xs mt-1 max-w-[220px]">{inc.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute bottom-4 right-4 z-[1000] glass-card p-4 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-indigo-500/20 flex flex-col gap-3 text-xs font-bold text-indigo-100">

        {trafficTileUrl ? (
          <button
            onClick={() => setShowTrafficTiles(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${showTrafficTiles ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)] border border-indigo-400' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}
          >
            {showTrafficTiles ? 'Real Traffic: ON' : 'Real Traffic: OFF'}
          </button>
        ) : (
          <div className="text-[10px] text-indigo-400/50 uppercase tracking-widest mb-1">Live Map Legend</div>
        )}
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span> <span className="tracking-wide">Smooth Flow</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span> <span className="tracking-wide">Moderate Traffic</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span> <span className="tracking-wide">High Density</span>
        </div>
        {routeLatLngs && (
          <div className="flex items-center gap-3 mt-1 pt-2 border-t border-indigo-500/20">
            <span className="w-4 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span> <span className="tracking-wide">Active Route</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
