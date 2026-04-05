// Station data types from Régie de l'énergie du Québec GeoJSON

export interface StationPrice {
  GasType: string;
  Price: string;
  IsAvailable: boolean;
}

export interface StationProperties {
  Name: string;
  Address?: string;
  brand?: string;
  Status: string;
  Prices: StationPrice[];
}

export interface StationGeometry {
  type: string;
  coordinates: [number, number]; // [lng, lat]
}

export interface StationFeature {
  type: string;
  geometry: StationGeometry;
  properties: StationProperties;
  _coords: { lat: number; lng: number };
}

export interface EnrichedStation extends StationFeature {
  _price: number | null;
  _distance: number;
  _colorClass: "cheap" | "mid" | "expensive";
  _blacklisted?: boolean;
}

export interface RouteStation extends StationFeature {
  _price: number;
  _distFromRoute: number;
  _distAlongRoute: number;
  _etaMinutes: number | null;
  _detourMinutes: number;
  _segment: number;
  _segmentLabel: string;
  _blacklisted?: boolean;
}

export type FuelType = "Régulier" | "Super" | "Diesel";
export type SortMode = "price" | "distance";
export type ViewMode = "map" | "list";
export type GeolocationStatus = "pending" | "granted" | "denied" | "unavailable";

export interface UserPreferences {
  fuelType: FuelType;
  costcoMember: boolean;
  tankSize: number;
  autonomyKm: number;
  homeLocation?: LatLng;
  homeAddress?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}
