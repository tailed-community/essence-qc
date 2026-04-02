import { formatPrice, formatDistance } from "@/lib/helpers";
import type { EnrichedStation } from "@/types";

interface CostcoBannerProps {
  stations: EnrichedStation[];
}

export function CostcoBanner({ stations }: CostcoBannerProps) {
  if (stations.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-3 overflow-x-auto bg-gradient-to-r from-[#005DAA] to-[#0071CE] px-4 py-2 text-sm text-white scrollbar-none">
      <span className="shrink-0 text-sm font-extrabold uppercase tracking-wide text-[#FFD700]">
        ★ Costco
      </span>
      {stations.map((s, i) => (
        <span
          key={i}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-sm font-semibold"
        >
          <span className="font-extrabold">{formatPrice(s._price)}</span>
          <span className="font-normal opacity-80">
            {formatDistance(s._distance)}
          </span>
        </span>
      ))}
    </div>
  );
}
