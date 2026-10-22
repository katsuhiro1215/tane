"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createApi } from "@/lib/account/api";
import { readAuth, saveAuth, useAuth } from "@/lib/account/auth-store";
import { loginEnabled } from "@/lib/account/flags";
import { setProgressOwner, useProgress } from "@/lib/progress-store";
import { createSyncEngine } from "@/lib/sync/sync-engine";

const API_BASE_URL = process.env.NEXT_PUBLIC_SPRA_API_URL ?? "https://api.go.spra.jp";

/** プロフィールを外し、記録の持ち主をゲストへ戻す（トークンは消さない。ほかの端末のログインは生きている） */
function dropProfile() {
  const current = readAuth();
  if (current) saveAuth({ ...current, profileId: null, profileName: null });
  setProgressOwner(null);
}

/**
 * ログイン中、記録をサーバーと同期する。ログインしていない・NEXT_PUBLIC_TANE_LOGIN が off のときは何もしない。
 * ブラウザだけのふるまい（visibilitychange・online・DOM）なので、ユニットテストは持たず
 * Playwright の確認（計画の Task 6）で確かめる。
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const progress = useProgress();
  const engineRef = useRef<ReturnType<typeof createSyncEngine> | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!loginEnabled()) return;
    engineRef.current = createSyncEngine({
      api: createApi({ fetch: window.fetch.bind(window), baseUrl: API_BASE_URL, getToken: () => readAuth()?.token ?? null }),
      now: () => new Date(),
      setTimeout: window.setTimeout.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      // 401：トークンが切れた。端末の記録は残したまま、ログインへ案内する
      onUnauthorized: () => {
        engineRef.current?.stop();
        dropProfile();
        router.push("/account/login");
      },
      // 403／404：家族でなくなった・消えたプロフィール。選び直してもらう
      onProfileGone: () => {
        engineRef.current?.stop();
        dropProfile();
        router.push("/account/profiles");
      },
    });
    return () => engineRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loginEnabled()) return;
    if (!auth || auth.profileId === null) {
      // ログアウト・401・403 のあと、持ち主を外した状態。送り続けないように必ず止める
      engineRef.current?.stop();
      return;
    }
    void engineRef.current?.start(auth.profileId);
    // auth 全体ではなく token・profileId の変化だけで始め直したい（名前が変わっただけでは始め直さない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, auth?.profileId]);

  useEffect(() => {
    // 最初の1回（マウント直後）は「変わった」扱いにしない
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!loginEnabled() || !auth || auth.profileId === null) return;
    engineRef.current?.notifyChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, auth?.profileId]);

  useEffect(() => {
    if (!loginEnabled()) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void engineRef.current?.flush();
    };
    const onOnline = () => void engineRef.current?.flush();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return <>{children}</>;
}

