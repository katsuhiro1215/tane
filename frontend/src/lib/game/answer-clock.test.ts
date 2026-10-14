import { beforeEach, describe, expect, it } from "vitest";

import { createAnswerClock } from "@/lib/game/answer-clock";

let t = 0;
const clock = () => createAnswerClock(() => t);

beforeEach(() => {
  t = 0;
});

describe("createAnswerClock", () => {
  it("start から stop までの時間を返す", () => {
    const c = clock();
    c.start();
    t = 1500;
    expect(c.stop()).toBe(1500);
  });

  it("止めている間（ページが隠れている間）は数えない", () => {
    const c = clock();
    c.start();
    t = 1000;
    c.pause();
    t = 61_000;
    c.resume();
    t = 61_500;
    expect(c.stop()).toBe(1500);
  });

  it("pause・resume を二重に呼んでも、測っていないときに呼んでも安全", () => {
    const c = clock();
    c.pause();
    c.resume();
    c.start();
    t = 1000;
    c.pause();
    c.pause();
    t = 2000;
    c.resume();
    c.resume();
    t = 2500;
    expect(c.stop()).toBe(1500);
  });

  it("peek は止めずに今までの時間を返す。stop のあとは0", () => {
    const c = clock();
    expect(c.peek()).toBe(0);
    c.start();
    t = 700;
    expect(c.peek()).toBe(700);
    t = 900;
    expect(c.stop()).toBe(900);
    expect(c.peek()).toBe(0);
    expect(c.stop()).toBe(0);
  });

  it("start をもう一度呼ぶと0から測り直す", () => {
    const c = clock();
    c.start();
    t = 5000;
    c.start();
    t = 5300;
    expect(c.stop()).toBe(300);
  });
});
