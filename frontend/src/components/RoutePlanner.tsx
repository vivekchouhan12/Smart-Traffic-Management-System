
import React, { useState } from 'react';
import { Navigation, MapPin, Clock, Info, ChevronRight } from 'lucide-react';
import type { Junction, RouteInfo } from '../types';
import { geminiService } from '../services/geminiService';

interface RoutePlannerProps {
  junctions: Junction[];
  onRoutePlanned?: (route: RouteInfo) => void;
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ junctions, onRoutePlanned }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteInfo | null>(null);

  const handlePlan = async () => {
    if (!start || !end || start === end) return;
    setLoading(true);
    try {
      const route = await geminiService.planRoute(start, end, junctions);
      setResult(route);
      onRoutePlanned?.(route);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <Navigation size={20} />
        </div>
        <h3 className="font-bold text-lg text-gray-800">Public Route Planner</h3>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Starting From</label>
          <select
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select location...</option>
            {junctions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Destination</label>
          <select
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Select location...</option>
            {junctions.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <button
          onClick={handlePlan}
          disabled={loading || !start || !end}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Calculating Fastest Route...' : 'Find Fastest Route'}
        </button>
      </div>

      {result && (
        <div className="animate-fade-in animate-slide-in-bottom">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-blue-900">Recommended Route</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${result.congestionLevel === 'low' ? 'bg-green-100 text-green-700' :
                result.congestionLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                {result.congestionLevel} Congestion
              </span>
            </div>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1 text-blue-800">
                <Clock size={14} />
                <span className="text-sm font-bold">{result.eta} mins</span>
              </div>
              <div className="flex items-center gap-1 text-blue-800">
                <MapPin size={14} />
                <span className="text-sm font-bold">{result.distance} km</span>
              </div>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed mb-4">{result.summary}</p>

            <div className="space-y-2">
              {result.path.map((step, i) => {
                const junc = junctions.find(j => j.id === step);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <span className="text-xs font-medium text-gray-700">{junc?.name || step}</span>
                    {i < result.path.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Info size={14} />
            <span className="text-[10px]">Real-time predictions included in ETA calculation.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;
