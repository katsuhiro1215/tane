import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BGM_UNLOCK_EVENTS, createBgmController, type BgmAudio } from "@/lib/bgm-controller";
import type { BgmTrack } from "@/lib/bgm-route";

class FakeAudio implements BgmAudio {
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  playCalls = 0;
  constructor(
    public track: BgmTrack,
    private allow: () => boolean
  ) {}
  play() {
    this.playCalls += 1;
    if (!this.allow()) return Promise.reject(new Error("NotAllowedError"));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

function setup() {
  let allowed = false;
  const created: FakeAudio[] = [];
  const controller = createBgmController((track) => {
    const audio = new FakeAudio(track, () => allowed);
    created.push(audio);
    return audio;
  });
  return { controller, created, allow: () => (allowed = true) };
}

const flush = () => Promise.resolve().then(() => Promise.resolve());

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createBgmController", () => {
  it("鳴り始める前に同じ曲を何度頼んでも、Audio は1つだけ作る", async () => {
    const { controller, created } = setup();
    controller.setEnabled(true);
    controller.request("home");
    controller.request("home");
    controller.setEnabled(true);
    await flush();
    expect(created).toHaveLength(1);
  });

  it("拒否されたあと retry すると、同じ要素をもう一度鳴らす", async () => {
    const { controller, created, allow } = setup();
    controller.setEnabled(true);
    controller.request("home");
    await flush();
    expect(controller.isPlaying()).toBe(false);

    allow();
    controller.retry();
    await flush();
    expect(created).toHaveLength(1);
    expect(created[0].playCalls).toBe(2);
    expect(controller.isPlaying()).toBe(true);
  });

  it("OFFにすると止まり、ONで同じ曲をまた鳴らす", async () => {
    const { controller, created, allow } = setup();
    allow();
    controller.setEnabled(true);
    controller.request("quiz");
    await flush();
    controller.setEnabled(false);
    vi.runAllTimers();
    expect(created[0].paused).toBe(true);
    expect(controller.isPlaying()).toBe(false);

    controller.setEnabled(true);
    await flush();
    expect(controller.isPlaying()).toBe(true);
    expect(created.at(-1)?.track).toBe("quiz");
  });

  it("OFFのあいだは頼まれても鳴らさない", async () => {
    const { controller, created, allow } = setup();
    allow();
    controller.setEnabled(false);
    controller.request("home");
    controller.retry();
    await flush();
    expect(created).toHaveLength(0);
  });

  it("曲が変わったら前の曲を止めて新しい曲にする", async () => {
    const { controller, created, allow } = setup();
    allow();
    controller.setEnabled(true);
    controller.request("home");
    await flush();
    controller.request("quiz");
    await flush();
    vi.runAllTimers();
    expect(created.map((a) => a.track)).toEqual(["home", "quiz"]);
    expect(created[0].paused).toBe(true);
    expect(controller.isPlaying()).toBe(true);
  });
});

it("やり直しのきっかけは、タッチでも再生が許される操作にする（pointerdown はタッチでは許されない）", () => {
  expect(BGM_UNLOCK_EVENTS).toEqual(expect.arrayContaining(["touchend", "click", "keydown"]));
  expect(BGM_UNLOCK_EVENTS).not.toContain("pointerdown");
});
