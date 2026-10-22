import type { Api } from "@/lib/account/api";
import { clearAuth, readAuth } from "@/lib/account/auth-store";
import { clearAllProfileProgress, readProgressFor, setProgressOwner } from "@/lib/progress-store";
import { PENDING_KEY } from "@/lib/sync/sync-engine";
import { toSynced } from "@/lib/sync/progress-merge";

/** ログアウトの前に、送っていない記録があれば試しに送る。失敗しても、ログアウトは進める */
async function tryFlush(api: Pick<Api, "putProgress">, profileId: number): Promise<void> {
  try {
    const local = readProgressFor(profileId);
    await api.putProgress(profileId, { progress: toSynced(local), playDays: [...local.playDays] });
  } catch {
    // 送れなくても、次にログインしたときに合わさるので進める
  }
}

/** api.logout() が失敗しても、端末側（トークン・プロフィールごとの記録・送っていない印）は必ず消す */
export async function logoutTane(api: Pick<Api, "logout" | "putProgress">): Promise<void> {
  const auth = readAuth();
  if (auth?.profileId !== null && auth?.profileId !== undefined) {
    await tryFlush(api, auth.profileId);
  }
  try {
    await api.logout();
  } catch {
    // ログアウト自体は、サーバーに届かなくても端末側を進める
  }
  clearAllProfileProgress();
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // 消せなくても遊ぶのに困らない
  }
  clearAuth();
  setProgressOwner(null);
}
