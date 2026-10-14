import { Medal as MedalIcon } from "lucide-react";

import type { Medal } from "@/lib/game/challenge-rules";
import { cn } from "@/lib/utils";

export const MEDAL_LABELS: Record<Medal, string> = { bronze: "どう", silver: "ぎん", gold: "きん" };

const MEDAL_STYLES: Record<Medal, string> = {
  bronze: "border-[#a8683a] bg-[#e8ad7a]",
  silver: "border-[#8f9ba5] bg-[#dfe5ea]",
  gold: "border-[#c98f12] bg-[#ffd84d]",
};

export function MedalBadge({ medal, size = "md" }: { medal: Medal; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      role="img"
      aria-label={`${MEDAL_LABELS[medal]}メダル`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border-b-[3px] font-display font-black text-[#5a3b12]",
        MEDAL_STYLES[medal],
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-0.5 text-sm",
        size === "lg" && "animate-pop-in px-5 py-1.5 text-2xl"
      )}
    >
      <MedalIcon className={size === "lg" ? "h-7 w-7" : "h-4 w-4"} strokeWidth={2.5} />
      {MEDAL_LABELS[medal]}
    </span>
  );
}
