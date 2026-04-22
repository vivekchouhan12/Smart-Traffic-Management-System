
export type CongestionLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface Junction {
  id: string;
  name: string;
  lat: number;
  lng: number;
  vehicleCount: number;
  density: number; // 0 to 100
  avgSpeed: number; // in km/h
  status: 'active' | 'warning' | 'alert';
  signalMode: 'auto' | 'manual';
  greenTime: number; // current green light duration in seconds
  queueLength: number; // in meters
  lastUpdated: string;
}

export interface TrafficIncident {
  id: string;
  junctionId: string;
  junctionName: string;
  type: 'accident' | 'breakdown' | 'heavy_congestion' | 'roadwork';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  description: string;
  resolved: boolean;
  lat?: number;
  lng?: number;
  source?: 'live' | 'ai';
}

export interface RouteInfo {
  path: string[]; // IDs of junctions
  eta: number; // in minutes
  distance: number; // in km
  congestionLevel: CongestionLevel;
  summary: string;
}

export interface TrafficDataPoint {
  time: string;
  flow: number;
  density: number;
  historicalDensity: number;
}

export interface PredictionResult {
  nextHourCount: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}
