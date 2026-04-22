
import React from 'react';
import { AlertCircle, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import type { TrafficIncident } from '../types';

interface IncidentListProps {
  incidents: TrafficIncident[];
  onResolve: (id: string) => void;
}

const IncidentList: React.FC<IncidentListProps> = ({ incidents, onResolve }) => {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-100 text-red-900';
      case 'medium': return 'bg-orange-50 border-orange-100 text-orange-900';
      default: return 'bg-blue-50 border-blue-100 text-blue-900';
    }
  };

  const activeIncidents = incidents.filter(i => !i.resolved);

  return (
    <div className="space-y-4">
      {activeIncidents.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
          <div className="bg-green-50 text-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} />
          </div>
          <h3 className="font-bold text-gray-800 mb-1">No Active Incidents</h3>
          <p className="text-gray-500 text-sm">Bhopal traffic is flowing smoothly under AI supervision.</p>
        </div>
      ) : (
        activeIncidents.map((incident) => (
          <div
            key={incident.id}
            className={`border rounded-2xl p-5 flex flex-col gap-4 shadow-sm animate-fade-in animate-slide-in-left ${getSeverityStyles(incident.severity)}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${incident.severity === 'high' ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'}`}>
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h4 className="font-bold uppercase text-xs tracking-wider mb-0.5">{incident.type.replace('_', ' ')}</h4>
                  <p className="font-bold text-lg">{incident.junctionName}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${incident.severity === 'high' ? 'border-red-300 bg-red-100' : 'border-orange-300 bg-orange-100'}`}>
                {incident.severity} {incident.source === 'live' ? '• Live' : 'priority'}
              </span>
            </div>

            <p className="text-sm opacity-80 leading-relaxed">{incident.description}</p>

            <div className="flex items-center justify-between border-t border-current/10 pt-4 mt-2">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 opacity-60 text-xs">
                  <Clock size={14} />
                  <span>{new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-1.5 opacity-60 text-xs">
                  <MapPin size={14} />
                  <span>View on Map</span>
                </div>
              </div>
              <button
                onClick={() => onResolve(incident.id)}
                className="bg-white/80 hover:bg-white text-gray-900 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default IncidentList;
