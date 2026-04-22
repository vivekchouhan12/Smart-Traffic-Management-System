
import type { Junction } from './types';

export const BHOPAL_CENTER: [number, number] = [23.2599, 77.4126];

export const INITIAL_JUNCTIONS: Junction[] = [
  {
    id: 'db-mall',
    name: 'DB Mall Square',
    lat: 23.2333,
    lng: 77.4272,
    vehicleCount: 120,
    density: 45,
    avgSpeed: 35,
    status: 'active',
    signalMode: 'auto',
    greenTime: 45,
    queueLength: 150,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'vallabh-bhawan',
    name: 'Vallabh Bhawan',
    lat: 23.2483,
    lng: 77.4225,
    vehicleCount: 85,
    density: 30,
    avgSpeed: 45,
    status: 'active',
    signalMode: 'auto',
    greenTime: 30,
    queueLength: 80,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rani-kamalapati',
    name: 'Rani Kamlapati Station',
    lat: 23.2163,
    lng: 77.4388,
    vehicleCount: 210,
    density: 85,
    avgSpeed: 15,
    status: 'alert',
    signalMode: 'auto',
    greenTime: 60,
    queueLength: 450,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'jehangirabad',
    name: 'Jehangirabad Square',
    lat: 23.2450,
    lng: 77.4110,
    vehicleCount: 150,
    density: 65,
    avgSpeed: 25,
    status: 'warning',
    signalMode: 'auto',
    greenTime: 50,
    queueLength: 300,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'karond-chauraha',
    name: 'Karond Chauraha',
    lat: 23.2980,
    lng: 77.4080,
    vehicleCount: 180,
    density: 75,
    avgSpeed: 20,
    status: 'warning',
    signalMode: 'auto',
    greenTime: 55,
    queueLength: 380,
    lastUpdated: new Date().toISOString(),
  }
];

export const APP_THEME = {
  primary: 'rgb(22, 163, 74)', // Green-600
  secondary: 'rgb(249, 115, 22)', // Orange-500
  accent: 'rgb(59, 130, 246)', // Blue-500
};
