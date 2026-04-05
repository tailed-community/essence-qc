import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  MapControl,
  ControlPosition,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type ClusterStats,
  type Marker,
} from "@googlemaps/markerclusterer";
import { useApp } from "@/store";
import { GOOGLE_MAPS_API_KEY, MAP_ID, DEFAULT_ZOOM } from "@/lib/maps-config";
import { calculateRoute, findStationsAlongRoute } from "@/lib/routing";
import type { OSRMRoute } from "@/lib/routing";
import type { EnrichedStation, RouteStation, LatLng, SortMode } from "@/types";
import {
  formatPrice,
  formatDistance,
  formatDuration,
  priceColor,
  isCostco,
  priceColorClass,
  calcSavings,
  calcNetSavings,
} from "@/lib/helpers";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { StationDetailDialog } from "@/components/StationDetailDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Navigation,
  Clock,
  Fuel,
  Car,
  Battery,
  Star,
  Loader2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  GripHorizontal,
  Settings2,
  X,
  Locate,
  Home,
  AlertTriangle,
} from "lucide-react";


type SheetState = "collapsed" | "peek" | "expanded";

interface SelectedPlace {
  location: LatLng;
  address: string;
}

export function MapView() {
  const {
    stations,
    allEnriched,
    nearby,
    avgPrice,
    userLocation,
    effectiveLocation,
    prefs,
    sortMode,
    setSortMode,
    geolocationStatus,
    setHomeLocation,
    retryGeolocation,
    setSettingsOpen,
    blacklist,
    toggleBlacklist,
    isBlacklisted,
  } = useApp();

  console.log(`geolocation status: ${geolocationStatus}, userLocation: ${JSON.stringify(userLocation)}, effectiveLocation: ${JSON.stringify(effectiveLocation)} prefs: ${JSON.stringify(prefs)}`);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<OSRMRoute | null>(null);
  const [routeStations, setRouteStations] = useState<RouteStation[]>([]);
  const [autonomyKm, setAutonomyKm] = useState(prefs.autonomyKm || 0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteStation, setSelectedRouteStation] =
    useState<RouteStation | null>(null);
  const [selectedNearbyStation, setSelectedNearbyStation] =
    useState<EnrichedStation | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("collapsed");
  const [nearbySheetState, setNearbySheetState] = useState<SheetState>("collapsed");
  const [nearbyDetailStation, setNearbyDetailStation] = useState<EnrichedStation | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [homeCTA, setHomeCTA] = useState<SelectedPlace | null>(null);
  const [viewportBounds, setViewportBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const recenterRef = useRef<(() => void) | null>(null);

  const isRouteMode = route != null;

  const doSearch = useCallback(
    async (dest: LatLng) => {
      setSearching(true);
      setError(null);
      setSelectedNearbyStation(null);
      setHomeCTA(null);

      try {
        const r = await calculateRoute(effectiveLocation, dest);
        setRoute(r);
        setDestination(dest);

        const routeCoords = r.geometry.coordinates as [number, number][];
        const routeMeta = { distance: r.distance, duration: r.duration };
        const auto = autonomyKm > 0 ? autonomyKm : null;

        const found = findStationsAlongRoute(
          routeCoords,
          stations,
          prefs.fuelType,
          2,
          routeMeta,
          auto
        );
        // Mark blacklisted route stations
        for (const s of found) {
          s._blacklisted = isBlacklisted(s._coords.lat, s._coords.lng);
        }
        setRouteStations(found);
        setSheetState("peek");
      } catch (err) {
        setError((err as Error).message || "Erreur de calcul de trajet");
      } finally {
        setSearching(false);
      }
    },
    [effectiveLocation, stations, prefs.fuelType, autonomyKm]
  );

  const handlePlaceSelect = useCallback(
    (loc: LatLng, address: string) => {
      setHomeCTA({ location: loc, address });
      doSearch(loc);
    },
    [doSearch]
  );

  const handleSetHome = useCallback(() => {
    if (!homeCTA) return;
    setHomeLocation(homeCTA.location, homeCTA.address);
    setHomeCTA(null);
  }, [homeCTA, setHomeLocation]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setDestination(null);
    setRouteStations([]);
    setSelectedRouteStation(null);
    setSheetState("collapsed");
    setError(null);
    setHomeCTA(null);
  }, []);

  // Re-filter when autonomy or blacklist changes
  useEffect(() => {
    if (!route) return;
    const routeCoords = route.geometry.coordinates as [number, number][];
    const routeMeta = { distance: route.distance, duration: route.duration };
    const auto = autonomyKm > 0 ? autonomyKm : null;

    const found = findStationsAlongRoute(
      routeCoords,
      stations,
      prefs.fuelType,
      2,
      routeMeta,
      auto
    );
    for (const s of found) {
      s._blacklisted = isBlacklisted(s._coords.lat, s._coords.lng);
    }
    setRouteStations(found);
  }, [autonomyKm, route, stations, prefs.fuelType, blacklist]);

  const cycleSheet = useCallback(() => {
    setSheetState((prev) => {
      if (prev === "collapsed") return "peek";
      if (prev === "peek") return "expanded";
      return "collapsed";
    });
  }, []);

  const cycleNearbySheet = useCallback(() => {
    setNearbySheetState((prev) => {
      if (prev === "collapsed") return "peek";
      if (prev === "peek") return "expanded";
      return "collapsed";
    });
  }, []);

  // Auto-dismiss home CTA after 8 seconds
  useEffect(() => {
    if (!homeCTA) return;
    const timer = setTimeout(() => setHomeCTA(null), 8000);
    return () => clearTimeout(timer);
  }, [homeCTA]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full items-center justify-center bg-muted p-8 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-lg font-semibold">Clé API Google Maps requise</p>
          <p className="text-sm text-muted-foreground">
            Ajoutez{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              VITE_GOOGLE_MAPS_API_KEY
            </code>{" "}
            dans votre fichier{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              .env
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places", "marker"]}>
      <div className="relative h-full w-full">
        {/* ── Full-screen map ──────────────────────── */}
        <div className="absolute inset-0">
          <MapContent
            userLocation={userLocation}
            effectiveLocation={effectiveLocation}
            destination={destination}
            route={route}
            routeStations={routeStations}
            nearbyStations={allEnriched}
            isRouteMode={isRouteMode}
            selectedRouteStation={selectedRouteStation}
            selectedNearbyStation={selectedNearbyStation}
            onRouteStationClick={(s) => {
              setSelectedRouteStation(s);
              setSelectedNearbyStation(null);
              setSheetState("collapsed");
            }}
            onNearbyStationClick={(s) => {
              setSelectedNearbyStation(s);
              setSelectedRouteStation(null);
            }}
            onInfoClose={() => {
              setSelectedRouteStation(null);
              setSelectedNearbyStation(null);
            }}
            fuelType={prefs.fuelType}
            recenterRef={recenterRef}
            geolocationStatus={geolocationStatus}
            onViewportChange={setViewportBounds}
          />
        </div>

        {/* ── Floating search bar (top overlay) ───── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <div className="pointer-events-auto mx-auto max-w-lg space-y-2">
            <div className="rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
              <div className="p-3">
                <PlacesAutocompleteInput
                  inputRef={searchInputRef}
                  onSelect={handlePlaceSelect}
                  searching={searching}
                  onClear={isRouteMode ? clearRoute : undefined}
                />
              </div>

              {/* Home CTA banner */}
              {homeCTA && !prefs.homeAddress && (
                <div className="border-t px-3 py-2">
                  <button
                    onClick={handleSetHome}
                    className="flex w-full items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Home className="h-3.5 w-3.5 shrink-0" />
                    <span>Définir comme domicile</span>
                    <span className="ml-auto truncate text-[10px] font-normal text-blue-500">
                      {homeCTA.address}
                    </span>
                  </button>
                </div>
              )}

              {/* Home chip: address set */}
              {prefs.homeAddress && !isRouteMode && (
                <div className="border-t px-3 py-1.5">
                  <button
                    onClick={() => recenterRef.current?.()}
                    className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Home className="h-3 w-3" />
                    <span className="max-w-[200px] truncate">
                      {prefs.homeAddress}
                    </span>
                  </button>
                </div>
              )}

              {/* Home CTA: no home + geolocation denied/unavailable */}
              {!prefs.homeAddress && (geolocationStatus === "denied" || geolocationStatus === "unavailable") && !isRouteMode && (
                <div className="border-t px-3 py-1.5">
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 px-2.5 py-2 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-50"
                  >
                    <Home className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>Définir mon domicile</span>
                  </button>
                </div>
              )}

              {/* Settings toggle (autonomy) — only in route mode */}
              {isRouteMode && (
                <div className="border-t px-3 pb-2">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex w-full items-center gap-1.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>
                      Autonomie :{" "}
                      {autonomyKm > 0 ? `${autonomyKm} km` : "Illimitée"}
                    </span>
                    {showSettings ? (
                      <ChevronUp className="ml-auto h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-auto h-3 w-3" />
                    )}
                  </button>
                  {showSettings && (
                    <div className="space-y-1.5 pb-1">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-1.5 text-xs">
                          <Battery className="h-3.5 w-3.5" />
                          Autonomie restante
                        </Label>
                        <span className="text-xs font-medium text-muted-foreground">
                          {autonomyKm > 0 ? `${autonomyKm} km` : "Illimitée"}
                        </span>
                      </div>
                      <Slider
                        value={[autonomyKm]}
                        onValueChange={(v) =>
                          setAutonomyKm(Array.isArray(v) ? v[0] : v)
                        }
                        min={0}
                        max={800}
                        step={10}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Loading / error overlays */}
            {searching && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm text-muted-foreground">
                  Calcul du trajet...
                </span>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-50/95 px-4 py-3 text-sm text-red-600 shadow-lg ring-1 ring-red-200 backdrop-blur-sm">
                ❌ {error}
              </div>
            )}

            {/* Geolocation prompt — inline in floating overlay */}
            {(geolocationStatus === "denied" || geolocationStatus === "unavailable") &&
              !prefs.homeLocation &&
              !isRouteMode && (
                <GeolocationPrompt onRetry={retryGeolocation} />
              )}
          </div>
        </div>

        {/* ── Bottom sheet (route results) ─────────── */}
        {isRouteMode && !searching && (
          <BottomSheet
            state={sheetState}
            onCycle={cycleSheet}
            onChangeState={setSheetState}
          >
            <RouteResults
              route={route}
              routeStations={routeStations}
              autonomyKm={autonomyKm > 0 ? autonomyKm : null}
              userLocation={effectiveLocation}
              destination={destination}
              onStationTap={(s) => {
                setSelectedRouteStation(s);
                setSelectedNearbyStation(null);
                setSheetState("collapsed");
              }}
            />
          </BottomSheet>
        )}

        {/* ── Bottom sheet (nearby stations list) ─────────── */}
        {!isRouteMode && (
          <BottomSheet
            state={nearbySheetState}
            onCycle={cycleNearbySheet}
            onChangeState={setNearbySheetState}
          >
            <NearbyStationsList
              stations={viewportBounds
                ? nearby.filter((s) =>
                    s._coords.lat >= viewportBounds.south &&
                    s._coords.lat <= viewportBounds.north &&
                    s._coords.lng >= viewportBounds.west &&
                    s._coords.lng <= viewportBounds.east
                  )
                : nearby}
              avgPrice={avgPrice}
              tankSize={prefs.tankSize}
              sortMode={sortMode}
              onSortChange={setSortMode}
              onStationTap={(s) => {
                setNearbyDetailStation(s);
              }}
            />
          </BottomSheet>
        )}

        {/* Station detail dialog (nearby sheet) */}
        <StationDetailDialog
          station={nearbyDetailStation}
          fuelType={prefs.fuelType}
          avgPrice={avgPrice}
          tankSize={prefs.tankSize}
          onOpenChange={(open) => {
            if (!open) setNearbyDetailStation(null);
          }}
          onToggleBlacklist={toggleBlacklist}
          isBlacklisted={isBlacklisted}
        />
      </div>
    </APIProvider>
  );
}

/* ─── Draggable Bottom Sheet ─────────────────────────── */

function BottomSheet({
  state,
  onCycle,
  onChangeState,
  children,
}: {
  state: SheetState;
  onCycle: () => void;
  onChangeState: (s: SheetState) => void;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartState = useRef<SheetState>(state);

  const heightClass =
    state === "expanded"
      ? "max-h-[75vh]"
      : state === "peek"
        ? "max-h-[40vh]"
        : "max-h-[0px]";

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      dragStartY.current = e.touches[0].clientY;
      dragStartState.current = state;
    },
    [state]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (dragStartY.current == null) return;
      const dy = dragStartY.current - e.changedTouches[0].clientY;
      dragStartY.current = null;

      if (Math.abs(dy) < 20) {
        onCycle();
        return;
      }

      if (dy > 40) {
        onChangeState(
          dragStartState.current === "collapsed" ? "peek" : "expanded"
        );
      } else if (dy < -40) {
        onChangeState(
          dragStartState.current === "expanded" ? "peek" : "collapsed"
        );
      }
    },
    [onCycle, onChangeState]
  );

  return (
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out"
    >
      <div
        className="flex cursor-pointer flex-col items-center pb-1 pt-2"
        onClick={onCycle}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="h-1 w-10 rounded-full bg-gray-300" />
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          {state === "collapsed" && (
            <>
              <ChevronUp className="h-3 w-3" /> Voir les stations
            </>
          )}
          {state === "peek" && (
            <>
              <GripHorizontal className="h-3 w-3" /> Glissez pour agrandir
            </>
          )}
          {state === "expanded" && (
            <>
              <ChevronDown className="h-3 w-3" /> Réduire
            </>
          )}
        </div>
      </div>

      <div
        className={`overflow-y-auto overscroll-contain transition-all duration-300 ease-out ${heightClass}`}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Places Autocomplete Input ──────────────────────── */

function PlacesAutocompleteInput({
  onSelect,
  searching,
  onClear,
  inputRef: externalRef,
}: {
  onSelect: (loc: LatLng, address: string) => void;
  searching: boolean;
  onClear?: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = externalRef || internalRef;
  const places = useMapsLibrary("places");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocomplete = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" },
      fields: ["geometry", "formatted_address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        onSelectRef.current(
          {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
          place.formatted_address || ""
        );
      }
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [places]);

  const handleClear = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }, [onClear, inputRef]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Rechercher une adresse ou planifier un trajet..."
        className="h-10 w-full rounded-lg border bg-background pl-10 pr-10 text-sm outline-none ring-ring focus-visible:ring-2"
        disabled={searching}
      />
      {searching ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-500" />
      ) : onClear ? (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      ) : (
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      )}
    </div>
  );
}

/* ─── Map Content (unified: nearby + route) ──────────── */

function MapContent({
  userLocation,
  effectiveLocation,
  destination,
  route,
  routeStations,
  nearbyStations,
  isRouteMode,
  selectedRouteStation,
  selectedNearbyStation,
  onRouteStationClick,
  onNearbyStationClick,
  onInfoClose,
  fuelType,
  recenterRef,
  geolocationStatus,
  onViewportChange,
}: {
  userLocation: LatLng | null;
  effectiveLocation: LatLng;
  destination: LatLng | null;
  route: OSRMRoute | null;
  routeStations: RouteStation[];
  nearbyStations: EnrichedStation[];
  isRouteMode: boolean;
  selectedRouteStation: RouteStation | null;
  selectedNearbyStation: EnrichedStation | null;
  onRouteStationClick: (s: RouteStation) => void;
  onNearbyStationClick: (s: EnrichedStation) => void;
  onInfoClose: () => void;
  fuelType: string;
  recenterRef: React.MutableRefObject<(() => void) | null>;
  geolocationStatus: string;
  onViewportChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const stationByKeyRef = useRef<Map<string, EnrichedStation>>(new Map());
  const [viewportBounds, setViewportBounds] = useState<google.maps.LatLngBounds | null>(null);

  // Track viewport bounds for viewport-based color coding
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("idle", () => {
      const bounds = map.getBounds();
      if (bounds) {
        setViewportBounds(bounds);
        onViewportChange?.({
          north: bounds.getNorthEast().lat(),
          south: bounds.getSouthWest().lat(),
          east: bounds.getNorthEast().lng(),
          west: bounds.getSouthWest().lng(),
        });
      }
    });
    return () => google.maps.event.removeListener(listener);
  }, [map]);

  // Recolor markers based on viewport-visible stations
  useEffect(() => {
    if (!viewportBounds || isRouteMode || markersRef.current.size === 0) return;

    // Find min/max price among visible non-blacklisted stations
    const visiblePrices: number[] = [];
    for (const [, station] of stationByKeyRef.current) {
      if (station._price == null || station._blacklisted) continue;
      const pos = { lat: station._coords.lat, lng: station._coords.lng };
      if (viewportBounds.contains(pos)) {
        visiblePrices.push(station._price);
      }
    }

    if (visiblePrices.length === 0) return;

    const minP = Math.min(...visiblePrices);
    const maxP = Math.max(...visiblePrices);

    // Update marker colors based on viewport-local percentiles
    for (const [mKey, station] of stationByKeyRef.current) {
      const marker = markersRef.current.get(mKey);
      if (!marker || station._price == null) continue;

      const costco = isCostco(station);
      let bgColor: string;
      let borderColor: string;

      if (station._blacklisted) {
        bgColor = "#374151"; // dark gray
        borderColor = "#f59e0b"; // amber warning border
      } else if (costco) {
        bgColor = "#005DAA";
        borderColor = "#FFD700";
      } else {
        const localColorClass = priceColorClass(station._price, minP, maxP);
        bgColor = priceColor(localColorClass);
        borderColor = "white";
      }

      const el = marker.content as HTMLElement;
      if (el) {
        el.style.background = bgColor;
        el.style.borderColor = borderColor;
      }
    }
  }, [viewportBounds, isRouteMode]);

  // Expose recenter function to parent
  useEffect(() => {
    recenterRef.current = () => {
      if (map) {
        map.panTo({ lat: effectiveLocation.lat, lng: effectiveLocation.lng });
        map.setZoom(DEFAULT_ZOOM);
      }
    };
  }, [map, effectiveLocation, recenterRef]);

  // Create clusterer once
  useEffect(() => {
    if (!map || !markerLib) return;

    const renderer = {
      render({ count, position }: { count: number; position: google.maps.LatLng; markers?: Marker[]; stats?: ClusterStats }) {
        const el = document.createElement("div");
        el.className = "cluster-marker";
        el.style.cssText =
          "display:flex;align-items:center;justify-content:center;" +
          "width:40px;height:40px;border-radius:50%;" +
          "background:#3b82f6;color:white;font-weight:700;" +
          "font-size:13px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);" +
          "cursor:pointer;";
        el.textContent = count > 99 ? "99+" : String(count);

        return new google.maps.marker.AdvancedMarkerElement({
          position,
          content: el,
          zIndex: count,
        });
      },
    };

    clustererRef.current = new MarkerClusterer({
      map,
      markers: [],
      algorithm: new SuperClusterAlgorithm({ radius: 300, maxZoom: 12 }),
      renderer,
    });

    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current?.setMap(null);
      clustererRef.current = null;
    };
  }, [map, markerLib]);

  // Sync markers with nearbyStations (imperative — no React re-render on pan)
  // We track a "data version" to detect when we need to fully rebuild
  // (e.g. fuel type change causes new prices on existing markers)
  const prevStationsRef = useRef<EnrichedStation[]>([]);

  useEffect(() => {
    if (!map || !markerLib || !clustererRef.current || isRouteMode) {
      // In route mode, clear clustered markers
      clustererRef.current?.clearMarkers();
      markersRef.current.clear();
      return;
    }

    // Detect if prices changed (fuel type switch, data refresh) by checking
    // if any existing marker's station has a different price now
    let needsFullRebuild = false;
    if (prevStationsRef.current.length > 0 && nearbyStations.length > 0) {
      const oldByKey = new Map(
        prevStationsRef.current.map((s) => [`${s._coords.lat},${s._coords.lng}`, s])
      );
      for (const station of nearbyStations) {
        const key = `${station._coords.lat},${station._coords.lng}`;
        const old = oldByKey.get(key);
        if (old && (old._price !== station._price || old._colorClass !== station._colorClass || old._blacklisted !== station._blacklisted)) {
          needsFullRebuild = true;
          break;
        }
      }
    }
    prevStationsRef.current = nearbyStations;

    if (needsFullRebuild) {
      // Clear all existing markers and rebuild from scratch
      clustererRef.current.clearMarkers();
      markersRef.current.clear();
      stationByKeyRef.current.clear();
    }

    const nextKeys = new Set<string>();
    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    const existing = markersRef.current;

    for (const station of nearbyStations) {
      const key = `${station._coords.lat},${station._coords.lng}`;
      nextKeys.add(key);
      stationByKeyRef.current.set(key, station);

      if (existing.has(key)) continue; // already on map, skip

      const costco = isCostco(station);
      let bgColor: string;
      let borderColor: string;

      if (station._blacklisted) {
        bgColor = "#374151";
        borderColor = "#f59e0b";
      } else if (costco) {
        bgColor = "#005DAA";
        borderColor = "#FFD700";
      } else {
        bgColor = priceColor(station._colorClass);
        borderColor = "white";
      }

      const el = document.createElement("div");
      el.style.cssText =
        `cursor:pointer;border-radius:9999px;padding:1px 8px;` +
        `font-size:11px;font-weight:700;color:white;` +
        `box-shadow:0 1px 4px rgba(0,0,0,0.25);` +
        `background:${bgColor};border:2px solid ${borderColor};` +
        `white-space:nowrap;`;
      el.textContent = station._blacklisted
        ? `⚠️ ${formatPrice(station._price)}`
        : formatPrice(station._price);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: station._coords.lat, lng: station._coords.lng },
        content: el,
      });

      marker.addListener("gmp-click", () => onNearbyStationClick(station));

      existing.set(key, marker);
      newMarkers.push(marker);
    }

    // Remove old markers no longer in the dataset
    const toRemove: google.maps.marker.AdvancedMarkerElement[] = [];
    for (const [key, marker] of existing) {
      if (!nextKeys.has(key)) {
        toRemove.push(marker);
        existing.delete(key);
        stationByKeyRef.current.delete(key);
      }
    }

    if (toRemove.length > 0) {
      clustererRef.current.removeMarkers(toRemove);
    }
    if (newMarkers.length > 0) {
      clustererRef.current.addMarkers(newMarkers);
    }
  }, [map, markerLib, nearbyStations, isRouteMode, onNearbyStationClick]);

  const center = useMemo(
    () => ({ lat: effectiveLocation.lat, lng: effectiveLocation.lng }),
    [effectiveLocation]
  );

  return (
    <GoogleMap
      defaultCenter={center}
      defaultZoom={DEFAULT_ZOOM}
      mapId={MAP_ID}
      className="h-full w-full"
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
    >
      {/* User location */}
      {userLocation && (
        <AdvancedMarker position={userLocation} zIndex={1000}>
          <div className="relative">
            <div className="h-4 w-4 rounded-full border-[3px] border-white bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.3)]" />
            {!isRouteMode && (
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
            )}
          </div>
        </AdvancedMarker>
      )}

      {/* Destination marker (route mode) */}
      {destination && (
        <AdvancedMarker position={destination} zIndex={999}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-800 text-white shadow-lg">
            📍
          </div>
        </AdvancedMarker>
      )}

      {/* Route polyline */}
      {route && <RoutePolyline route={route} />}

      {/* ── Route station markers ────────── */}
      {isRouteMode &&
        routeStations.map((s, i) => {
          const costco = isCostco(s);
          const nonBlacklistedPrices = routeStations
            .filter((x) => !x._blacklisted)
            .map((x) => x._price);
          const rMinP = nonBlacklistedPrices.length > 0 ? Math.min(...nonBlacklistedPrices) : s._price;
          const rMaxP = nonBlacklistedPrices.length > 0 ? Math.max(...nonBlacklistedPrices) : s._price;
          const colorCls = priceColorClass(s._price, rMinP, rMaxP);

          let bgColor: string;
          let borderColor: string;
          if (s._blacklisted) {
            bgColor = "#374151";
            borderColor = "#f59e0b";
          } else if (costco) {
            bgColor = "#005DAA";
            borderColor = "#FFD700";
          } else {
            bgColor = priceColor(colorCls);
            borderColor = "white";
          }

          return (
            <AdvancedMarker
              key={`route-${s._coords.lat}-${s._coords.lng}-${i}`}
              position={{ lat: s._coords.lat, lng: s._coords.lng }}
              onClick={() => onRouteStationClick(s)}
            >
              <div
                className="cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-md"
                style={{
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                }}
              >
                {s._blacklisted ? `⚠️ ${formatPrice(s._price)}` : formatPrice(s._price)}
              </div>
            </AdvancedMarker>
          );
        })}

      {/* Nearby markers are managed imperatively by MarkerClusterer above */}

      {/* ── Route station info window ───────────── */}
      {selectedRouteStation && (
        <InfoWindow
          position={{
            lat: selectedRouteStation._coords.lat,
            lng: selectedRouteStation._coords.lng,
          }}
          onCloseClick={onInfoClose}
        >
          <div className="min-w-[180px] space-y-1.5 p-1">
            <h3 className="text-sm font-bold">
              {selectedRouteStation.properties.Name}
            </h3>
            <p className="text-xs font-semibold">
              {formatPrice(selectedRouteStation._price)} —{" "}
              {formatDistance(selectedRouteStation._distFromRoute)} du trajet
            </p>
            {selectedRouteStation._etaMinutes != null && (
              <p className="text-xs font-semibold text-blue-700">
                ⏱ Dans {formatDuration(selectedRouteStation._etaMinutes)}
              </p>
            )}
            <a
              href={
                destination
                  ? `https://www.google.com/maps/dir/?api=1&origin=${effectiveLocation.lat},${effectiveLocation.lng}&destination=${destination.lat},${destination.lng}&waypoints=${selectedRouteStation._coords.lat},${selectedRouteStation._coords.lng}&travelmode=driving`
                  : `https://www.google.com/maps/dir/?api=1&destination=${selectedRouteStation._coords.lat},${selectedRouteStation._coords.lng}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white no-underline"
            >
              <Navigation className="h-3 w-3" />
              {destination
                ? "Itinéraire via cette station"
                : "Itinéraire"}
            </a>
          </div>
        </InfoWindow>
      )}

      {/* ── Nearby station info window ──────────── */}
      {selectedNearbyStation && (
        <InfoWindow
          position={{
            lat: selectedNearbyStation._coords.lat,
            lng: selectedNearbyStation._coords.lng,
          }}
          onCloseClick={onInfoClose}
          pixelOffset={[0, -10]}
        >
          <div className="min-w-[200px] space-y-2 p-1">
            <h3 className="text-sm font-bold">
              {selectedNearbyStation.properties.Name}
            </h3>
            {selectedNearbyStation.properties.brand && (
              <p className="text-xs text-gray-500">
                {selectedNearbyStation.properties.brand}
              </p>
            )}
            {selectedNearbyStation._distance != null && (
              <p className="text-xs text-gray-500">
                📍 {formatDistance(selectedNearbyStation._distance)}
              </p>
            )}
            <div className="space-y-1">
              {(selectedNearbyStation.properties.Prices || []).map((p) => {
                const isSelected = p.GasType === fuelType;
                return (
                  <div
                    key={p.GasType}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-gray-600">{p.GasType}</span>
                    <span
                      className={
                        isSelected
                          ? "font-bold text-blue-700"
                          : "font-semibold"
                      }
                    >
                      {p.IsAvailable ? p.Price : "N/D"}
                    </span>
                  </div>
                );
              })}
            </div>
            {selectedNearbyStation.properties.Address && (
              <p className="text-xs text-gray-400">
                {selectedNearbyStation.properties.Address}
              </p>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedNearbyStation._coords.lat},${selectedNearbyStation._coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-blue-700"
            >
              <Navigation className="h-3 w-3" />
              Itinéraire
            </a>
          </div>
        </InfoWindow>
      )}

      {/* Auto-fit: route bounds or initial center */}
      {route ? <RouteAutoFit route={route} /> : <MapAutoFit location={effectiveLocation} />}

      {/* Recenter button — native map control */}
      {!isRouteMode && (
        <MapControl position={ControlPosition.RIGHT_BOTTOM}>
          <button
            onClick={() => recenterRef.current?.()}
            className="mb-2 mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition-colors hover:bg-gray-50"
            title="Recentrer"
          >
            <Locate
              className={`h-5 w-5 ${
                geolocationStatus === "granted"
                  ? "text-blue-500"
                  : "text-gray-400"
              }`}
            />
          </button>
        </MapControl>
      )}
    </GoogleMap>
  );
}

/* ─── Route Polyline ─────────────────────────────────── */

function RoutePolyline({ route }: { route: OSRMRoute }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !route) return;

    const path = route.geometry.coordinates.map((c) => ({
      lat: c[1],
      lng: c[0],
    }));

    const polyline = new google.maps.Polyline({
      path,
      strokeColor: "#3b82f6",
      strokeWeight: 5,
      strokeOpacity: 0.7,
      map,
    });

    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 40);

    return () => {
      polyline.setMap(null);
    };
  }, [map, route]);

  return null;
}

function RouteAutoFit({ route }: { route: OSRMRoute }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !route) return;
    const path = route.geometry.coordinates.map((c) => ({
      lat: c[1],
      lng: c[0],
    }));
    const bounds = new google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 40);
  }, [map, route]);

  return null;
}

function MapAutoFit({ location }: { location: LatLng }) {
  const map = useMap();
  const lastLocation = useRef<LatLng | null>(null);

  useEffect(() => {
    if (!map) return;
    if (lastLocation.current) {
      // Only recenter if location changed significantly (>1km)
      const dLat = location.lat - lastLocation.current.lat;
      const dLng = location.lng - lastLocation.current.lng;
      const approxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
      if (approxKm < 1) return;
    }
    lastLocation.current = location;
    map.panTo({ lat: location.lat, lng: location.lng });
  }, [map, location]);

  return null;
}

/* ─── Geolocation Prompt ─────────────────────────────── */

function GeolocationPrompt({ onRetry }: { onRetry: () => void }) {
  return (
    <button
      onClick={onRetry}
      className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-400 shadow-sm ring-1 ring-blue-100 transition-colors hover:bg-blue-100 hover:text-blue-500"
    >
      <Locate className="h-3.5 w-3.5" />
      Activer la localisation
    </button>
  );
}

/* ─── Route Results List ─────────────────────────────── */

function RouteResults({
  route,
  routeStations,
  autonomyKm,
  userLocation,
  destination,
  onStationTap,
}: {
  route: OSRMRoute;
  routeStations: RouteStation[];
  autonomyKm: number | null;
  userLocation: LatLng | null;
  destination: LatLng | null;
  onStationTap: (s: RouteStation) => void;
}) {
  const distKm = Math.round(route.distance / 1000);
  const durMin = Math.round(route.duration / 60);

  const nonBlacklisted = routeStations.filter((s) => !s._blacklisted);

  const cheapestPrice =
    nonBlacklisted.length > 0
      ? Math.min(...nonBlacklisted.map((s) => s._price))
      : null;

  const bestStation = nonBlacklisted.find((s) => s._price === cheapestPrice);
  const gmapsTripUrl =
    userLocation && destination
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}${bestStation ? `&waypoints=${bestStation._coords.lat},${bestStation._coords.lng}` : ""}&travelmode=driving`
      : null;

  const recommended = [...nonBlacklisted]
    .sort((a, b) => {
      const scoreA = a._price + a._detourMinutes * 2;
      const scoreB = b._price + b._detourMinutes * 2;
      return scoreA - scoreB;
    })
    .slice(0, 3);

  const recommendedSet = new Set(
    recommended.map((s) => `${s._coords.lat}-${s._coords.lng}`)
  );

  const nonBlacklistedPrices = nonBlacklisted.map((st) => st._price);
  const minP = nonBlacklistedPrices.length > 0 ? Math.min(...nonBlacklistedPrices) : 0;
  const maxP = nonBlacklistedPrices.length > 0 ? Math.max(...nonBlacklistedPrices) : 0;

  return (
    <div className="space-y-2 px-3 pb-6 pt-1">
      {/* Route summary bar */}
      <div className="flex items-center justify-around rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800">
        <span className="flex items-center gap-1">
          <Car className="h-4 w-4" /> {distKm} km
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" /> {formatDuration(durMin)}
        </span>
        <span className="flex items-center gap-1">
          <Fuel className="h-4 w-4" /> {routeStations.length} stations
        </span>
      </div>

      {/* Open in Google Maps */}
      {gmapsTripUrl && (
        <a
          href={gmapsTripUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#003DA5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002d7a]"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir dans Google Maps
          {bestStation && (
            <span className="text-xs opacity-80">
              (arrêt à {formatPrice(bestStation._price)})
            </span>
          )}
        </a>
      )}

      {/* Autonomy bar */}
      {autonomyKm != null && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{
                width: `${Math.min(100, Math.round((autonomyKm / distKm) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            🔋 Autonomie : {autonomyKm} km / {distKm} km
          </p>
        </div>
      )}

      {routeStations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {autonomyKm != null
              ? "Aucune station trouvée dans votre autonomie restante."
              : "Aucune station trouvée le long du trajet."}
          </p>
        </div>
      ) : (
        <>
          <p className="pt-1 text-xs font-semibold text-muted-foreground">
            Stations le long du trajet ({routeStations.length})
          </p>
          {[...routeStations]
            .sort((a, b) => {
              const aRec = recommendedSet.has(
                `${a._coords.lat}-${a._coords.lng}`
              )
                ? 0
                : 1;
              const bRec = recommendedSet.has(
                `${b._coords.lat}-${b._coords.lng}`
              )
                ? 0
                : 1;
              if (aRec !== bRec) return aRec - bRec;
              return a._price - b._price;
            })
            .map((s, i) => {
              const costco = isCostco(s);
              const isBest = s._price === cheapestPrice;
              const isRecommended = recommendedSet.has(
                `${s._coords.lat}-${s._coords.lng}`
              );
              const colorClass = costco
                ? "cheap"
                : priceColorClass(s._price, minP, maxP);

              const priceColorMap: Record<string, string> = {
                cheap: "bg-emerald-500",
                mid: "bg-amber-500",
                expensive: "bg-red-500",
              };

              const badgeBg = costco
                ? "bg-[#005DAA]"
                : s._blacklisted
                  ? "bg-gray-700"
                  : priceColorMap[colorClass] || "bg-amber-500";

              const navUrl = destination
                ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ""}&destination=${destination.lat},${destination.lng}&waypoints=${s._coords.lat},${s._coords.lng}&travelmode=driving`
                : `https://www.google.com/maps/dir/?api=1&destination=${s._coords.lat},${s._coords.lng}`;

              return (
                <div
                  key={`${s._coords.lat}-${s._coords.lng}-${i}`}
                  onClick={() => onStationTap(s)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
                    costco ? "border-blue-200 ring-1 ring-blue-100" : ""
                  } ${isBest ? "ring-2 ring-blue-200" : ""} ${isRecommended ? "border-blue-100" : ""} ${s._blacklisted ? "border-amber-300 bg-amber-50/30" : ""}`}
                >
                  <div
                    className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-white ${badgeBg}`}
                  >
                    {s._blacklisted && (
                      <span className="text-xs">⚠️</span>
                    )}
                    <span className="text-lg font-extrabold leading-tight">
                      {s._price.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-medium opacity-90">
                      ¢/L
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold">
                      {s.properties.Name}
                      {s._blacklisted && (
                        <Badge variant="outline" className="ml-1.5 border-amber-400 text-[10px] text-amber-700">
                          <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                          Périmé
                        </Badge>
                      )}
                      {isBest && !s._blacklisted && (
                        <Badge
                          variant="default"
                          className="ml-1.5 bg-blue-600 text-[10px]"
                        >
                          <Star className="mr-0.5 h-2.5 w-2.5" /> Meilleur prix
                        </Badge>
                      )}
                      {isRecommended && !isBest && (
                        <Badge
                          variant="outline"
                          className="ml-1.5 border-blue-300 text-[10px] text-blue-700"
                        >
                          Recommandé
                        </Badge>
                      )}
                    </p>
                    {s.properties.brand && (
                      <p className="truncate text-xs text-muted-foreground">
                        {s.properties.brand}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                      {s._etaMinutes != null && (
                        <span className="flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
                          <Clock className="h-2.5 w-2.5" />
                          Dans {formatDuration(s._etaMinutes)}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" />
                        {formatDistance(s._distAlongRoute)} sur le trajet
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      ↗️ {formatDistance(s._distFromRoute)} du trajet ·
                      +{Math.round(s._detourMinutes)} min détour
                    </p>
                  </div>

                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </a>
                </div>
              );
            })}
        </>
      )}
    </div>
  );
}

/* ─── Nearby Stations List (bottom sheet content) ────── */

function NearbyStationsList({
  stations,
  avgPrice,
  tankSize,
  sortMode,
  onSortChange,
  onStationTap,
}: {
  stations: EnrichedStation[];
  avgPrice: number | null;
  tankSize: number;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onStationTap: (s: EnrichedStation) => void;
}) {
  return (
    <div className="space-y-0 pb-6">
      {/* Controls */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {stations.length} station{stations.length !== 1 ? "s" : ""}
        </span>
        <Select
          value={sortMode}
          onValueChange={(v) => onSortChange(v as SortMode)}
        >
          <SelectTrigger className="h-7 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">💰 Prix</SelectItem>
            <SelectItem value="distance">📍 Distance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {stations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">
            Aucune station trouvée.
          </p>
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {stations.map((station, i) => {
            const props = station.properties;
            const costco = isCostco(station);
            const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${station._coords.lat},${station._coords.lng}`;

            const savings =
              station._price != null && avgPrice != null
                ? calcSavings(station._price, avgPrice, tankSize)
                : null;

            const netSavings =
              station._price != null && avgPrice != null
                ? calcNetSavings(station._price, avgPrice, tankSize, station._distance)
                : null;

            const isFar = station._distance > 15;

            const priceColorMap: Record<string, string> = {
              cheap: "bg-emerald-500",
              mid: "bg-amber-500",
              expensive: "bg-red-500",
            };

            const badgeBg = costco
              ? "bg-[#005DAA]"
              : station._blacklisted
                ? "bg-gray-700"
                : priceColorMap[station._colorClass] || "bg-amber-500";

            return (
              <div
                key={`${station._coords.lat}-${station._coords.lng}-${i}`}
                onClick={() => onStationTap(station)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
                  costco ? "border-blue-200 ring-1 ring-blue-100" : ""
                } ${station._blacklisted ? "border-amber-300 bg-amber-50/30" : ""}`}
              >
                {/* Price badge */}
                <div
                  className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-white ${badgeBg}`}
                >
                  {station._blacklisted && (
                    <span className="text-xs">⚠️</span>
                  )}
                  <span className="text-lg font-extrabold leading-tight">
                    {station._price != null ? station._price.toFixed(1) : "N/D"}
                  </span>
                  <span className="text-[10px] font-medium opacity-90">¢/L</span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{props.Name}</p>
                  {station._blacklisted && (
                    <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-50">
                      <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                      Prix potentiellement périmé
                    </Badge>
                  )}
                  {props.brand && (
                    <p className="truncate text-xs text-muted-foreground">
                      {props.brand}
                    </p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">
                    {props.Address || ""}
                  </p>
                  {savings !== null && Math.abs(savings) >= 0.25 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge
                        variant={savings > 0 ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {savings > 0
                          ? `Économie ${savings.toFixed(2)}$/plein`
                          : `+${Math.abs(savings).toFixed(2)}$/plein`}
                      </Badge>
                      {isFar && netSavings !== null && netSavings < savings && (
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                          <AlertTriangle className="mr-0.5 h-2.5 w-2.5" />
                          Net {netSavings > 0 ? `${netSavings.toFixed(2)}$` : "négatif"} après déplacement
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {station._distance != null
                      ? formatDistance(station._distance)
                      : ""}
                  </span>
                  <a
                    href={navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors hover:bg-blue-200"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
