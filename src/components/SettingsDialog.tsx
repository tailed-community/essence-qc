import { useState, useRef, useEffect } from "react";
import { useApp } from "@/store";
import type { FuelType } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Home, Trash2, MapPin } from "lucide-react";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { prefs, setPrefs, clearHomeLocation, setHomeLocation } = useApp();
  const [showAddressInput, setShowAddressInput] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Setup Places Autocomplete on the address input
  useEffect(() => {
    if (!showAddressInput || !addressInputRef.current) return;
    if (typeof google === "undefined" || !google.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(
      addressInputRef.current,
      {
        componentRestrictions: { country: "ca" },
        fields: ["geometry", "formatted_address"],
      }
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place?.geometry?.location) {
        setHomeLocation(
          {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
          place.formatted_address || ""
        );
        setShowAddressInput(false);
      }
    });

    // Focus the input once visible
    addressInputRef.current.focus();

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [showAddressInput, setHomeLocation]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Paramètres</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Fuel type */}
          <div className="space-y-2">
            <Label>Type d'essence préféré</Label>
            <Select
              value={prefs.fuelType}
              onValueChange={(v) => setPrefs({ fuelType: v as FuelType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Régulier">⛽ Régulier</SelectItem>
                <SelectItem value="Super">🔥 Super</SelectItem>
                <SelectItem value="Diesel">🛢️ Diesel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Home address */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              Adresse de domicile
            </Label>
            {prefs.homeAddress ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-2">
                  <p className="min-w-0 truncate text-sm text-blue-800">
                    {prefs.homeAddress}
                  </p>
                  <button
                    onClick={clearHomeLocation}
                    className="shrink-0 rounded-md p-1.5 text-blue-400 transition-colors hover:bg-blue-100 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setShowAddressInput(true)}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Modifier l'adresse
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Définissez votre domicile pour centrer automatiquement la
                  carte à l'ouverture.
                </p>
                <button
                  onClick={() => setShowAddressInput(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Ajouter une adresse
                </button>
              </div>
            )}
            {showAddressInput && (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={addressInputRef}
                  type="text"
                  placeholder="Entrez votre adresse..."
                  className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-ring focus-visible:ring-2"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Costco member */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Membre Costco</Label>
              <p className="text-xs text-muted-foreground">
                Affiche les 3 Costco les plus proches
              </p>
            </div>
            <Switch
              checked={prefs.costcoMember}
              onCheckedChange={(v) => setPrefs({ costcoMember: v })}
            />
          </div>

          <Separator />

          {/* Tank size */}
          <div className="space-y-2">
            <Label>Taille du réservoir (litres)</Label>
            <Select
              value={String(prefs.tankSize)}
              onValueChange={(v) => setPrefs({ tankSize: parseInt(v ?? "50", 10) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="40">40 L</SelectItem>
                <SelectItem value="50">50 L</SelectItem>
                <SelectItem value="60">60 L</SelectItem>
                <SelectItem value="70">70 L</SelectItem>
                <SelectItem value="80">80 L</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">
            Données :{" "}
            <a
              href="https://regieessencequebec.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-blue-600 hover:underline"
            >
              Régie de l'énergie du Québec
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
