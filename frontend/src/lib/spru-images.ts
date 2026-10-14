import { SPRU_COLORS, type SpruColor } from "@/data/stages/colors";
import type { Growth } from "@/lib/game/stars";

export const GROWTHS: readonly Growth[] = ["seed", "sprout", "bud", "flower"];

export function growthImage(color: SpruColor, growth: Growth): string {
  return `/spru/growth/${color}/${growth}.webp`;
}

export const SPRU_POSES = {
  front: "/spru/basic/front.webp",
  cheer: "/spru/actions/cheer.webp",
  jump: "/spru/actions/jump.webp",
  wave: "/spru/actions/wave.webp",
  happy: "/spru/expressions/happy.webp",
  laugh: "/spru/expressions/laugh.webp",
  excited: "/spru/expressions/excited.webp",
  sad: "/spru/expressions/sad.webp",
  think: "/spru/expressions/think.webp",
} as const;

export type SpruPose = keyof typeof SPRU_POSES;

export const STAGE_BADGES = {
  locked: "/spru/stages/locked.webp",
  open: "/spru/stages/open.webp",
  cleared: "/spru/stages/cleared.webp",
} as const;

export const SOUND_ICONS = {
  on: "/spru/icons/sound-on.webp",
  off: "/spru/icons/sound-off.webp",
} as const;

export function allSpruImagePaths(): string[] {
  return [
    ...SPRU_COLORS.flatMap((color) => GROWTHS.map((growth) => growthImage(color, growth))),
    ...Object.values(SPRU_POSES),
    ...Object.values(STAGE_BADGES),
    ...Object.values(SOUND_ICONS),
  ];
}
