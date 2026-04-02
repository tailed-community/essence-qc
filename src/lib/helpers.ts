import type { StationFeature, FuelType } from "@/types";

/** Haversine distance in km between two lat/lng points */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parse price string "190.9¢" → 190.9 */
export function parsePrice(priceStr: string | undefined | null): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[¢\u00a2,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/** Get price for a specific gas type from a station feature */
export function getStationPrice(
  station: StationFeature,
  gasType: FuelType
): number | null {
  const prices = station.properties?.Prices;
  if (!prices) return null;
  const entry = prices.find((p) => p.GasType === gasType && p.IsAvailable);
  if (!entry) return null;
  return parsePrice(entry.Price);
}

/** Format cents price for display: 190.9 → "190.9¢" */
export function formatPrice(cents: number | null): string {
  if (cents == null) return "N/D";
  return `${cents.toFixed(1)}¢`;
}

/** Format distance in km */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Format duration in minutes */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m > 0 ? m.toString().padStart(2, "0") : ""}`;
}

/** Get price color class based on percentile */
export function priceColorClass(
  price: number | null,
  min: number | null,
  max: number | null
): "cheap" | "mid" | "expensive" {
  if (price == null || min == null || max == null || max === min) return "mid";
  const pct = (price - min) / (max - min);
  if (pct <= 0.25) return "cheap";
  if (pct <= 0.75) return "mid";
  return "expensive";
}

/** Calculate savings vs average for a tank size */
export function calcSavings(
  stationPrice: number,
  avgPrice: number,
  tankSize: number
): number | null {
  if (stationPrice == null || avgPrice == null) return null;
  return ((avgPrice - stationPrice) / 100) * tankSize;
}

/**
 * Calculate net savings accounting for fuel cost to drive to the station.
 * Assumes ~8L/100km average consumption and round-trip distance.
 */
export function calcNetSavings(
  stationPrice: number,
  avgPrice: number,
  tankSize: number,
  distanceKm: number
): number | null {
  if (stationPrice == null || avgPrice == null) return null;
  const grossSavings = ((avgPrice - stationPrice) / 100) * tankSize;
  const fuelCostToGetThere = (distanceKm * 2 * 8 * avgPrice) / (100 * 100); // round-trip, 8L/100km, cents→$
  return grossSavings - fuelCostToGetThere;
}

/** Check if a brand is Costco */
export function isCostco(station: StationFeature): boolean {
  const brand = (station.properties?.brand || "").toLowerCase();
  const name = (station.properties?.Name || "").toLowerCase();
  return brand.includes("costco") || name.includes("costco");
}

/** Debounce helper */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Pre-compute cumulative distances along a polyline */
export function precomputeCumulativeDistances(
  polyline: [number, number][]
): number[] {
  const dists = [0];
  for (let i = 1; i < polyline.length; i++) {
    dists[i] =
      dists[i - 1] +
      haversine(
        polyline[i - 1][1],
        polyline[i - 1][0],
        polyline[i][1],
        polyline[i][0]
      );
  }
  return dists;
}

/** Find distance from route and progress along route */
export function pointProgressAlongPolyline(
  lat: number,
  lng: number,
  polyline: [number, number][],
  cumDists: number[] | null = null
): { distFromRoute: number; distAlongRoute: number } {
  let minDist = Infinity;
  let bestIdx = 0;

  for (let i = 0; i < polyline.length; i++) {
    const d = haversine(lat, lng, polyline[i][1], polyline[i][0]);
    if (d < minDist) {
      minDist = d;
      bestIdx = i;
    }
  }

  let cumDist: number;
  if (cumDists) {
    cumDist = cumDists[bestIdx];
  } else {
    cumDist = 0;
    for (let i = 1; i <= bestIdx; i++) {
      cumDist += haversine(
        polyline[i - 1][1],
        polyline[i - 1][0],
        polyline[i][1],
        polyline[i][0]
      );
    }
  }

  return { distFromRoute: minDist, distAlongRoute: cumDist };
}

/** Get color for price markers */
export function priceColor(
  colorClass: "cheap" | "mid" | "expensive"
): string {
  switch (colorClass) {
    case "cheap":
      return "#059669";
    case "expensive":
      return "#dc2626";
    default:
      return "#d97706";
  }
}
