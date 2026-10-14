export type BgmTrack = "home" | "quiz";

export function bgmTrackFor(pathname: string): BgmTrack {
  return pathname.startsWith("/stage/") || pathname.startsWith("/flash/") ? "quiz" : "home";
}
