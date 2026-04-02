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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { prefs, setPrefs } = useApp();

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

          {/* Radius */}
          <div className="space-y-2">
            <Label>Rayon de recherche</Label>
            <Select
              value={String(prefs.radius)}
              onValueChange={(v) => setPrefs({ radius: parseInt(v ?? "10", 10) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 km</SelectItem>
                <SelectItem value="10">10 km</SelectItem>
                <SelectItem value="25">25 km</SelectItem>
                <SelectItem value="50">50 km</SelectItem>
              </SelectContent>
            </Select>
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
