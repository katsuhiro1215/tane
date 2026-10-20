export type BgmTrack = "home" | "quiz" | "fever";

const PLAY_PREFIXES = ["/stage/", "/flash/", "/challenge/", "/soroban/"];

export function bgmTrackFor(pathname: string): BgmTrack {
  return PLAY_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ? "quiz" : "home";
}
