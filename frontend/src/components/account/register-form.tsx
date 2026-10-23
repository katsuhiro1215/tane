"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { TextField } from "@/components/account/text-field";
import { ApiError, createApi, deviceName, type Registration } from "@/lib/account/api";
import { saveAuth } from "@/lib/account/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_SPRA_API_URL ?? "https://api.go.spra.jp";

export function RegisterForm() {
  const router = useRouter();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const api = createApi({ fetch: window.fetch.bind(window), baseUrl: API_BASE_URL, getToken: () => null });
    api
      .registration()
      .then((data) => {
        setRegistration(data);
        // おやすみ中は、フォームを出さずにお知らせだけにする（計画Task4）
        if (!data.open) setDisabled(true);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) setDisabled(true);
      });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setErrors({});
    try {
      const api = createApi({ fetch: window.fetch.bind(window), baseUrl: API_BASE_URL, getToken: () => null });
      const result = await api.register(
        {
          name,
          email,
          password,
          passwordConfirmation,
          terms,
          ...(registration?.inviteRequired ? { inviteCode } : {}),
        },
        deviceName()
      );
      saveAuth({ token: result.token, user: result.user, profileId: null, profileName: null });
      router.push(result.user.termsOutdated ? "/account/terms-consent" : "/account/profiles");
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 403) {
          setDisabled(true);
        } else if (e.errors) {
          setErrors(e.errors);
          setMessage(e.message);
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
        <p className="font-display text-lg font-black text-primary">とうろくは まだ つかえないよ</p>
      </Panel>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Panel className="flex flex-col gap-3">
        <TextField label="なまえ" name="name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name?.[0]} />
        <TextField
          label="メールアドレス"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email?.[0]}
        />
        <TextField
          label="パスワード"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password?.[0]}
        />
        <TextField
          label="パスワード（かくにん）"
          type="password"
          name="password_confirmation"
          autoComplete="new-password"
          required
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
        />
        {registration?.inviteRequired && (
          <TextField
            label="しょうたいコード"
            name="invite_code"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            error={errors.invite_code?.[0]}
          />
        )}
        <label className="flex items-center gap-2 font-display text-sm font-black">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} required />
          <span>
            <a href="https://go.spra.jp/terms" target="_blank" rel="noreferrer" className="underline">
              利用規約
            </a>
            と
            <a href="https://go.spra.jp/privacy" target="_blank" rel="noreferrer" className="underline">
              プライバシーポリシー
            </a>
            に同意します
          </span>
        </label>
        {message && <p className="text-sm font-bold text-destructive">{message}</p>}
      </Panel>
      <AppButton type="submit" variant="cta" size="lg" disabled={submitting || !terms}>
        とうろく
      </AppButton>
    </form>
  );
}
