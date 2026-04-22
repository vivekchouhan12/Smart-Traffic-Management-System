
import type { Junction, TrafficIncident, RouteInfo } from "../types";

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

class HeuristicTrafficService {
  // Local heuristic: identify anomalies without external AI
  async analyzeIncidents(junctions: Junction[]): Promise<Partial<TrafficIncident>[]> {
    const incidents: Partial<TrafficIncident>[] = [];
    for (const j of junctions) {
      if (j.density > 90 && j.avgSpeed < 10) {
        incidents.push({
          junctionId: j.id,
          type: 'heavy_congestion',
          severity: j.density > 95 || j.avgSpeed < 6 ? 'high' : 'medium',
          description: `High density (${j.density}%) with low speed (${j.avgSpeed} km/h) indicates severe congestion.`
        });
      } else if (j.status === 'alert' && j.queueLength > 400) {
        incidents.push({
          junctionId: j.id,
          type: 'roadwork',
          severity: 'medium',
          description: 'Extended queues detected. Possible roadwork or blockage.'
        });
      }
    }
    return incidents.slice(0, 3);
  }

  // Local heuristic: optimization insights and signal adjustments
  async getTrafficOptimizationInsights(junctions: Junction[]) {
    const sorted = [...junctions].sort((a, b) => b.density - a.density);
    const top = sorted.slice(0, 3);
    const recommendations = top.map(j => ({
      junctionName: j.name,
      action: j.density > 80 ? 'Increase green time' : 'Maintain current cycle',
      reasoning: j.density > 80
        ? 'High density and queue length suggest prioritizing outgoing flow.'
        : 'Traffic is within acceptable range; avoid unnecessary changes.',
      suggestedGreenTime: Math.min(90, Math.max(30, Math.round(j.greenTime * (j.density > 80 ? 1.2 : 1.0))))
    }));
    const priorityAlerts = junctions.filter(j => j.status === 'alert').map(j => j.name);
    const avgDensity = Math.round(junctions.reduce((s, j) => s + j.density, 0) / junctions.length);
    return {
      summary: `City-wide average density is ${avgDensity}%. ${priorityAlerts.length} priority alert(s) active.`,
      recommendations,
      priorityAlerts
    };
  }

