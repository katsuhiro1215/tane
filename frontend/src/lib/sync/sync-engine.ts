import { ApiError, type Api } from "@/lib/account/api";
import { readProgress, setProgressOwner, writeProgress } from "@/lib/progress-store";
import { fromSynced, mergeProgress, toSynced } from "@/lib/sync/progress-merge";

const PENDING_KEY = "tane:sync:v1";
const NOTIFY_DELAY_MS = 2000;

function readPending(): number[] {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === "number") : [];
  } catch {
    return [];
  }
}

function writePending(ids: number[]) {
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(ids));
  } catch {
    // 保存できなくても、この回の送信そのものは続けられる
  }
}

function markPending(profileId: number) {
  const ids = readPending();
  if (!ids.includes(profileId)) writePending([...ids, profileId]);
}

function clearPending(profileId: number) {
  writePending(readPending().filter((id) => id !== profileId));
}

export interface SyncEngineDeps {
  api: Api;
  now: () => Date;
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
  /** 401：トークンが切れた。端末の記録は残したまま、ログインへ案内する */
  onUnauthorized?: () => void;
  /** 403／404：このプロフィールが自分の家族でない・消えた。「だれがあそぶ？」へ戻す */
  onProfileGone?: () => void;
}

export function createSyncEngine(deps: SyncEngineDeps) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let currentProfileId: number | null = null;

  function cancelTimer() {
    if (timer !== null) {
      deps.clearTimeout(timer);
      timer = null;
    }
  }

  async function flush(): Promise<void> {
    cancelTimer();
    const profileId = currentProfileId;
    if (profileId === null) return;
    const local = readProgress();
    try {
      const response = await deps.api.putProgress(profileId, {
        progress: toSynced(local),
        playDays: [...local.playDays],
      });
      // 送っている間にも遊べるので、今の端末の記録と、サーバーが返した（合わせ済みの）記録をもう一度合わせる
      const afterSend = readProgress();
      const merged = mergeProgress(toSynced(afterSend), response.progress);
      writeProgress(fromSynced(merged, afterSend));
      clearPending(profileId);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          deps.onUnauthorized?.();
          return;
        }
        if (e.status === 403 || e.status === 404) {
          deps.onProfileGone?.();
          return;
        }
        // 429・それ以外のサーバーエラーは、未送信のまま残す（すぐには自分で送り直さない）
      }
      markPending(profileId);
    }
  }

  function notifyChanged(): void {
    if (currentProfileId === null) return;
    cancelTimer();
    timer = deps.setTimeout(() => {
      timer = null;
      void flush();
    }, NOTIFY_DELAY_MS);
  }

  async function start(profileId: number): Promise<void> {
    cancelTimer();
    currentProfileId = profileId;
    setProgressOwner(profileId);
    const local = readProgress();
    try {
      const response = await deps.api.getProgress(profileId);
      const merged = mergeProgress(toSynced(local), response.progress);
      writeProgress(fromSynced(merged, local));
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          deps.onUnauthorized?.();
          return;
        }
        if (e.status === 403 || e.status === 404) {
          deps.onProfileGone?.();
          return;
        }
      }
      // つながらなくても、端末の記録のまま遊び続けられる
    }
    if (readPending().includes(profileId)) await flush();
  }

  function stop(): void {
    cancelTimer();
    currentProfileId = null;
  }

  return { start, notifyChanged, flush, stop };
}
