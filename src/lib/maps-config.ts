/**
 * Google Maps configuration and API key management.
 * The API key is read from the environment variable VITE_GOOGLE_MAPS_API_KEY.
 */

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || "";

export const QUEBEC_CENTER = { lat: 46.8, lng: -71.2 };
export const MONTREAL = { lat: 45.5017, lng: -73.5673 };
export const DEFAULT_ZOOM = 12;
