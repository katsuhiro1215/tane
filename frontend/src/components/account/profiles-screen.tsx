"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { TopBar } from "@/components/app/top-bar";
import { ClaimDialog } from "@/components/account/claim-dialog";
import { claimGuestProgress, needsClaim } from "@/lib/account/claim";
import { ApiError, createApi, type Profile } from "@/lib/account/api";
import { readAuth, saveAuth } from "@/lib/account/auth-store";
import { readGuestProgress } from "@/lib/progress-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_SPRA_API_URL ?? "https://api.go.spra.jp";

function api() {
  return createApi({ fetch: window.fetch.bind(window), baseUrl: API_BASE_URL, getToken: () => readAuth()?.token ?? null });
}

export function ProfilesScreen() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [newName, setNewName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pendingPlayer, setPendingPlayer] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api()
      .profiles()
      .then(setProfiles)
      .catch((e) => setMessage(e instanceof ApiError ? e.message : "つうしんに しっぱいしました"));
  }, []);

  function finalizeSelection(profile: Profile) {
    const auth = readAuth();
    if (!auth) return;
    saveAuth({ ...auth, profileId: profile.id, profileName: profile.name });
    router.push("/");
  }

  function chooseProfile(profile: Profile) {
    if (needsClaim(readGuestProgress())) {
      setPendingPlayer(profile);
      return;
    }
    finalizeSelection(profile);
  }

  async function onClaim(targetProfileId: number) {
    if (!pendingPlayer) return;
    setSubmitting(true);
    try {
      await claimGuestProgress(targetProfileId, { api: api() });
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "つうしんに しっぱいしました");
    } finally {
      setSubmitting(false);
      finalizeSelection(pendingPlayer);
      setPendingPlayer(null);
    }
  }

  function onSkipClaim() {
    if (!pendingPlayer) return;
    const player = pendingPlayer;
    setPendingPlayer(null);
    finalizeSelection(player);
  }

  async function createProfile() {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const created = await api().createProfile(newName.trim());
      setProfiles((current) => [...(current ?? []), created]);
      setNewName("");
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "つうしんに しっぱいしました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-10">
      <TopBar title="だれが あそぶ？" backHref="/" />
      <Panel className="flex flex-col gap-2">
        {profiles === null && <p className="text-center font-display font-black">よみこみちゅう…</p>}
        {profiles?.map((profile) => (
          <AppButton key={profile.id} size="lg" onClick={() => chooseProfile(profile)}>
            {profile.name}
          </AppButton>
        ))}
      </Panel>
      <Panel className="flex flex-col gap-3">
        <p className="font-display font-black">あたらしく つくる</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="なまえ"
            className="h-12 flex-1 rounded-2xl border-2 border-border bg-card px-4 text-base outline-none focus-visible:border-primary"
          />
          <AppButton variant="primary" disabled={submitting} onClick={createProfile}>
            つくる
          </AppButton>
        </div>
      </Panel>
      {message && <p className="text-center text-sm font-bold text-destructive">{message}</p>}
      {pendingPlayer && profiles && (
        <ClaimDialog profiles={profiles} submitting={submitting} onClaim={onClaim} onSkip={onSkipClaim} />
      )}
    </main>
  );
}
