"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { BottomNav } from "@/components/app/bottom-nav";
import { AppButton } from "@/components/app/button";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Panel } from "@/components/app/panel";
import { resetProgress } from "@/lib/progress-store";
import { updateSettings, useSettings } from "@/lib/settings-store";
import { cn } from "@/lib/utils";

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between font-display font-black">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-8 w-14 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
      >
        <span
          className={cn(
            "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left]",
            checked ? "left-7" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const { se, bgm } = useSettings();
  const [confirming, setConfirming] = useState(false);
  const closeDialog = useCallback(() => setConfirming(false), []);

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 pt-4 pb-24">
      <h1 className="font-display text-2xl font-black text-primary">せってい</h1>
      <Panel className="flex flex-col gap-4">
        <ToggleRow label="こうかおん" checked={se} onChange={(value) => updateSettings({ se: value })} />
        <ToggleRow label="BGM" checked={bgm} onChange={(value) => updateSettings({ bgm: value })} />
      </Panel>
      <Panel>
        <p className="text-sm font-bold">きろくを けすと、★と そだてた なかまが ぜんぶ なくなります。</p>
        <AppButton variant="warning" className="mt-3 w-full" onClick={() => setConfirming(true)}>
          きろくを けす
        </AppButton>
      </Panel>
      {confirming && (
        <ConfirmDialog
          message="ほんとうに けしますか？"
          confirmLabel="けす"
          cancelLabel="やめる"
          onConfirm={() => {
            resetProgress();
            router.push("/");
          }}
          onCancel={closeDialog}
        />
      )}
      <BottomNav />
    </main>
  );
}
