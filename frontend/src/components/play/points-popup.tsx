import type { LastGain } from "@/components/play/use-speed-play";
import { cn } from "@/lib/utils";

/** 正解したときに「+150」を飛び出させる。key が変わるたびに動きが最初から始まる */
export function PointsPopup({ gain }: { gain: LastGain | null }) {
  if (!gain) return null;
  return (
    <span
      key={gain.key}
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/4 left-1/2 animate-float-up font-display font-black whitespace-nowrap",
        gain.doubled ? "text-4xl text-[#ff3d8b]" : "text-3xl text-cta-to"
      )}
    >
      +{gain.amount}
      {gain.doubled && " ×2"}
    </span>
  );
}
