import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type {
  StationFeature,
  EnrichedStation,
  UserPreferences,
  LatLng,
  ViewMode,
  SortMode,
  GeolocationStatus,
} from "@/types";
import { fetchStations } from "@/lib/data";
import { loadPrefs, savePrefs, loadBlacklist, saveBlacklist, stationKey } from "@/lib/preferences";
import {
  haversine,
  getStationPrice,
  priceColorClass,
  isCostco,
} from "@/lib/helpers";
import { MONTREAL } from "@/lib/maps-config";

const MAX_NEARBY = 200;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const STALE_THRESHOLD_MS = 10 * 60 * 1000;  // 10 minutes

interface AppState {
  stations: StationFeature[];
  nearby: EnrichedStation[];
  allEnriched: EnrichedStation[];
  costcoStations: EnrichedStation[];
  userLocation: LatLng | null;
  effectiveLocation: LatLng;
  prefs: UserPreferences;
  currentView: ViewMode;
  sortMode: SortMode;
  avgPrice: number | null;
  loading: boolean;
  loadingText: string;
  error: string | null;
  geolocationStatus: GeolocationStatus;
  lastRefreshed: Date | null;
  setPrefs: (prefs: Partial<UserPreferences>) => void;
  setView: (view: ViewMode) => void;
  setSortMode: (mode: SortMode) => void;
  setUserLocation: (loc: LatLng) => void;
  setHomeLocation: (loc: LatLng, address: string) => void;
  clearHomeLocation: () => void;
  retryGeolocation: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  blacklist: Set<string>;
  toggleBlacklist: (lat: number, lng: number) => void;
  isBlacklisted: (lat: number, lng: number) => boolean;
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
  const [geolocationStatus, setGeolocationStatus] =
    useState<GeolocationStatus>("pending");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [blacklist, setBlacklist] = useState<Set<string>>(() => loadBlacklist());
  const watchIdRef = useRef<number | null>(null);
  const lastFetchedAtRef = useRef<number>(0);

  const effectiveLocation = useMemo(
    () => userLocation ?? prefs.homeLocation ?? MONTREAL,
    [userLocation, prefs.homeLocation]
  );

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

  const setHomeLocation = useCallback(
    (loc: LatLng, address: string) => {
      setPrefs({ homeLocation: loc, homeAddress: address });
    },
    [setPrefs]
  );

  const clearHomeLocation = useCallback(() => {
    setPrefs({ homeLocation: undefined, homeAddress: undefined });
  }, [setPrefs]);

  const toggleBlacklist = useCallback((lat: number, lng: number) => {
    setBlacklist((prev) => {
      const next = new Set(prev);
      const key = stationKey(lat, lng);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      saveBlacklist(next);
      return next;
    });
  }, []);

  const isBlacklisted = useCallback(
    (lat: number, lng: number) => blacklist.has(stationKey(lat, lng)),
    [blacklist]
  );

