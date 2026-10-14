import type { Stars } from "@/lib/game/stars";
import { cn } from "@/lib/utils";

const SIZE = { sm: "text-[10px]", md: "text-xl", lg: "text-4xl" } as const;

export function StarsRow({
  stars,
  size = "md",
  animate = false,
}: {
  stars: Stars;
  size?: keyof typeof SIZE;
  animate?: boolean;
}) {
  return (
    <span className={cn("inline-flex leading-none", SIZE[size])} role="img" aria-label={`ほし ${stars}こ`}>
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden
          className={cn(n <= stars ? "text-accent" : "text-cream-edge", animate && n <= stars && "animate-pop-in")}
          style={animate ? { animationDelay: `${n * 180}ms` } : undefined}
        >
          ★
        </span>
      ))}
    </span>
  );
}
