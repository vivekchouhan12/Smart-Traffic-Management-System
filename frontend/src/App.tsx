
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import StatsPanel from './components/StatsPanel';
import IncidentList from './components/IncidentList';
import RoutePlanner from './components/RoutePlanner';
import { INITIAL_JUNCTIONS } from './constants';
import type { Junction, TrafficIncident, RouteInfo } from './types';
// Fix: Add AlertTriangle to the lucide-react imports to resolve the undefined reference
import {
  Zap,
  Clock,
  Activity,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  RefreshCcw,
  Sparkles,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [junctions, setJunctions] = useState<Junction[]>(INITIAL_JUNCTIONS);
  const [incidents, setIncidents] = useState<TrafficIncident[]>([]);
  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [mapBBox, setMapBBox] = useState<[number, number, number, number] | null>(null);
  const [liveIncidentsEnabled, setLiveIncidentsEnabled] = useState(false);

  // WebSocket connection for real-time traffic telemetry
  useEffect(() => {
    if (!isSimulating) return;

    const ws = new WebSocket('ws://localhost:8000/ws/telemetry');

    ws.onopen = () => console.log('Connected to Traffic Control Backend');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setJunctions(prev => {
            const updated = [...prev];
            data.forEach((incoming, idx) => {
              // Override existing mapped prototype junctions with live SUMO telemetry
              if (idx < updated.length) {
                updated[idx] = {
                  ...updated[idx],
                  vehicleCount: incoming.vehicleCount !== undefined ? incoming.vehicleCount : updated[idx].vehicleCount,
                  density: incoming.density !== undefined ? incoming.density : updated[idx].density,
                  avgSpeed: incoming.avgSpeed !== undefined ? incoming.avgSpeed : updated[idx].avgSpeed,
                  queueLength: incoming.queueLength !== undefined ? incoming.queueLength : updated[idx].queueLength,
                  status: incoming.status || updated[idx].status,
                  lastUpdated: new Date().toISOString()
                };
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error('Error parsing telemetry', err);
      }
    };

    ws.onerror = (err) => console.error('WebSocket Error', err);

    return () => {
      ws.close();
    };
  }, [isSimulating]);

  // AI Incident Detection loop
  useEffect(() => {
    const detectionInterval = setInterval(async () => {
      if (!isSimulating) return;
      // High density + Low speed check manually first for prompt detection
      const anomalies = junctions.filter(j => j.density > 90 && j.avgSpeed < 10);
      if (anomalies.length > 0 && Math.random() > 0.7) { // 30% chance to trigger AI verification
        const detected = await geminiService.analyzeIncidents(junctions);
        if (detected.length > 0) {
          const newIncidents: TrafficIncident[] = detected.map((d, idx) => ({
            id: `inc-${Date.now()}-${idx}`,
            junctionId: d.junctionId!,
            junctionName: junctions.find(j => j.id === d.junctionId)?.name || 'Unknown',
            type: (d.type as any) || 'heavy_congestion',
            severity: (d.severity as any) || 'medium',
            timestamp: new Date().toISOString(),
            description: d.description || 'Abnormal traffic patterns detected.',
            resolved: false
          }));

          setIncidents(prev => {
            // Avoid duplicate junctions for same incident type
            const existingIds = new Set(prev.filter(p => !p.resolved).map(p => p.junctionId + p.type));
            const unique = newIncidents.filter(n => !existingIds.has(n.junctionId + n.type));
            if (unique.length > 0) {
              triggerPushNotification(`ALERT: ${unique[0].type.toUpperCase()} detected at ${unique[0].junctionName}`);
            }
            return [...unique, ...prev].slice(0, 10);
          });
        }
      }
    }, 15000);
    return () => clearInterval(detectionInterval);
  }, [junctions, isSimulating]);

  // Live incidents fetcher (optional via env VITE_TRAFFIC_INCIDENTS_URL)
  useEffect(() => {
    let interval: any;
    if (liveIncidentsEnabled) {
      const fetchLive = async () => {
        try {
          const bbox = mapBBox ?? (() => {
            const minLat = Math.min(...junctions.map(j => j.lat));
            const maxLat = Math.max(...junctions.map(j => j.lat));
            const minLng = Math.min(...junctions.map(j => j.lng));
            const maxLng = Math.max(...junctions.map(j => j.lng));
            // pad ~1%
            const padLat = (maxLat - minLat) * 0.05;
            const padLng = (maxLng - minLng) * 0.05;
            return [minLat - padLat, minLng - padLng, maxLat + padLat, maxLng + padLng] as [number, number, number, number];
          })();
          const { fetchLiveIncidents } = await import('./services/trafficProvider');
          const lives = await fetchLiveIncidents(bbox, junctions);
          if (lives.length) {
            setIncidents(prev => {
              const existing = new Set(prev.filter(p => !p.resolved).map(p => p.id));
              const merged = [...lives.filter(l => !existing.has(l.id)), ...prev];
              return merged.slice(0, 50);
            });
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchLive();
      interval = setInterval(fetchLive, 30000);
    }
    return () => interval && clearInterval(interval);
  }, [liveIncidentsEnabled, mapBBox, junctions]);

  const triggerPushNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleFetchInsights = async () => {
    setIsAnalyzing(true);
    try {
      const insights = await geminiService.getTrafficOptimizationInsights(junctions);
      setAiInsights(insights);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResolveIncident = (id: string) => {
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolved: true } : i));
  };

  const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="glass-card p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:neon-border transition-all cursor-default">
      <div className={`${color} p-3 rounded-xl shadow-lg`}>
        <Icon className="text-white" size={24} />
      </div>
      <div>
        <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">{title}</p>
        <p className="text-3xl font-black text-white leading-none tracking-tight">{value}</p>
      </div>
    </div>
  );

  const activeIncidentCount = incidents.filter(i => !i.resolved).length;

  return (
    <div className="min-h-screen flex text-slate-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incidentCount={activeIncidentCount}
      />

      {/* Simulated Push Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-[9999] bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-700 flex items-center gap-4 animate-slide-in-top">
          <div className="bg-red-500 p-2 rounded-lg animate-pulse">
            <Bell size={20} />
          </div>
          <div>
            <p className="font-bold text-sm">Traffic Incident Alert</p>
            <p className="text-xs text-gray-400">{notification}</p>
          </div>
        </div>
      )}

      <main className="flex-1 ml-64 p-8">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-md">System Dashboard</h2>
            <p className="text-indigo-300 font-medium opacity-80 mt-1">Bhopal Integrated Traffic Management System • Unit 42</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${isSimulating ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                }`}
            >
              <RefreshCcw size={18} className={isSimulating ? 'animate-spin' : ''} />
              {isSimulating ? 'Simulation Live' : 'Resume Simulation'}
            </button>
            <button
              onClick={() => setLiveIncidentsEnabled(v => !v)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${liveIncidentsEnabled ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30' : 'glass-panel text-gray-300 hover:text-white'}`}
            >
              Live Incidents: {liveIncidentsEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={handleFetchInsights}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/50 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50"
            >
              {isAnalyzing ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
              AI Optimization
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
              <SummaryCard title="Avg Flow Rate" value="3,142 v/h" icon={Activity} color="bg-green-600" />
              <SummaryCard title="Active Incidents" value={activeIncidentCount} icon={AlertTriangle} color={activeIncidentCount > 0 ? 'bg-red-500' : 'bg-gray-400'} />
              <SummaryCard title="Avg Delay Time" value="1.8m" icon={Clock} color="bg-blue-500" />
              <SummaryCard title="Detection Health" value="98.2%" icon={ShieldCheck} color="bg-indigo-600" />
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="h-[550px]">
                <MapView junctions={junctions} onJunctionSelect={setSelectedJunction} route={routeInfo} incidents={incidents} onBoundsChange={setMapBBox} />
              </div>

              {aiInsights && (
                <div className="glass-panel border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_20px_rgba(99,102,241,0.15)] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6 text-indigo-400">
                      <div className="bg-indigo-500/20 p-2 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <Sparkles size={24} />
                      </div>
                      <h3 className="font-black text-xl tracking-wide text-white">AI Traffic Intelligence</h3>
                    </div>
                    <p className="text-indigo-100 text-lg mb-8 leading-relaxed font-medium">{aiInsights.summary}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {aiInsights.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="glass-card p-5 rounded-2xl hover:neon-border transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-black text-white">{rec.junctionName}</span>
                            <span className="bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded shadow-[0_0_10px_rgba(99,102,241,0.2)]">Action Required</span>
                          </div>
                          <p className="text-sm font-bold text-indigo-200 mb-2 leading-relaxed">{rec.action}</p>
                          <p className="text-xs text-gray-400 italic">{rec.reasoning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
              {selectedJunction ? (
                <div className="glass-panel p-8 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-slide-in-right">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black text-white tracking-wide">{selectedJunction.name}</h3>
                    <button onClick={() => setSelectedJunction(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                      <RefreshCcw size={20} />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-gray-900/50 rounded-2xl border border-gray-700/50 hover:neon-border transition-colors">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vehicle Density</p>
                        <p className="text-3xl tracking-tight font-black text-white">{selectedJunction.density}%</p>
                      </div>
                      <div className="p-5 bg-gray-900/50 rounded-2xl border border-gray-700/50 hover:neon-border transition-colors">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Speed</p>
                        <p className="text-3xl tracking-tight font-black text-white">{selectedJunction.avgSpeed} <span className="text-base text-gray-500">km/h</span></p>
                      </div>
                    </div>

                    <div className="p-6 bg-indigo-900 text-white rounded-2xl shadow-xl">
                      <h4 className="text-xs font-black uppercase tracking-widest opacity-60 mb-4">Adaptive Signal Logic</h4>
                      <div className="flex items-center justify-between mb-2 font-black text-lg">
                        <span>{selectedJunction.greenTime}s Green</span>
                        <Zap size={20} className="text-yellow-400" />
                      </div>
                      <div className="h-1.5 w-full bg-indigo-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400" style={{ width: '60%' }}></div>
                      </div>
                      <p className="text-[10px] opacity-60 mt-4 leading-relaxed font-medium">Model currently optimizing for morning peak-hour flow toward Habibganj.</p>

                      <div className="mt-6 flex gap-3">
                        <button
                          onClick={async () => {
                            try {
                              await fetch('http://localhost:8000/api/override', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ junction_id: selectedJunction.id, action: 'FORCE_GREEN' })
                              });
                              triggerPushNotification(`Force Green applied to ${selectedJunction.name}`);
                            } catch (e) {
                              triggerPushNotification('Failed to connect to backend.');
                            }
                          }}
                          className="flex-1 bg-green-500 hover:bg-green-400 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-green-900/50"
                        >
                          Force Green
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await fetch('http://localhost:8000/api/override', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ junction_id: selectedJunction.id, action: 'FORCE_RED' })
                              });
                              triggerPushNotification(`Force Red applied to ${selectedJunction.name}`);
                            } catch (e) {
                              triggerPushNotification('Failed to connect to backend.');
                            }
                          }}
                          className="flex-1 bg-red-500 hover:bg-red-400 text-white text-xs font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-red-900/50"
                        >
                          Force Red
                        </button>
                      </div>
                    </div>

                    <button className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-95 shadow-lg">
                      <ExternalLink size={18} />
                      Live Feed (Camera 04)
                    </button>
                  </div>
                </div>
              ) : (
                <RoutePlanner junctions={junctions} onRoutePlanned={setRouteInfo} />
              )}
              <StatsPanel selectedJunction={selectedJunction} allJunctions={junctions} />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="h-[calc(100vh-180px)] rounded-3xl overflow-hidden shadow-2xl">
            <MapView junctions={junctions} onJunctionSelect={setSelectedJunction} route={routeInfo} incidents={incidents} onBoundsChange={setMapBBox} />
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-3xl font-black text-gray-900">Incident Control Room</h3>
              <div className="flex gap-2">
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{activeIncidentCount} Active</span>
              </div>
            </div>
            <IncidentList incidents={incidents} onResolve={handleResolveIncident} />
          </div>
        )}

        {activeTab === 'planner' && (
          <div className="max-w-2xl mx-auto">
            <RoutePlanner junctions={junctions} onRoutePlanned={setRouteInfo} />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <StatsPanel selectedJunction={null} allJunctions={junctions} />
              <div className="glass-panel p-8 rounded-3xl">
                <h3 className="text-xl font-black text-white tracking-wide mb-8">City-wide Performance</h3>
                <div className="space-y-6">
                  {[...junctions].sort((a, b) => b.density - a.density).map((j, i) => (
                    <div key={j.id} className="group flex items-center gap-6 p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-gray-700/50">
                      <div className="w-10 h-10 flex items-center justify-center bg-gray-800 text-white rounded-xl font-black text-lg transition-transform group-hover:scale-110 shadow-[0_0_15px_rgba(0,0,0,0.5)]">{i + 1}</div>
                      <div className="flex-1">
                        <div className="font-bold text-white tracking-wide">{j.name}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-1.5 flex-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${j.density > 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : j.density > 50 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]' : 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]'}`}
                              style={{ width: `${j.density}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-black text-gray-400 w-8">{j.density}%</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-500 group-hover:text-white transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
