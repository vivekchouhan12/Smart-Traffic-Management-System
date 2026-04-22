
import React from 'react';
import {
  LayoutDashboard,
  Map as MapIcon,
  BarChart3,
  Settings,
  AlertTriangle,
  TrafficCone,
  Navigation
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  incidentCount?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, incidentCount = 0 }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Control Center' },
    { id: 'map', icon: MapIcon, label: 'City Map' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'incidents', icon: AlertTriangle, label: 'Incidents', badge: incidentCount },
    { id: 'planner', icon: Navigation, label: 'Route Planner' },
    { id: 'settings', icon: Settings, label: 'System Config' },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-gray-800/50 flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-green-500/20 border border-green-500/30 p-2 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.2)]">
          <TrafficCone className="text-green-400" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white leading-none tracking-wide">Bhopal STMS</h1>
          <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest opacity-80">Smart Traffic</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative font-medium tracking-wide ${activeTab === item.id
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
          >
            <item.icon size={20} className={activeTab === item.id ? 'text-indigo-400' : 'text-gray-500'} />
            <span>{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="absolute right-4 bg-red-500/80 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-800/50">
        <div className="bg-indigo-900/30 border border-indigo-500/20 rounded-xl p-4">
          <p className="text-[10px] font-black tracking-widest text-indigo-400 uppercase mb-1">Live Status</p>
          <p className="text-xs text-indigo-200 font-medium">System operational. 24.1k sensors active.</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
