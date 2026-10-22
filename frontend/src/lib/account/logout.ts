import type { Api } from "@/lib/account/api";
import { clearAuth, readAuth } from "@/lib/account/auth-store";
import { progressKeyFor, setProgressOwner } from "@/lib/progress-store";
import { PENDING_KEY } from "@/lib/sync/sync-engine";

/** api.logout() が失敗しても、端末側（トークン・プロフィールの記録・送っていない印）は必ず消す */
export async function logoutTane(api: Pick<Api, "logout">): Promise<void> {
  const auth = readAuth();
  try {
    await api.logout();
  } catch {
    // ログアウト自体は、サーバーに届かなくても端末側を進める
  }
  if (auth?.profileId !== null && auth?.profileId !== undefined) {
    try {
      window.localStorage.removeItem(progressKeyFor(auth.profileId));
    } catch {
      // 消せなくても遊ぶのに困らない
    }
  }
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    // 消せなくても遊ぶのに困らない
  }
  clearAuth();
  setProgressOwner(null);
}
