"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type FormEvent } from "react";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { TopBar } from "@/components/app/top-bar";
import { ParentCard } from "@/components/account/parent-card";
import { TextField } from "@/components/account/text-field";
import { ApiError, createApi, type ParentRecords } from "@/lib/account/api";
import { readAuth } from "@/lib/account/auth-store";
import { EMPTY_PROGRESS } from "@/lib/progress-store";
import { parentSummary } from "@/lib/account/parent-summary";
import { todayJst } from "@/lib/sync/jst-date";
import { fromSynced } from "@/lib/sync/progress-merge";

const API_BASE_URL = process.env.NEXT_PUBLIC_SPRA_API_URL ?? "https://api.go.spra.jp";

function api() {
  return createApi({ fetch: window.fetch.bind(window), baseUrl: API_BASE_URL, getToken: () => readAuth()?.token ?? null });
}

export function ParentScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ParentRecords | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const result = await api().parentRecords();
      setRecords(result);
    } catch (e) {
      if (e instanceof ApiError && e.code === "terms_outdated") {
        router.push("/account/terms-consent");
        return;
      }
      // 15分を過ぎて確認が切れた（403）など。パスワードの入力に戻す
      setRecords(null);
      if (!(e instanceof ApiError && e.status === 403)) {
        setError(e instanceof ApiError ? e.message : "つうしんに しっぱいしました");
      }
    }
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api().confirmPassword(password);
      setPassword("");
      await loadRecords();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "つうしんに しっぱいしました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10">
      <TopBar title="ほごしゃの かたへ" backHref="/settings" />
      {!records && (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Panel className="flex flex-col gap-3">
            <p className="text-sm font-bold">かぞくの きろくを 見るには、パスワードを 入れてください。</p>
            <TextField
              label="パスワード"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm font-bold text-destructive">{error}</p>}
          </Panel>
          <AppButton type="submit" variant="cta" size="lg" disabled={submitting}>
            かくにん
          </AppButton>
        </form>
      )}
      {records?.profiles.map((profile) => (
        <ParentCard
          key={profile.id}
          name={profile.name}
          summary={parentSummary(fromSynced(profile.progress, EMPTY_PROGRESS), profile.playDays, todayJst())}
        />
      ))}
    </main>
  );
}
