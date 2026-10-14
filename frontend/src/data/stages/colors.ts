export const SPRU_COLORS = [
  "spru",
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

export const REGULAR_COLORS: readonly SpruColor[] = [
  "spru",
  "emerald",
  "gold",
  "amber",
  "ruby",
  "sapphire",
  "pearl",
  "silver",
];
