export type BgmTrack = "home" | "quiz" | "fever";

export function bgmTrackFor(pathname: string): BgmTrack {
  return pathname.startsWith("/stage/") || pathname.startsWith("/flash/") ? "quiz" : "home";
}
