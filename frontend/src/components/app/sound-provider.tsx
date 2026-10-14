"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { BGM_UNLOCK_EVENTS, createBgmController } from "@/lib/bgm-controller";
import type { BgmTrack } from "@/lib/bgm-route";
import { BGM_FILES, SOUND_FILES, type SoundKey } from "@/lib/sound-files";
import { readSettings, useSettings } from "@/lib/settings-store";

interface SoundContextValue {
  play: (key: SoundKey) => void;
  playBgm: (track: BgmTrack) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const { bgm } = useSettings();
  const audioCache = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});
  // Audio は request されたときに初めて作るので、サーバーで描いても new Audio は呼ばれない
  const [controller] = useState(() => createBgmController((track) => new Audio(BGM_FILES[track])));

  // 描画直後の bgm はサーバーの既定値(ON)のことがあるため、保存された設定を直接読む
  useEffect(() => {
    controller.setEnabled(readSettings().bgm);
  }, [bgm, controller]);

  useEffect(() => {
    const retry = () => controller.retry();
    for (const type of BGM_UNLOCK_EVENTS) window.addEventListener(type, retry, { capture: true });
    return () => {
      for (const type of BGM_UNLOCK_EVENTS) window.removeEventListener(type, retry, { capture: true });
    };
  }, [controller]);

  const play = useCallback((key: SoundKey) => {
    if (!readSettings().se) return;
    let audio = audioCache.current[key];
    if (!audio) {
      audio = new Audio(SOUND_FILES[key]);
      audioCache.current[key] = audio;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {
      // 効果音は演出の付け足しなので、鳴らなくても止めない
    });
  }, []);

  const playBgm = useCallback((track: BgmTrack) => controller.request(track), [controller]);

  return <SoundContext.Provider value={{ play, playBgm }}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound は SoundProvider の内側で使う");
  }
  return context;
}
