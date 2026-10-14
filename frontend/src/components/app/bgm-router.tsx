"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { useSound } from "@/components/app/sound-provider";
import { bgmTrackFor } from "@/lib/bgm-route";

export function BgmRouter() {
  const pathname = usePathname();
  const { playBgm } = useSound();

  useEffect(() => {
    playBgm(bgmTrackFor(pathname));
  }, [pathname, playBgm]);

  return null;
}
