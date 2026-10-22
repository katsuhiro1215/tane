"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { TextField } from "@/components/account/text-field";
import { ApiError, createApi, deviceName } from "@/lib/account/api";
import { saveAuth } from "@/lib/account/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_SPRA_API_URL ?? "https://api.go.spra.jp";
const NEEDS_PASSWORD_RESET = "Spra Go の せっていで パスワードを きめてね";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const [disabled, setDisabled] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setEmailError(undefined);
    setMessage(null);
    setNeedsPasswordReset(false);
    try {
      const api = createApi({ fetch: window.fetch.bind(window), baseUrl: API_BASE_URL, getToken: () => null });
      const result = await api.login(email, password, deviceName());
      saveAuth({ token: result.token, user: result.user, profileId: null, profileName: null });
      router.push("/account/profiles");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 403) {
          setDisabled(true);
        } else if (e.message === NEEDS_PASSWORD_RESET) {
          setNeedsPasswordReset(true);
        } else if (e.errors) {
          setEmailError(e.message);
        } else {
          setMessage(e.message);
        }
      } else {
        setMessage("つうしんに しっぱいしました");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (disabled) {
    return (
      <Panel>
        <p className="font-display text-lg font-black text-primary">ログインは まだ つかえないよ</p>
      </Panel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <TextField
          label="メールアドレス"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        <TextField
          label="パスワード"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {message && <p className="text-sm font-bold text-destructive">{message}</p>}
        {needsPasswordReset && (
          <p className="text-sm font-bold text-destructive">
            Spra Go の せっていで パスワードを きめてね。
            <a
              href="https://go.spra.jp/forgot-password"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              パスワードを きめる
            </a>
          </p>
        )}
      </Panel>
      <AppButton type="submit" variant="cta" size="lg" disabled={submitting}>
        ログイン
      </AppButton>
    </form>
  );
}
