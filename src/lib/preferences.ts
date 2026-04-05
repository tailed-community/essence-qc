import type { UserPreferences } from "@/types";

const STORAGE_KEY = "essence-qc-prefs";
const BLACKLIST_KEY = "essence-qc-blacklist";

const DEFAULTS: UserPreferences = {
  fuelType: "Régulier",
  costcoMember: false,
  tankSize: 50,
  autonomyKm: 0,
};

export function loadPrefs(): UserPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULTS, ...JSON.parse(saved) };
    }
  } catch {
    // corrupted data, reset
  }
  return { ...DEFAULTS };
}

export function savePrefs(prefs: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage full or unavailable
  }
}

/** Load blacklisted station keys from localStorage */
export function loadBlacklist(): Set<string> {
  try {
    const saved = localStorage.getItem(BLACKLIST_KEY);
    if (saved) {
      return new Set(JSON.parse(saved) as string[]);
    }
  } catch {
    // corrupted data, reset
  }
  return new Set();
}

/** Save blacklisted station keys to localStorage */
export function saveBlacklist(blacklist: Set<string>): void {
  try {
    localStorage.setItem(BLACKLIST_KEY, JSON.stringify([...blacklist]));
  } catch {
    // storage full or unavailable
  }
}

/** Generate a unique key for a station (lat,lng) */
export function stationKey(lat: number, lng: number): string {
  return `${lat},${lng}`;
}
