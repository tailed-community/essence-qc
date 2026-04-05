import type { EnrichedStation } from "@/types";
import type { StationPrice } from "@/types";
import { formatDistance } from "@/lib/helpers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Navigation, MapPin, AlertTriangle, ShieldCheck } from "lucide-react";

interface StationDetailDialogProps {
  station: EnrichedStation | null;
  fuelType: string;
  avgPrice: number | null;
  tankSize: number;
  onOpenChange: (open: boolean) => void;
  onToggleBlacklist?: (lat: number, lng: number) => void;
  isBlacklisted?: (lat: number, lng: number) => boolean;
}

export function StationDetailDialog({
  station,
  fuelType,
  avgPrice,
  tankSize,
  onOpenChange,
  onToggleBlacklist,
  isBlacklisted,
}: StationDetailDialogProps) {
  if (!station) return null;

  const props = station.properties;
  const prices = props.Prices || [];
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${station._coords.lat},${station._coords.lng}`;
  const blacklisted = isBlacklisted?.(station._coords.lat, station._coords.lng) ?? false;

  const savings =
    station._price != null && avgPrice != null
      ? ((avgPrice - station._price) / 100) * tankSize
      : null;

  return (
    <Dialog open={!!station} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{props.Name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {props.brand && (
            <p className="text-sm text-muted-foreground">{props.brand}</p>
          )}

          {blacklisted && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">Prix potentiellement périmé</span>
            </div>
          )}

          {station._distance != null && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {formatDistance(station._distance)}
            </div>
          )}

          {/* Price list */}
          <div className="space-y-1.5">
            {prices.map((p: StationPrice) => {
              const isSelected = p.GasType === fuelType;
              return (
                <div
                  key={p.GasType}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    isSelected ? "bg-blue-50 font-semibold" : ""
                  }`}
                >
                  <span className="text-muted-foreground">{p.GasType}</span>
                  {p.IsAvailable ? (
                    <span
                      className={
                        isSelected ? "text-blue-700 font-bold" : "font-semibold"
                      }
                    >
                      {p.Price}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">N/D</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Savings */}
          {savings !== null && Math.abs(savings) >= 0.25 && (
            <Badge
              variant={savings > 0 ? "default" : "destructive"}
              className="text-sm"
            >
              {savings > 0
                ? `Économie ${savings.toFixed(2)}$/plein`
                : `+${Math.abs(savings).toFixed(2)}$/plein`}
            </Badge>
          )}

          {props.Address && (
            <p className="text-xs text-muted-foreground">{props.Address}</p>
          )}

          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Navigation className="h-4 w-4" />
            Itinéraire Google Maps
          </a>

          {/* Blacklist toggle */}
          {onToggleBlacklist && (
            <button
              onClick={() => onToggleBlacklist(station._coords.lat, station._coords.lng)}
              className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                blacklisted
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100"
              }`}
            >
              {blacklisted ? (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Retirer le signalement
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Signaler un prix périmé
                </>
              )}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
