import { describe, expect, it } from "vitest";

import { columnValue, emptyColumn, tapOne, toggleFive } from "@/lib/game/abacus";

describe("emptyColumn", () => {
  it("0から始まる", () => {
    expect(columnValue(emptyColumn())).toBe(0);
  });
});

describe("toggleFive", () => {
  it("ごだまを動かすと+5、もう一度で戻る", () => {
    const withFive = toggleFive(emptyColumn());
    expect(columnValue(withFive)).toBe(5);
    expect(columnValue(toggleFive(withFive))).toBe(0);
  });
});

describe("tapOne", () => {
  it("rank番目をタップすると、そこまでのいちだまが動く", () => {
    expect(columnValue(tapOne(emptyColumn(), 3))).toBe(3);
  });

  it("動いている範囲の中をタップすると、そこまで戻る", () => {
    const three = tapOne(emptyColumn(), 3);
    expect(columnValue(tapOne(three, 3))).toBe(2);
    expect(columnValue(tapOne(three, 1))).toBe(0);
  });

  it("ごだま+いちだまで9まで作れる", () => {
    const column = tapOne(toggleFive(emptyColumn()), 4);
    expect(columnValue(column)).toBe(9);
  });
});
