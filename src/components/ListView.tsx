import { useState } from "react";
import { useApp } from "@/store";
import {
  formatDistance,
  calcSavings,
  calcNetSavings,
  isCostco,
} from "@/lib/helpers";
import type { EnrichedStation, SortMode } from "@/types";
import { StationDetailDialog } from "@/components/StationDetailDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Navigation, MapPin, Search, AlertTriangle } from "lucide-react";

export function ListView() {
  const { nearby, prefs, avgPrice, sortMode, setSortMode } = useApp();
  const [selectedStation, setSelectedStation] =
    useState<EnrichedStation | null>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex shrink-0 items-center justify-between border-b bg-white px-4 py-2.5">
        <span className="text-sm font-medium text-muted-foreground">
          {nearby.length} station{nearby.length !== 1 ? "s" : ""}
        </span>
        <Select
          value={sortMode}
          onValueChange={(v) => setSortMode(v as SortMode)}
        >
          <SelectTrigger className="h-8 w-[140px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price">💰 Prix</SelectItem>
            <SelectItem value="distance">📍 Distance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {nearby.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aucune station trouvée dans ce rayon.
              <br />
              Essayez d'augmenter le rayon de recherche.
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {nearby.map((station, i) => (
              <StationCard
                key={`${station._coords.lat}-${station._coords.lng}-${i}`}
                station={station}
                avgPrice={avgPrice}
                tankSize={prefs.tankSize}
                onClick={() => setSelectedStation(station)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <StationDetailDialog
        station={selectedStation}
        fuelType={prefs.fuelType}
        avgPrice={avgPrice}
        tankSize={prefs.tankSize}
        onOpenChange={(open) => {
          if (!open) setSelectedStation(null);
        }}
      />
    </div>
  );
}

function StationCard({
  station,
  avgPrice,
  tankSize,
  onClick,
}: {
  station: EnrichedStation;
  avgPrice: number | null;
  tankSize: number;
  onClick: () => void;
}) {
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

  const priceColorMap = {
    cheap: "bg-emerald-500",
    mid: "bg-amber-500",
    expensive: "bg-red-500",
  };

  const badgeBg = costco
    ? "bg-[#005DAA]"
    : priceColorMap[station._colorClass] || "bg-amber-500";

  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        costco ? "border-blue-200 ring-1 ring-blue-100" : ""
      }`}
    >
      {/* Price badge */}
      <div
        className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-2 text-white ${badgeBg}`}
      >
        <span className="text-lg font-extrabold leading-tight">
          {station._price != null ? station._price.toFixed(1) : "N/D"}
        </span>
        <span className="text-[10px] font-medium opacity-90">¢/L</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{props.Name}</p>
        {props.brand && (
          <p className="truncate text-xs text-muted-foreground">
            {props.brand}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {props.Address || ""}
        </p>
        {savings !== null && Math.abs(savings) >= 0.25 && (
          <div className="flex flex-wrap items-center gap-1 mt-1">
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
}
