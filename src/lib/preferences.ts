import type { UserPreferences } from "@/types";

const STORAGE_KEY = "essence-qc-prefs";

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
