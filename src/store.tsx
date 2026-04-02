import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type {
  StationFeature,
  EnrichedStation,
  UserPreferences,
  LatLng,
  ViewMode,
  SortMode,
} from "@/types";
import { fetchStations } from "@/lib/data";
import { loadPrefs, savePrefs } from "@/lib/preferences";
import {
  haversine,
  getStationPrice,
  priceColorClass,
  isCostco,
} from "@/lib/helpers";

interface AppState {
  stations: StationFeature[];
  nearby: EnrichedStation[];
  costcoStations: EnrichedStation[];
  userLocation: LatLng | null;
  prefs: UserPreferences;
  currentView: ViewMode;
  sortMode: SortMode;
  avgPrice: number | null;
  loading: boolean;
  loadingText: string;
  error: string | null;
  setPrefs: (prefs: Partial<UserPreferences>) => void;
  setView: (view: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setUserLocation: (loc: LatLng) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<StationFeature[]>([]);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [prefs, setPrefsState] = useState<UserPreferences>(loadPrefs());
  const [currentView, setCurrentView] = useState<ViewMode>("map");
  const [sortMode, setSortMode] = useState<SortMode>("price");
  const [loading, setLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Chargement des prix...");
  const [error, setError] = useState<string | null>(null);

  const setPrefs = useCallback(
    (partial: Partial<UserPreferences>) => {
      setPrefsState((prev) => {
        const next = { ...prev, ...partial };
        savePrefs(next);
        return next;
      });
    },
    []
  );

  const setView = useCallback((view: ViewMode) => {
    setCurrentView(view);
  }, []);

  // Init: fetch data + geolocation
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoadingText("Chargement des prix...");
        const data = await fetchStations((msg) => {
          if (!cancelled) setLoadingText(msg);
        });
        if (cancelled) return;
        setStations(data);

        setLoadingText("Localisation en cours...");
        const loc = await getUserLocation();
        if (cancelled) return;
        setUserLocation(loc);

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            (err as Error).message || "Erreur de chargement"
          );
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute nearby stations
  const { nearby, avgPrice, costcoStations } = computeNearby(
    stations,
    userLocation,
    prefs,
    sortMode
  );

  return (
    <AppContext.Provider
      value={{
        stations,
        nearby,
        costcoStations,
        userLocation,
        prefs,
        currentView,
        sortMode,
        avgPrice,
        loading,
        loadingText,
        error,
        setPrefs,
        setView,
        setSortMode,
        setUserLocation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function getUserLocation(): Promise<LatLng> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 45.5017, lng: -73.5673 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        resolve({ lat: 45.5017, lng: -73.5673 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function computeNearby(
  stations: StationFeature[],
  userLocation: LatLng | null,
  prefs: UserPreferences,
  sortMode: SortMode
): {
  nearby: EnrichedStation[];
  avgPrice: number | null;
  costcoStations: EnrichedStation[];
} {
  if (!userLocation || stations.length === 0) {
    return { nearby: [], avgPrice: null, costcoStations: [] };
  }

  const enriched: EnrichedStation[] = [];
  let totalPrice = 0;
  let priceCount = 0;

  for (const s of stations) {
    const price = getStationPrice(s, prefs.fuelType);
    const dist = haversine(
      userLocation.lat,
      userLocation.lng,
      s._coords.lat,
      s._coords.lng
    );

    if (dist <= prefs.radius && price != null) {
      enriched.push({
        ...s,
        _price: price,
        _distance: dist,
        _colorClass: "mid",
      });
      totalPrice += price;
      priceCount++;
    }
  }

  const avg = priceCount > 0 ? totalPrice / priceCount : null;

  // Calculate color classes
  const prices = enriched.map((s) => s._price!);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  for (const s of enriched) {
    s._colorClass = priceColorClass(s._price, minP, maxP);
  }

  // Sort
  if (sortMode === "distance") {
    enriched.sort((a, b) => a._distance - b._distance);
  } else {
    enriched.sort((a, b) => (a._price ?? 999) - (b._price ?? 999));
  }

  // Costco stations
  const costco: EnrichedStation[] = [];
  if (prefs.costcoMember) {
    for (const s of stations) {
      if (!isCostco(s)) continue;
      const price = getStationPrice(s, prefs.fuelType);
      const dist = haversine(
        userLocation.lat,
        userLocation.lng,
        s._coords.lat,
        s._coords.lng
      );
      if (price != null) {
        costco.push({
          ...s,
          _price: price,
          _distance: dist,
          _colorClass: "cheap",
        });
      }
    }
    costco.sort((a, b) => a._distance - b._distance);
    costco.splice(3);
  }

  return { nearby: enriched, avgPrice: avg, costcoStations: costco };
}
