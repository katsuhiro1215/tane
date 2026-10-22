"use client";

import { AppButton } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import type { Profile } from "@/lib/account/api";

interface ClaimDialogProps {
  profiles: readonly Profile[];
  submitting: boolean;
  onClaim: (profileId: number) => void;
  onSkip: () => void;
}

/** この端末の、ログイン前の記録を誰のものにするか聞く画面 */
export function ClaimDialog({ profiles, submitting, onClaim, onSkip }: ClaimDialogProps) {
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-6">
      <Panel className="w-full max-w-sm">
        <p className="text-center font-display text-lg font-black">この たんまつの きろくを だれの ものに する？</p>
        <div className="mt-4 flex flex-col gap-2">
          {profiles.map((profile) => (
            <AppButton key={profile.id} disabled={submitting} onClick={() => onClaim(profile.id)}>
              {profile.name}
            </AppButton>
          ))}
          <AppButton variant="cream" disabled={submitting} onClick={onSkip}>
            つかわない
          </AppButton>
        </div>
      </Panel>
    </div>
  );
}
