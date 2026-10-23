"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { ApiError, createApi } from "@/lib/account/api";
import { readAuth, saveAuth } from "@/lib/account/auth-store";
import { logoutTane } from "@/lib/account/logout";

const API_BASE_URL = process.env.NEXT_PUBLIC_SPRA_API_URL ?? "https://api.go.spra.jp";

function api() {
  return createApi({ fetch: window.fetch.bind(window), baseUrl: API_BASE_URL, getToken: () => readAuth()?.token ?? null });
}

const SUMMARY_LINES = [
  "Spra Go と Tane（べつのアプリ）で、おなじアカウントを つかえるようになります",
  "どのアプリを つかっているか、いつ つかいはじめたかを きろくします",
  "あそんだ きろくは、アプリごとに べつべつに ほぞんします",
  "アカウントを けすと、すべてのアプリの きろくが きえます",
];

export function TermsConsentScreen() {
  const router = useRouter();
  const [version, setVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  function loadVersion() {
    return api()
      .getUser()
      .then((user) => setVersion(user.termsVersionCurrent))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.push("/account/login");
          return;
        }
        setMessage(e instanceof ApiError ? e.message : "つうしんに しっぱいしました");
      });
  }

  useEffect(() => {
    void loadVersion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onAccept() {
    if (!version) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await api().acceptTerms(version);
      const auth = readAuth();
      if (auth) saveAuth({ ...auth, user: { ...auth.user, termsOutdated: false } });
      window.dispatchEvent(new Event("tane:terms-accepted"));
      router.push("/account/profiles");
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setMessage("きまりが さらに かわったみたい。いまの きまりを もう一度 よみこむよ。");
        setVersion(null);
        void loadVersion();
      } else {
        setMessage(e instanceof ApiError ? e.message : "つうしんに しっぱいしました");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDecline() {
    if (!window.confirm("どういしないと ログアウトします。おくっていない きろくは きえます。よろしいですか？")) return;
    setSubmitting(true);
    try {
      await logoutTane(api());
    } finally {
      setSubmitting(false);
      setLoggedOut(true);
    }
  }

  if (loggedOut) {
    return (
      <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10">
        <Panel className="flex flex-col gap-3">
          <p className="font-display text-lg font-black text-primary">ログアウトしました</p>
          <p className="text-sm font-bold">
            アカウントの さくじょは、info@spra.jp へ れんらくしてください。
          </p>
        </Panel>
        <Link href="/account/login" className="text-center text-sm font-bold underline">
          ログイン画面へ もどる
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10">
      <Panel className="flex flex-col gap-3">
        <p className="font-display text-lg font-black text-primary">きまりが かわります</p>
        <ul className="flex flex-col gap-2 text-sm font-bold">
          {SUMMARY_LINES.map((line) => (
            <li key={line}>・{line}</li>
          ))}
        </ul>
        <p className="text-sm">
          <a href="https://go.spra.jp/terms" target="_blank" rel="noreferrer" className="underline">
            りようきやく
          </a>
          ・
          <a href="https://go.spra.jp/privacy" target="_blank" rel="noreferrer" className="underline">
            プライバシーポリシー
          </a>
          の ぜんぶんは こちら
        </p>
        {message && <p className="text-sm font-bold text-destructive">{message}</p>}
      </Panel>
      <AppButton variant="cta" size="lg" disabled={submitting || !version} onClick={onAccept}>
        どういする
      </AppButton>
      <AppButton variant="cream" size="lg" disabled={submitting} onClick={onDecline}>
        どういしない
      </AppButton>
    </main>
  );
}
