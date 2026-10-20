export const SPRU_COLORS = [
  "spru",
  "lumi",
  "momo",
  "kuru",
  "ruru",
  "saku",
  "lavi",
  "piko",
  "rosa",
  "fuji",
  "lili",
  "higa",
  "mira",
  "tuli",
  "nemu",
  "dali",
  "iris",
  "nera",
  "coco",
  "mari",
  "vio",
  "mimo",
  "came",
  "emerald",
  "gold",
  "amber",
  "ruby",
  "sapphire",
  "pearl",
  "silver",
  "crystal",
  "platinum",
  "obsidian",
] as const;

export type SpruColor = (typeof SPRU_COLORS)[number];

/** ふだんのなかま。ステージの最初のほうは、ノーマルから出す */
export const NORMAL_COLORS: readonly SpruColor[] = [
  "spru", "lumi", "momo", "kuru", "ruru", "saku", "lavi",
  "piko", "rosa", "fuji", "lili", "higa", "mira", "tuli", "nemu", "dali", "iris", "nera", "coco", "mari", "vio", "mimo", "came",
];

/** レア（宝石の色）。4つ目のステージから、4つごとに混ぜる */
export const RARE_COLORS: readonly SpruColor[] = ["emerald", "gold", "amber", "ruby", "sapphire", "pearl", "silver"];

const RARE_FROM = 3;
const RARE_EVERY = 4;

/**
 * mode 番目のあそびの index 番目（0始まり）のステージの色。
 * 1〜3つ目はノーマル、4・8・12つ目はレア（12つ目のボスは別の色）、あとはノーマル。あそびごとに出だしをずらして、同じ並びにならないようにする
 */
export function colorForStage(mode: number, index: number): SpruColor {
  const isRare = index >= RARE_FROM && (index - RARE_FROM) % RARE_EVERY === 0;
  if (isRare) {
    const rareNumber = Math.floor((index - RARE_FROM) / RARE_EVERY);
    return RARE_COLORS[(mode * 2 + rareNumber) % RARE_COLORS.length];
  }
  const normalNumber = index - (index >= RARE_FROM ? Math.floor((index - RARE_FROM) / RARE_EVERY) + 1 : 0);
  return NORMAL_COLORS[(mode + normalNumber) % NORMAL_COLORS.length];
}
