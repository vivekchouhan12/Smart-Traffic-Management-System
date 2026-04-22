
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import type { Junction } from '../types';

interface StatsPanelProps {
  selectedJunction: Junction | null;
  allJunctions: Junction[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ selectedJunction, allJunctions }) => {
  // Enhanced time-series data with historical overlays
  const timeData = [
    { time: '08:00', live: 30, typical: 45 },
    { time: '09:00', live: 65, typical: 75 },
    { time: '10:00', live: 55, typical: 60 },
    { time: '11:00', live: 45, typical: 40 },
    { time: '12:00', live: 50, typical: 42 },
    { time: '13:00', live: 70, typical: 68 },
    { time: '14:00', live: 60, typical: 55 },
  ];

  const junctionComparisonData = allJunctions.map(j => ({
    name: j.name.split(' ')[0],
    density: j.density,
    color: j.status === 'alert' ? '#ef4444' : j.status === 'warning' ? '#f97316' : '#22c55e'
  }));

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
          <div>
            <h3 className="font-bold text-white tracking-wide">Traffic Density Analytics</h3>
            <p className="text-xs text-indigo-300 font-semibold opacity-80">
              {selectedJunction ? `Selected: ${selectedJunction.name}` : 'City-wide overview'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-900/50 px-3 py-1 rounded-full border border-gray-700/50">Live vs Historical</span>
        </div>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeData}>
              <defs>
                <linearGradient id="colorLive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)', color: '#f8fafc' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }} />
              <Area
                name="Current Live"
                type="monotone"
                dataKey="live"
                stroke="#22c55e"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorLive)"
              />
              <Area
                name="Historical Average"
                type="monotone"
                dataKey="typical"
                stroke="#cbd5e1"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-white tracking-wide mb-4">Congestion Heatmap</h3>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={junctionComparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} width={80} />
              <Tooltip cursor={{ fill: 'rgba(30, 41, 59, 0.5)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '8px', border: '1px solid #334155', color: '#f8fafc' }} />
              <Bar dataKey="density" radius={[0, 6, 6, 0]} barSize={16}>
                {junctionComparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
