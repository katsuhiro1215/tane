import type { BgmTrack } from "@/lib/bgm-route";

export interface BgmAudio {
  loop: boolean;
  volume: number;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
}

// スマホのタッチは pointerdown では再生が許されず、touchend・click で初めて許される
export const BGM_UNLOCK_EVENTS = ["pointerup", "touchend", "click", "keydown"] as const;

const VOLUME = 0.35;
const FADE_IN_MS = 800;
const FADE_OUT_MS = 400;
const FADE_STEP_MS = 40;

interface Entry {
  track: BgmTrack;
  audio: BgmAudio;
  playing: boolean;
}

function fade(audio: BgmAudio, to: number, ms: number, done?: () => void) {
  const from = audio.volume;
  const steps = Math.max(1, Math.round(ms / FADE_STEP_MS));
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    audio.volume = Math.min(1, Math.max(0, from + ((to - from) * step) / steps));
    if (step >= steps) {
      clearInterval(timer);
      done?.();
    }
  }, FADE_STEP_MS);
}

/**
 * 鳴らしたい曲（request）と ON/OFF（setEnabled）から、実際の再生をそろえる。
 * 画面に触れる前は play() が拒否されるので、触れたときに retry() で同じ要素を鳴らし直す。
 */
export function createBgmController(createAudio: (track: BgmTrack) => BgmAudio) {
  let enabled = false;
  let wanted: BgmTrack | null = null;
  let current: Entry | null = null;

  function stopCurrent() {
    const entry = current;
    current = null;
    if (!entry) return;
    fade(entry.audio, 0, FADE_OUT_MS, () => {
      entry.audio.pause();
      entry.audio.currentTime = 0;
    });
  }

  function tryPlay(entry: Entry) {
    entry.audio
      .play()
      .then(() => {
        if (current !== entry) {
          entry.audio.pause();
          return;
        }
        if (entry.playing) return;
        entry.playing = true;
        fade(entry.audio, VOLUME, FADE_IN_MS);
      })
      .catch(() => {
        // 画面に触れる前は再生できない。retry() でやり直す
      });
  }

  function sync() {
    if (!enabled || !wanted) {
      stopCurrent();
      return;
    }
    if (current && current.track === wanted) {
      if (!current.playing) tryPlay(current);
      return;
    }
    stopCurrent();
    const audio = createAudio(wanted);
    audio.loop = true;
    audio.volume = 0;
    current = { track: wanted, audio, playing: false };
    tryPlay(current);
  }

  return {
    request(track: BgmTrack) {
      wanted = track;
      sync();
    },
    setEnabled(value: boolean) {
      enabled = value;
      sync();
    },
    retry() {
      if (enabled && current && !current.playing) tryPlay(current);
    },
    isPlaying() {
      return current?.playing ?? false;
    },
  };
}
