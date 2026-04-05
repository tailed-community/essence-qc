import { Settings } from "lucide-react";
import { useApp } from "@/store";
import type { FuelType } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: "Régulier", label: "⛽ Régulier" },
  { value: "Super", label: "🔥 Super" },
  { value: "Diesel", label: "🛢️ Diesel" },
];

function QuebecFlag({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 9600 6400" xmlns="http://www.w3.org/2000/svg">
      <path fill="#fff" d="M0 0h9600v6400H0z"/>
      <g id="hb">
        <path fill="#003da5" d="M4000 0v2400H0V0zM2309 1622v-129h-115c0-66 32-130 66-150 20-17 65-25 104-5 51 29 54 113 28 151 243-45 219-280 136-365-67-69-140-79-196-58-128 46-214 199-218 427h-67c0-207 36-273 130-534 48-123 19-275-65-415-31-50-69-95-112-144-43 49-81 94-112 144-84 140-113 292-65 415 94 261 130 327 130 534h-67c-4-228-90-381-218-427-56-21-129-11-196 58-83 85-107 320 136 365-26-38-23-122 28-151 39-20 84-12 104 5 34 20 66 84 66 150h-115v129h239c-3 67-39 119-106 148 8 28 49 85 105 81 11 60 21 94 71 149 50-55 60-89 71-149 56 4 97-53 105-81-67-29-103-81-106-148z" id="ha"/>
        <use xlinkHref="#ha" x="5600"/>
      </g>
      <use xlinkHref="#hb" y="4000"/>
    </svg>
  );
}

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const { prefs, setPrefs } = useApp();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-[#003DA5] px-3 text-white shadow-md">
      <div className="flex items-center gap-2">
        <QuebecFlag className="h-7 w-7 rounded-sm" />
        <h1 className="text-lg font-bold tracking-tight">Essence QC</h1>
      </div>
      <div className="flex items-center gap-2">
        <Select
          value={prefs.fuelType}
          onValueChange={(v) => setPrefs({ fuelType: v as FuelType })}
        >
          <SelectTrigger className="h-9 w-[130px] border-white/25 bg-white/15 text-white text-sm font-semibold [&>svg]:text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FUEL_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 bg-white/15 text-white hover:bg-white/30"
          onClick={onOpenSettings}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
