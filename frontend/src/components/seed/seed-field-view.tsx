import Image from "next/image";

import type { SpruColor } from "@/data/stages/colors";
import { SEED_LANES, type Seed } from "@/lib/game/seed-field";
import { growthImage } from "@/lib/spru-images";
import { cn } from "@/lib/utils";

const SEED_PX = 84;
const DANGER_FROM = 0.8;

/** 花が咲いた場所（正解した種があったところ） */
export interface Bloom {
  key: number;
  lane: number;
  progress: number;
}

const laneLeft = (lane: number) => `calc(${((lane + 0.5) / SEED_LANES) * 100}% - ${SEED_PX / 2}px)`;
const seedTop = (progress: number) => `calc((100% - ${SEED_PX}px) * ${Math.min(1, progress)})`;

/** 種が降ってくる畑。種をタップすると onTap(id)。地面に着くと失敗（判定は seed-run） */
export function SeedFieldView({
  seeds,
  blooms,
  color,
  onTap,
  disabled,
}: {
  seeds: readonly Seed[];
  blooms: readonly Bloom[];
  color: SpruColor;
  onTap: (seedId: number) => void;
  disabled: boolean;
}) {
  return (
    <div
      data-testid="seed-field"
      className="relative mx-4 min-h-56 flex-1 overflow-hidden rounded-3xl bg-gradient-to-b from-[#dff3ff] to-[#f4fbe6]"
    >
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-3 bg-[#8fce6a]" />
      {blooms.map((bloom) => (
        <span
          key={bloom.key}
          aria-hidden
          className="pointer-events-none absolute animate-grow-in"
          style={{ left: laneLeft(bloom.lane), top: seedTop(bloom.progress), width: SEED_PX, height: SEED_PX }}
        >
          <Image src={growthImage(color, "flower")} alt="" width={84} height={105} className="h-full w-full object-contain" />
        </span>
      ))}
      {seeds.map((seed) => (
        <button
          key={seed.id}
          type="button"
          disabled={disabled}
          aria-label={seed.problem.text}
          data-testid="seed"
          data-answer={seed.problem.answer}
          onClick={() => onTap(seed.id)}
          className={cn(
            "absolute grid place-items-center rounded-full border-b-4 font-display text-[19px] leading-none font-black text-white shadow-md active:scale-95",
            seed.progress >= DANGER_FROM ? "border-[#8f1d2c] bg-[#e5483f]" : "border-[#5e3a17] bg-[#9a6a35]"
          )}
          style={{ left: laneLeft(seed.lane), top: seedTop(seed.progress), width: SEED_PX, height: SEED_PX }}
        >
          <span className="px-1 text-center whitespace-nowrap">{seed.problem.text}</span>
        </button>
      ))}
    </div>
  );
}
