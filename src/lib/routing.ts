import type { StationFeature, FuelType, RouteStation } from "@/types";
import {
  getStationPrice,
  precomputeCumulativeDistances,
  pointProgressAlongPolyline,
} from "@/lib/helpers";

export interface OSRMRoute {
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  distance: number;
  duration: number;
}

/**
 * Calculate route using Google Maps Directions API (via JS SDK).
 * Falls back to OSRM if Google Directions fails.
 */
export async function calculateRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OSRMRoute> {
  // Try Google Directions first (if Maps API is loaded)
  if (typeof google !== "undefined" && google.maps?.DirectionsService) {
    try {
      return await calculateRouteGoogle(from, to);
    } catch {
      // Fall through to OSRM
    }
  }

  return calculateRouteOSRM(from, to);
}

async function calculateRouteGoogle(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OSRMRoute> {
  const service = new google.maps.DirectionsService();
  const result = await service.route({
    origin: from,
    destination: to,
    travelMode: google.maps.TravelMode.DRIVING,
    region: "ca",
    provideRouteAlternatives: false,
  });

  if (!result.routes || result.routes.length === 0) {
    throw new Error("Aucun trajet trouvé");
  }

  const route = result.routes[0];
  const leg = route.legs![0];

  // Convert Google's encoded path to GeoJSON-style coordinates
  const path = route.overview_path!;
  const coordinates: [number, number][] = path.map((p) => [p.lng(), p.lat()]);

  return {
    geometry: { type: "LineString", coordinates },
    distance: leg.distance!.value, // meters
    duration: leg.duration!.value, // seconds
  };
}

async function calculateRouteOSRM(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OSRMRoute> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Erreur de calcul de trajet");
  const data = await resp.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("Aucun trajet trouvé");
  }

  return data.routes[0] as OSRMRoute;
}

/**
 * Find stations along a route.
 * Improved: uses ALL stations near the route (not just cheapest 10% province-wide),
 * then picks the best per segment.
 */
export function findStationsAlongRoute(
  routeCoords: [number, number][],
  stations: StationFeature[],
  fuelType: FuelType,
  maxDistFromRoute = 2,
  routeMeta: { distance: number; duration: number } | null = null,
  autonomyKm: number | null = null,
  _segmentKm?: number,
  topPerSegment = 3
): RouteStation[] {
  const sampleRate = Math.max(1, Math.floor(routeCoords.length / 300));
  const sampledCoords = routeCoords.filter((_, i) => i % sampleRate === 0) as [number, number][];
  if (sampledCoords.at(-1) !== routeCoords.at(-1)) {
    sampledCoords.push(routeCoords.at(-1)!);
  }

  const cumDists = precomputeCumulativeDistances(sampledCoords);

  const routeDurationMin = routeMeta ? routeMeta.duration / 60 : null;
  const routeDistKm = routeMeta
    ? routeMeta.distance / 1000
    : cumDists.at(-1)!;
  const minPerKm = routeDurationMin ? routeDurationMin / routeDistKm : null;

  // Dynamic segment count: log-scale so short trips get few segments, long trips get more
  const numSegments = Math.min(8, Math.max(3, Math.round(3 + Math.log2(routeDistKm / 10))));
  const segmentKm = Math.max(5, routeDistKm / numSegments);

  // Dynamic max detour distance based on route length
  const effectiveMaxDist = Math.min(maxDistFromRoute, Math.max(3, routeDistKm * 0.02));

  // Bounding box for quick pre-filter
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const c of routeCoords) {
    if (c[1] < minLat) minLat = c[1];
    if (c[1] > maxLat) maxLat = c[1];
    if (c[0] < minLng) minLng = c[0];
    if (c[0] > maxLng) maxLng = c[0];
  }
  const buffer = effectiveMaxDist / 111;
  minLat -= buffer;
  maxLat += buffer;
  minLng -= buffer;
  maxLng += buffer;

  // Find ALL stations near the route (not just cheapest 10%)
  const candidates: RouteStation[] = [];
  for (const s of stations) {
    const { lat, lng } = s._coords;
    if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) continue;

    const price = getStationPrice(s, fuelType);
    if (price == null) continue;

    const { distFromRoute, distAlongRoute } = pointProgressAlongPolyline(
      lat,
      lng,
      sampledCoords,
      cumDists
    );
    if (distFromRoute > effectiveMaxDist) continue;
    if (autonomyKm != null && distAlongRoute > autonomyKm) continue;

    const etaMinutes = minPerKm ? distAlongRoute * minPerKm : null;
    const detourMinutes = ((distFromRoute * 2) / 40) * 60;
    const segIdx = Math.floor(distAlongRoute / segmentKm);

    candidates.push({
      ...s,
      _price: price,
      _distFromRoute: distFromRoute,
      _distAlongRoute: distAlongRoute,
      _etaMinutes: etaMinutes,
      _detourMinutes: detourMinutes,
      _segment: segIdx,
      _segmentLabel: `${segIdx * segmentKm}–${(segIdx + 1) * segmentKm} km`,
    } as RouteStation);
  }

  // Cluster: keep topPerSegment cheapest per segment
  const segmentMap = new Map<number, RouteStation[]>();
  for (const c of candidates) {
    if (!segmentMap.has(c._segment)) segmentMap.set(c._segment, []);
    segmentMap.get(c._segment)!.push(c);
  }

  const results: RouteStation[] = [];
  for (const [, group] of segmentMap) {
    // Sort by a score combining price and detour (prefer cheap + close to route)
    group.sort((a, b) => {
      const scoreA = a._price + a._detourMinutes * 2;
      const scoreB = b._price + b._detourMinutes * 2;
      return scoreA - scoreB;
    });
    results.push(...group.slice(0, topPerSegment));
  }

  results.sort((a, b) => a._distAlongRoute - b._distAlongRoute);
  return results;
}
