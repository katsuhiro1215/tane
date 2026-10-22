import type { Api } from "@/lib/account/api";
import { MAX_PLAY_DAYS, clearGuestProgress, readGuestProgress, type Progress } from "@/lib/progress-store";
import { mergeProgress, toSynced } from "@/lib/sync/progress-merge";

/** ★・最高点・チャレンジ・エンドレス・遊んだ日のどれかがあれば、引き継ぐかどうかを聞く */
export function needsClaim(guest: Progress): boolean {
  return (
    Object.keys(guest.stars).length > 0 ||
    Object.keys(guest.best).length > 0 ||
    Object.keys(guest.challengeBest).length > 0 ||
    Object.keys(guest.endless).length > 0 ||
    guest.playDays.length > 0
  );
}

export interface ClaimDeps {
  api: Pick<Api, "getProgress" | "putProgress">;
}

/** ゲストの記録を、その子のサーバーの記録と合わせて送る。成功したらゲストを空にする */
export async function claimGuestProgress(profileId: number, deps: ClaimDeps): Promise<void> {
  const guest = readGuestProgress();
  if (!needsClaim(guest)) return;
  const current = await deps.api.getProgress(profileId);
  const merged = mergeProgress(toSynced(guest), current.progress);
  const playDays = [...new Set([...guest.playDays, ...current.playDays])].sort().slice(-MAX_PLAY_DAYS);
  await deps.api.putProgress(profileId, { progress: merged, playDays });
  clearGuestProgress();
}
