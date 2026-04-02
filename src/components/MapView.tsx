import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useApp } from "@/store";
import { GOOGLE_MAPS_API_KEY, MAP_ID, DEFAULT_ZOOM } from "@/lib/maps-config";
import { calculateRoute, findStationsAlongRoute } from "@/lib/routing";
import type { OSRMRoute } from "@/lib/routing";
import type { EnrichedStation, RouteStation, LatLng } from "@/types";
import {
  formatPrice,
  formatDistance,
  formatDuration,
  priceColor,
  isCostco,
  priceColorClass,
} from "@/lib/helpers";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";

type SheetState = "collapsed" | "peek" | "expanded";

export function MapView() {
  const { stations, nearby, userLocation, prefs } = useApp();
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
  const [showSettings, setShowSettings] = useState(false);

  const isRouteMode = route != null;

  const doSearch = useCallback(
    async (dest: LatLng) => {
      if (!userLocation) return;
      setSearching(true);
      setError(null);
      setSelectedNearbyStation(null);

      try {
        const r = await calculateRoute(userLocation, dest);
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
        setRouteStations(found);
        setSheetState("peek");
      } catch (err) {
        setError((err as Error).message || "Erreur de calcul de trajet");
      } finally {
        setSearching(false);
      }
    },
    [userLocation, stations, prefs.fuelType, autonomyKm]
  );

  const clearRoute = useCallback(() => {
    setRoute(null);
    setDestination(null);
    setRouteStations([]);
    setSelectedRouteStation(null);
    setSheetState("collapsed");
    setError(null);
  }, []);

  // Re-filter when autonomy changes
  useEffect(() => {
    if (!route || !userLocation) return;
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
    setRouteStations(found);
  }, [autonomyKm, route, stations, prefs.fuelType, userLocation]);

  const cycleSheet = useCallback(() => {
    setSheetState((prev) => {
      if (prev === "collapsed") return "peek";
      if (prev === "peek") return "expanded";
      return "collapsed";
    });
  }, []);

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
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={["places"]}>
      <div className="relative h-full w-full">
        {/* ── Full-screen map ──────────────────────── */}
        <div className="absolute inset-0">
          <MapContent
            userLocation={userLocation}
            destination={destination}
            route={route}
            routeStations={routeStations}
            nearbyStations={nearby}
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
          />
        </div>

        {/* ── Floating search bar (top overlay) ───── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3">
          <div className="pointer-events-auto mx-auto max-w-lg space-y-2">
            <div className="rounded-xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
              <div className="p-3">
                <PlacesAutocompleteInput
                  onSelect={(loc) => doSearch(loc)}
                  searching={searching}
                  onClear={isRouteMode ? clearRoute : undefined}
                />
              </div>

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
              userLocation={userLocation}
              destination={destination}
              onStationTap={(s) => {
                setSelectedRouteStation(s);
                setSelectedNearbyStation(null);
                setSheetState("collapsed");
              }}
            />
          </BottomSheet>
        )}
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
}: {
  onSelect: (loc: LatLng) => void;
  searching: boolean;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const autocomplete = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "ca" },
      fields: ["geometry", "formatted_address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        onSelect({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [places, onSelect]);

  const handleClear = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }, [onClear]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Entrez une destination pour planifier un trajet..."
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
}: {
  userLocation: LatLng | null;
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
}) {
  const center = useMemo(
    () =>
      userLocation
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : { lat: 45.5017, lng: -73.5673 },
    [userLocation]
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
          const colorCls = priceColorClass(
            s._price,
            Math.min(...routeStations.map((x) => x._price)),
            Math.max(...routeStations.map((x) => x._price))
          );
          const bgColor = costco ? "#005DAA" : priceColor(colorCls);
          const borderColor = costco ? "#FFD700" : "white";

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
                {formatPrice(s._price)}
              </div>
            </AdvancedMarker>
          );
        })}

      {/* ── Nearby station markers (no route) ──── */}
      {!isRouteMode &&
        nearbyStations.map((station, i) => {
          const costco = isCostco(station);
          const bgColor = costco ? "#005DAA" : priceColor(station._colorClass);
          const borderColor = costco ? "#FFD700" : "white";

          return (
            <AdvancedMarker
              key={`nearby-${station._coords.lat}-${station._coords.lng}-${i}`}
              position={{
                lat: station._coords.lat,
                lng: station._coords.lng,
              }}
              onClick={() => onNearbyStationClick(station)}
            >
              <div
                className="cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-bold text-white shadow-md transition-transform hover:scale-110"
                style={{
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                }}
              >
                {formatPrice(station._price)}
              </div>
            </AdvancedMarker>
          );
        })}

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
                  ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ""}&destination=${destination.lat},${destination.lng}&waypoints=${selectedRouteStation._coords.lat},${selectedRouteStation._coords.lng}&travelmode=driving`
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

      {/* Auto-fit: route bounds or user location */}
      {route ? <RouteAutoFit route={route} /> : <MapAutoFit />}
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

function MapAutoFit() {
  const map = useMap();
  const { userLocation } = useApp();

  const fitBounds = useCallback(() => {
    if (!map || !userLocation) return;
    map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
  }, [map, userLocation]);

  useMemo(() => {
    fitBounds();
  }, [fitBounds]);

  return null;
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

  const cheapestPrice =
    routeStations.length > 0
      ? Math.min(...routeStations.map((s) => s._price))
      : null;

  const bestStation = routeStations.find((s) => s._price === cheapestPrice);
  const gmapsTripUrl =
    userLocation && destination
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${destination.lat},${destination.lng}${bestStation ? `&waypoints=${bestStation._coords.lat},${bestStation._coords.lng}` : ""}&travelmode=driving`
      : null;

  const recommended = [...routeStations]
    .sort((a, b) => {
      const scoreA = a._price + a._detourMinutes * 2;
      const scoreB = b._price + b._detourMinutes * 2;
      return scoreA - scoreB;
    })
    .slice(0, 3);

  const recommendedSet = new Set(
    recommended.map((s) => `${s._coords.lat}-${s._coords.lng}`)
  );

  const prices = routeStations.map((st) => st._price);
  const minP = routeStations.length > 0 ? Math.min(...prices) : 0;
  const maxP = routeStations.length > 0 ? Math.max(...prices) : 0;

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
                  } ${isBest ? "ring-2 ring-blue-200" : ""} ${isRecommended ? "border-blue-100" : ""}`}
                >
                  <div
                    className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-white ${badgeBg}`}
                  >
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
                      {isBest && (
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
