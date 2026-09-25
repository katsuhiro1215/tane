"use client";

import { useId } from "react";

export type SpruGrowthStage = "sprout" | "sapling" | "tree" | "bloom";

const STAGE_CONFIG: Record<
  SpruGrowthStage,
  { colorFrom: string; colorTo: string; scale: number; hasBloom: boolean }
> = {
  sprout: { colorFrom: "#86efac", colorTo: "#22c55e", scale: 0.7, hasBloom: false },
  sapling: { colorFrom: "#4ade80", colorTo: "#16a34a", scale: 0.85, hasBloom: false },
  tree: { colorFrom: "#22c55e", colorTo: "#15803d", scale: 1, hasBloom: false },
  bloom: { colorFrom: "#22c55e", colorTo: "#15803d", scale: 1, hasBloom: true },
};

export function SpruCharacter({
  stage,
  className,
}: {
  stage: SpruGrowthStage;
  className?: string;
}) {
  const gradientId = `spru-body-${useId()}`;
  const config = STAGE_CONFIG[stage];

  return (
    <div
      className={`animate-character-bounce ${className ?? ""}`}
      style={{ transform: `scale(${config.scale})` }}
    >
      <svg viewBox="0 0 120 150" className="h-full w-full drop-shadow-xl">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.colorFrom} />
            <stop offset="100%" stopColor={config.colorTo} />
          </linearGradient>
        </defs>

        <ellipse cx="60" cy="140" rx="30" ry="6" fill="black" opacity="0.15" />

        <path
          d="M60 42 C48 38 48 26 60 22 C72 18 72 6 60 4"
          stroke="#15803d"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        <path
          d="M60 34 C92 34 106 62 106 92 C106 122 86 138 60 138 C34 138 14 122 14 92 C14 62 28 34 60 34 Z"
          fill={`url(#${gradientId})`}
        />

        <circle cx="42" cy="90" r="6" fill="#14532d" />
        <circle cx="78" cy="90" r="6" fill="#14532d" />
        <circle cx="44" cy="88" r="2" fill="white" />
        <circle cx="80" cy="88" r="2" fill="white" />
        <path
          d="M45 106 Q60 118 75 106"
          stroke="#14532d"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />

        {config.hasBloom && (
          <>
            <circle cx="30" cy="50" r="8" fill="#f472b6" />
            <circle cx="90" cy="55" r="7" fill="#f472b6" />
          </>
        )}
      </svg>
    </div>
  );
}

export function growthStageFor(correctCount: number, totalCount: number): SpruGrowthStage {
  const ratio = totalCount === 0 ? 0 : correctCount / totalCount;
  if (ratio >= 0.9) {
    return "bloom";
  }
  if (ratio >= 0.6) {
    return "tree";
  }
  if (ratio >= 0.3) {
    return "sapling";
  }
  return "sprout";
}
