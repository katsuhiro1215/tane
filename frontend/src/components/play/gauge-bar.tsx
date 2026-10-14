import { cn } from "@/lib/utils";

export function GaugeBar({ gauge, feverLeft }: { gauge: number; feverLeft: number }) {
  const fever = feverLeft > 0;
  return (
    <div
      role="img"
      aria-label={fever ? `フィーバー あと${feverLeft}もん` : `ゲージ ${gauge}`}
      className="flex flex-1 items-center gap-2"
    >
      <span className={cn("font-display text-xs font-black", fever ? "text-[#ffe14d]" : "text-primary")}>
        {fever ? "FEVER" : "ゲージ"}
      </span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/70">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            fever ? "bg-linear-to-r from-[#ff3d8b] to-[#ffe14d]" : "bg-linear-to-r from-leaf to-accent"
          )}
          style={{ width: `${fever ? 100 : gauge}%` }}
        />
      </div>
      {fever && <span className="font-display text-xs font-black whitespace-nowrap text-white">あと{feverLeft}もん</span>}
    </div>
  );
}
