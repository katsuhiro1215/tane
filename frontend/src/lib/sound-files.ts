import type { BgmTrack } from "@/lib/bgm-route";

export type SoundKey = "correct" | "incorrect" | "allCorrect" | "coin" | "select";

export const SOUND_FILES: Record<SoundKey, string> = {
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
  allCorrect: "/sounds/allCorrect.mp3",
  coin: "/sounds/coin.mp3",
  select: "/sounds/decide41.mp3",
};

export const BGM_FILES: Record<BgmTrack, string> = {
  home: "/sounds/bgm-home.mp3",
  quiz: "/sounds/bgm-quiz.mp3",
  fever: "/sounds/bgm-minigame.mp3",
};
