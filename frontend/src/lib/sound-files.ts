import type { BgmTrack } from "@/lib/bgm-route";

export type SoundKey = "correct" | "incorrect" | "allCorrect" | "coin" | "select" | "key" | "cancel" | "levelUp" | "gauge" | "throw";

export const SOUND_FILES: Record<SoundKey, string> = {
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
  allCorrect: "/sounds/allCorrect.mp3",
  coin: "/sounds/coin.mp3",
  select: "/sounds/decide41.mp3",
  key: "/sounds/key.mp3",
  cancel: "/sounds/cancel.mp3",
  levelUp: "/sounds/levelup.mp3",
  gauge: "/sounds/gauge.mp3",
  throw: "/sounds/throw.mp3",
};

export const BGM_FILES: Record<BgmTrack, string> = {
  home: "/sounds/bgm-tane-home.mp3",
  quiz: "/sounds/bgm-tane-play.mp3",
  fever: "/sounds/bgm-tane-fever.mp3",
};
