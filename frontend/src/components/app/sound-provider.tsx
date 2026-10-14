"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

import type { BgmTrack } from "@/lib/bgm-route";
import { BGM_FILES, SOUND_FILES, type SoundKey } from "@/lib/sound-files";
import { useSettings } from "@/lib/settings-store";

const BGM_VOLUME = 0.35;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 400;
const FADE_STEP_MS = 40;

interface SoundContextValue {
  play: (key: SoundKey) => void;
  playBgm: (track: BgmTrack) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function fadeAudio(audio: HTMLAudioElement, to: number, ms: number, done?: () => void) {
  const from = audio.volume;
  const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
  let step = 0;
  const timer = window.setInterval(() => {
    step += 1;
    audio.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / steps));
    if (step >= steps) {
      window.clearInterval(timer);
      done?.();
    }
  }, FADE_STEP_MS);
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const { se, bgm } = useSettings();
  const audioCache = useRef<Partial<Record<SoundKey, HTMLAudioElement>>>({});
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmTrackRef = useRef<BgmTrack | null>(null);
  const bgmPlayingRef = useRef(false);

  const stopBgmAudio = useCallback(() => {
    const audio = bgmAudioRef.current;
    bgmAudioRef.current = null;
    bgmPlayingRef.current = false;
    if (!audio) return;
    fadeAudio(audio, 0, FADE_OUT_MS, () => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  const startBgmAudio = useCallback(
    (track: BgmTrack) => {
      stopBgmAudio();
      const audio = new Audio(BGM_FILES[track]);
      audio.loop = true;
      audio.volume = 0;
      bgmAudioRef.current = audio;
      audio
        .play()
        .then(() => {
          if (bgmAudioRef.current !== audio) {
            audio.pause();
            return;
          }
          bgmPlayingRef.current = true;
          fadeAudio(audio, BGM_VOLUME, FADE_IN_MS);
        })
        .catch(() => {
          // 画面に触れる前は再生できない。下の pointerdown でやり直す
        });
    },
    [stopBgmAudio]
  );

  useEffect(() => {
    if (!bgm) {
      stopBgmAudio();
      return;
    }
    if (bgmTrackRef.current && !bgmPlayingRef.current) startBgmAudio(bgmTrackRef.current);
  }, [bgm, startBgmAudio, stopBgmAudio]);

  // スマホは画面に触れるまで音を出せない。2回目以降はタイトルが無いので、最初のタップで鳴らし直す
  useEffect(() => {
    function retry() {
      if (bgm && bgmTrackRef.current && !bgmPlayingRef.current) startBgmAudio(bgmTrackRef.current);
    }
    window.addEventListener("pointerdown", retry);
    return () => window.removeEventListener("pointerdown", retry);
  }, [bgm, startBgmAudio]);

  const play = useCallback(
    (key: SoundKey) => {
      if (!se) return;
      let audio = audioCache.current[key];
      if (!audio) {
        audio = new Audio(SOUND_FILES[key]);
        audioCache.current[key] = audio;
      }
      audio.currentTime = 0;
      audio.play().catch(() => {
        // 効果音は演出の付け足しなので、鳴らなくても止めない
      });
    },
    [se]
  );

  const playBgm = useCallback(
    (track: BgmTrack) => {
      const alreadyPlaying = bgmTrackRef.current === track && bgmPlayingRef.current;
      bgmTrackRef.current = track;
      if (!bgm || alreadyPlaying) return;
      startBgmAudio(track);
    },
    [bgm, startBgmAudio]
  );

  return <SoundContext.Provider value={{ play, playBgm }}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSound は SoundProvider の内側で使う");
  }
  return context;
}