  // Local heuristic: simple route between start and end
  async planRoute(startId: string, endId: string, junctions: Junction[]): Promise<RouteInfo> {
    // Validate endpoints
    const start = junctions.find(j => j.id === startId);
    const end = junctions.find(j => j.id === endId);
    if (!start || !end || junctions.length < 2) {
      return {
        path: [startId, endId],
        eta: 15,
        distance: 5,
        congestionLevel: 'moderate',
        summary: 'Fallback route due to missing junction data.'
      };
    }

    // Build a sparse nearest-neighbor graph to avoid unrealistic hops
    const kNeighbors = Math.min(3, Math.max(1, Math.floor(junctions.length / 2))); // up to 3 nearest
    const indexById = new Map<string, number>();
    junctions.forEach((j, idx) => indexById.set(j.id, idx));

    // Precompute adjacency: for each node, connect to its k nearest by distance
    const adjacency: Array<Array<{ to: number; timeMin: number; distKm: number }>> = junctions.map(() => []);
    for (let i = 0; i < junctions.length; i++) {
      const a = junctions[i];
      const distances = junctions
        .map((b, jIdx) => ({ jIdx, d: i === jIdx ? Number.POSITIVE_INFINITY : haversineDistance(a.lat, a.lng, b.lat, b.lng) }))
        .sort((x, y) => x.d - y.d)
        .slice(0, kNeighbors);

      for (const { jIdx, d } of distances) {
        const b = junctions[jIdx];
        const baseSpeedKmH = Math.max(10, (a.avgSpeed + b.avgSpeed) / 2); // prevent too-slow anomalies
        const density = Math.max(a.density, b.density);
        const statusPenalty = Math.max(
          0,
          (a.status === 'alert' ? 0.3 : a.status === 'warning' ? 0.15 : 0) +
          (b.status === 'alert' ? 0.3 : b.status === 'warning' ? 0.15 : 0)
        );
        // Congestion inflates time; status adds extra penalty
        const congestionFactor = 1 + density / 120 + statusPenalty;
        const timeMin = (d / baseSpeedKmH) * 60 * congestionFactor;
        adjacency[i].push({ to: jIdx, timeMin, distKm: d });
      }
    }

    // Dijkstra shortest-time path
    const startIdx = indexById.get(startId)!;
    const endIdx = indexById.get(endId)!;
    const dist: number[] = Array(junctions.length).fill(Number.POSITIVE_INFINITY);
    const prev: Array<number | null> = Array(junctions.length).fill(null);
    dist[startIdx] = 0;
    const visited: boolean[] = Array(junctions.length).fill(false);

    for (let iter = 0; iter < junctions.length; iter++) {
      // pick unvisited with smallest dist
      let u = -1;
      let best = Number.POSITIVE_INFINITY;
      for (let i = 0; i < junctions.length; i++) {
        if (!visited[i] && dist[i] < best) {
          best = dist[i];
          u = i;
        }
      }
      if (u === -1) break;
      visited[u] = true;
      if (u === endIdx) break;

      for (const edge of adjacency[u]) {
        if (visited[edge.to]) continue;
        const alt = dist[u] + edge.timeMin;
        if (alt < dist[edge.to]) {
          dist[edge.to] = alt;
          prev[edge.to] = u;
        }
      }
    }

    // Reconstruct path
    const pathIdxs: number[] = [];
    let cur: number | null = endIdx;
    while (cur !== null) {
      pathIdxs.unshift(cur);
      cur = prev[cur];
    }
    if (pathIdxs[0] !== startIdx) {
      // No path found in sparse graph; fall back to direct estimate
      const directKm = haversineDistance(start.lat, start.lng, end.lat, end.lng);
      const avgSpeed = Math.max(10, (start.avgSpeed + end.avgSpeed) / 2);
      const etaMinutes = Math.round((directKm / avgSpeed) * 60 * (1 + Math.max(start.density, end.density) / 120));
      const d = Math.max(start.density, end.density);
      const congestionLevel = d < 40 ? 'low' : d < 70 ? 'moderate' : d < 90 ? 'high' : 'critical';
      return {
        path: [start.id, end.id],
        eta: etaMinutes,
        distance: Math.round(directKm * 10) / 10,
        congestionLevel,
        summary: 'Direct route estimate used due to sparse connectivity.'
      };
    }

    // Compute total distance and congestion along path
    let totalKm = 0;
    let maxDensity = 0;
    let totalTimeMin = 0;
    for (let i = 0; i < pathIdxs.length - 1; i++) {
      const a = junctions[pathIdxs[i]];
      const b = junctions[pathIdxs[i + 1]];
      const segKm = haversineDistance(a.lat, a.lng, b.lat, b.lng);
      totalKm += segKm;
      maxDensity = Math.max(maxDensity, a.density, b.density);
      // Recompute segment time using same heuristic to prevent drift
      const baseSpeedKmH = Math.max(10, (a.avgSpeed + b.avgSpeed) / 2);
      const statusPenalty = Math.max(
        0,
        (a.status === 'alert' ? 0.3 : a.status === 'warning' ? 0.15 : 0) +
        (b.status === 'alert' ? 0.3 : b.status === 'warning' ? 0.15 : 0)
      );
      const congestionFactor = 1 + Math.max(a.density, b.density) / 120 + statusPenalty;
      totalTimeMin += (segKm / baseSpeedKmH) * 60 * congestionFactor;
    }

    const pathIds = pathIdxs.map(i => junctions[i].id);
    const congestionLevel = maxDensity < 40 ? 'low' : maxDensity < 70 ? 'moderate' : maxDensity < 90 ? 'high' : 'critical';
    const roundedKm = Math.round(totalKm * 10) / 10;
    const roundedMin = Math.round(totalTimeMin);

    return {
      path: pathIds,
      eta: roundedMin,
      distance: roundedKm,
      congestionLevel,
      summary: `Fastest route found over ${pathIds.length - 1} segment(s): ~${roundedKm} km, ${roundedMin} mins considering live congestion.`
    };
  }
}

export const geminiService = new HeuristicTrafficService();