  // Start geolocation tracking
  const startGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeolocationStatus("unavailable");
      return;
    }

    setGeolocationStatus("pending");

    // Initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeolocationStatus("granted");
      },
      () => {
        setGeolocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Continuous tracking
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeolocationStatus("granted");
      },
      () => {
        // Keep existing location, just update status if we haven't gotten a fix yet
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  }, []);

  const retryGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeolocationStatus("unavailable");
      return;
    }

    // Check browser permission state first
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "denied") {
          // Browser has permanently denied — can't re-prompt
          setGeolocationStatus("denied");
          const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
          const msg = isStandalone
            ? "La localisation est bloquée.\n\n" +
              "Pour l'activer :\n" +
              "Android : Paramètres > Applications > Essence > Autorisations > Position\n" +
              "iOS : Réglages > Safari > Position"
            : "La localisation est bloquée par votre navigateur.\n\n" +
              "Pour l'activer :\n" +
              "1. Cliquez sur l'icône 🔒 dans la barre d'adresse\n" +
              "2. Autorisez l'accès à la position";
          alert(msg);
          return;
        }
        // "prompt" or "granted" — call getCurrentPosition to trigger the browser dialog
        startGeolocation();
      });
    } else {
      startGeolocation();
    }
  }, [startGeolocation]);

  // Silently refresh station data if stale
  const refreshStations = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchedAtRef.current < STALE_THRESHOLD_MS) return;

    try {
      const data = await fetchStations();
      lastFetchedAtRef.current = Date.now();
      setStations(data);
      setLastRefreshed(new Date());
    } catch {
      // Silent fail for background refresh — keep existing data
    }
  }, []);

  // Init: fetch data (don't block on geolocation)
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
        lastFetchedAtRef.current = Date.now();
        setLastRefreshed(new Date());
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Erreur de chargement");
          setLoading(false);
        }
      }
    }

    // Start both in parallel — don't await geolocation
    init();
    startGeolocation();

    // Interval-based refresh (every 15 min)
    const intervalId = setInterval(refreshStations, REFRESH_INTERVAL_MS);

    // Visibility-based refresh (tab/app becomes visible)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshStations();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Listen for permission changes (user enables location from browser/OS settings)
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((status) => {
        if (cancelled) return;
        status.addEventListener("change", () => {
          if (status.state === "granted") {
            startGeolocation();
          } else {
            setGeolocationStatus(status.state === "denied" ? "denied" : "unavailable");
          }
        });
      });
    }

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [startGeolocation, refreshStations]);

  // Compute nearby stations
  const { nearby, allEnriched, avgPrice, costcoStations } = computeNearby(
    stations,
    effectiveLocation,
    prefs,
    sortMode,
    blacklist
  );

  return (
    <AppContext.Provider
      value={{
        stations,
        nearby,
        allEnriched,
        costcoStations,
        userLocation,
        effectiveLocation,
        prefs,
        currentView,
        sortMode,
        avgPrice,
        loading,
        loadingText,
        error,
        geolocationStatus,
        lastRefreshed,
        setPrefs,
        setView,
        setSortMode,
        setUserLocation,
        setHomeLocation,
        clearHomeLocation,
        retryGeolocation,
        settingsOpen,
        setSettingsOpen,
        blacklist,
        toggleBlacklist,
        isBlacklisted,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

function computeNearby(
  stations: StationFeature[],
  location: LatLng,
  prefs: UserPreferences,
  sortMode: SortMode,
  blacklist: Set<string>
): {
  nearby: EnrichedStation[];
  allEnriched: EnrichedStation[];
  avgPrice: number | null;
  costcoStations: EnrichedStation[];
} {
  if (stations.length === 0) {
    return { nearby: [], allEnriched: [], avgPrice: null, costcoStations: [] };
  }

  const enriched: EnrichedStation[] = [];
  let totalPrice = 0;
  let priceCount = 0;

  for (const s of stations) {
    const price = getStationPrice(s, prefs.fuelType);
    if (price == null) continue;

    const dist = haversine(
      location.lat,
      location.lng,
      s._coords.lat,
      s._coords.lng
    );

    const isBlacklisted = blacklist.has(stationKey(s._coords.lat, s._coords.lng));

    enriched.push({
      ...s,
      _price: price,
      _distance: dist,
      _colorClass: "mid",
      _blacklisted: isBlacklisted,
    });

    // Exclude blacklisted stations from average price calculation
    if (!isBlacklisted) {
      totalPrice += price;
      priceCount++;
    }
  }

  const avg = priceCount > 0 ? totalPrice / priceCount : null;

  // Calculate color classes — exclude blacklisted from min/max
  const nonBlacklistedPrices = enriched
    .filter((s) => !s._blacklisted && s._price != null)
    .map((s) => s._price!);
  const minP = nonBlacklistedPrices.length > 0 ? Math.min(...nonBlacklistedPrices) : 0;
  const maxP = nonBlacklistedPrices.length > 0 ? Math.max(...nonBlacklistedPrices) : 0;
  for (const s of enriched) {
    s._colorClass = priceColorClass(s._price, minP, maxP);
  }

  // Sort
  if (sortMode === "distance") {
    enriched.sort((a, b) => a._distance - b._distance);
  } else {
    enriched.sort((a, b) => (a._price ?? 999) - (b._price ?? 999));
  }

  // Cap for list performance (map uses full allEnriched)
  const nearby = enriched.slice(0, MAX_NEARBY);
  const allEnriched = enriched;

  // Costco stations
  const costco: EnrichedStation[] = [];
  if (prefs.costcoMember) {
    for (const s of stations) {
      if (!isCostco(s)) continue;
      const price = getStationPrice(s, prefs.fuelType);
      const dist = haversine(
        location.lat,
        location.lng,
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

  return { nearby, allEnriched, avgPrice: avg, costcoStations: costco };
}
