import type { Junction, TrafficIncident } from "../types";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function nearestJunction(lat: number, lng: number, junctions: Junction[]) {
  let best: Junction | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const j of junctions) {
    const d = haversineDistance(lat, lng, j.lat, j.lng);
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}

function mapSeverity(value: any): 'low' | 'medium' | 'high' {
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    if (v.includes('high') || v === 'critical' || v === 'severe') return 'high';
    if (v.includes('medium') || v === 'moderate') return 'medium';
    return 'low';
  }
  if (typeof value === 'number') {
    if (value >= 3) return 'high';
    if (value >= 2) return 'medium';
    return 'low';
  }
  return 'medium';
}

function mapType(value: any): TrafficIncident['type'] {
  const s = String(value || '').toLowerCase();
  if (s.includes('accident') || s.includes('crash') || s.includes('collision')) return 'accident';
  if (s.includes('breakdown') || s.includes('stalled')) return 'breakdown';
  if (s.includes('roadwork') || s.includes('construction') || s.includes('closure')) return 'roadwork';
  return 'heavy_congestion';
}

function templateUrl(url: string, bbox: [number, number, number, number]) {
  const [minLat, minLng, maxLat, maxLng] = bbox;
  return url
    .replace('{minLat}', String(minLat))
    .replace('{minLng}', String(minLng))
    .replace('{maxLat}', String(maxLat))
    .replace('{maxLng}', String(maxLng))
    .replace('{bbox}', `${minLat},${minLng},${maxLat},${maxLng}`);
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Incidents fetch failed: ${res.status}`);
  return res.json();
}

function normalizeIncidents(data: any): Array<{ id: string; lat: number; lng: number; type: string; severity: any; description: string; time?: string; }> {
  const out: Array<{ id: string; lat: number; lng: number; type: string; severity: any; description: string; time?: string; }> = [];

  // GeoJSON FeatureCollection
  if (data && Array.isArray(data.features)) {
    for (const f of data.features) {
      const id = String(f.id ?? f.properties?.id ?? Math.random().toString(36).slice(2));
      const coords = f.geometry?.coordinates;
      // Point [lng, lat]
      let lat: number | null = null, lng: number | null = null;
      if (Array.isArray(coords) && coords.length >= 2) {
        // handle nested for MultiPoint/LineString first point
        if (typeof coords[0] === 'number') {
          lng = coords[0];
          lat = coords[1];
        } else if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
          lng = coords[0][0];
          lat = coords[0][1];
        }
      }
      if (lat == null || lng == null) continue;
      out.push({
        id,
        lat,
        lng,
        type: f.properties?.type ?? f.properties?.category ?? 'incident',
        severity: f.properties?.severity ?? f.properties?.priority ?? 'medium',
        description: f.properties?.description ?? f.properties?.title ?? 'Traffic incident',
        time: f.properties?.startTime ?? f.properties?.timestamp
      });
    }
    return out;
  }

  // TomTom-like
  if (data && data.trafficIncidents && Array.isArray(data.trafficIncidents.incidents)) {
    for (const it of data.trafficIncidents.incidents) {
      const id = String(it.id ?? Math.random().toString(36).slice(2));
      // TomTom point may be { coordinates: "lat,lon" } or object with lat, lon
      let lat: number | null = null, lng: number | null = null;
      if (it.point) {
        if (typeof it.point.coordinates === 'string') {
          const parts = it.point.coordinates.split(',');
          if (parts.length >= 2) { lat = parseFloat(parts[0]); lng = parseFloat(parts[1]); }
        } else if (Array.isArray(it.point.coordinates)) {
          const arr = it.point.coordinates; // [lat, lon]
          if (arr.length >= 2) { lat = Number(arr[0]); lng = Number(arr[1]); }
        } else if (typeof it.point.lat === 'number' && typeof it.point.lon === 'number') {
          lat = it.point.lat; lng = it.point.lon;
        }
      }
      if (lat == null || lng == null) continue;
      out.push({
        id,
        lat,
        lng,
        type: it.type ?? it.iconCategory ?? 'incident',
        severity: it.severity ?? it.magnitudeOfDelay ?? 'medium',
        description: it.description ?? it.shortDesc ?? 'Traffic incident',
        time: it.startTime ?? it.lastReportTime
      });
    }
    return out;
  }

  // HERE-like minimal support
  if (data && data.TRAFFIC_ITEMS && Array.isArray(data.TRAFFIC_ITEMS.TRAFFIC_ITEM)) {
    for (const it of data.TRAFFIC_ITEMS.TRAFFIC_ITEM) {
      const id = String(it.TRAFFIC_ITEM_ID?.[0]?.ID ?? Math.random().toString(36).slice(2));
      let lat: number | null = null, lng: number | null = null;
      const loc = it.LOCATION?.GEOLOC?.ORIGIN?.DISPLAY_POINT?.COORDINATES?.[0];
      if (loc && loc.LATITUDE && loc.LONGITUDE) { lat = Number(loc.LATITUDE[0]); lng = Number(loc.LONGITUDE[0]); }
      if (lat == null || lng == null) continue;
      out.push({
        id,
        lat, lng,
        type: it.TRAFFIC_ITEM_TYPE_DESC?.[0] ?? 'incident',
        severity: it.COMMUTE?.TRAFFIC_ITEM_COMMUTE_DETAIL?.[0]?.TRAFFIC_ITEM_DELAY_VALUE ?? 'medium',
        description: it.TRAFFIC_ITEM_DESCRIPTION?.[0]?.value ?? 'Traffic incident',
        time: it.START_TIME
      });
    }
    return out;
  }

  return out;
}

export async function fetchLiveIncidents(bbox: [number, number, number, number], junctions: Junction[]): Promise<TrafficIncident[]> {
  const urlTmpl = (import.meta as any).env?.VITE_TRAFFIC_INCIDENTS_URL as string | undefined;
  if (!urlTmpl) return [];
  try {
    const url = templateUrl(urlTmpl, bbox);
    const data = await fetchJson(url);
    const items = normalizeIncidents(data);
    const now = new Date();
    return items.map(it => {
      const near = nearestJunction(it.lat, it.lng, junctions);
      return {
        id: `live-${it.id}`,
        junctionId: near?.id ?? 'unknown',
        junctionName: near?.name ?? 'Near location',
        type: mapType(it.type) as TrafficIncident['type'],
        severity: mapSeverity(it.severity),
        timestamp: (it.time ? new Date(it.time) : now).toISOString(),
        description: it.description,
        resolved: false,
        lat: it.lat,
        lng: it.lng,
        source: 'live'
      };
    });
  } catch (e) {
    console.error(e);
    return [];
  }
}
