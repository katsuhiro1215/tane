"use client";

import Image from "next/image";

import { appButtonVariants } from "@/components/app/button";
import { updateSettings, useSettings } from "@/lib/settings-store";
import { SOUND_ICONS } from "@/lib/spru-images";

export function SoundToggle() {
  const { se, bgm } = useSettings();
  const on = se || bgm;
  return (
    <button
      type="button"
      aria-label={on ? "おとを けす" : "おとを だす"}
      aria-pressed={on}
      onClick={() => updateSettings({ se: !on, bgm: !on })}
      className={appButtonVariants({ variant: "cream", size: "icon" })}
    >
      <Image src={on ? SOUND_ICONS.on : SOUND_ICONS.off} alt="" width={30} height={30} />
    </button>
  );
}
