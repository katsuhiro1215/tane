import { describe, expect, it } from "vitest";

import { applyDamage, INITIAL_HP, isDefeated } from "@/lib/game/hp";

describe("applyDamage", () => {
  it("HPを1減らす", () => {
    expect(applyDamage(5)).toBe(4);
  });

  it("HPが0未満にはならない", () => {
    expect(applyDamage(0)).toBe(0);
  });

  it("amountを指定して複数減らせる", () => {
    expect(applyDamage(5, 3)).toBe(2);
  });
});

describe("isDefeated", () => {
  it("HPが0のときtrue", () => {
    expect(isDefeated(0)).toBe(true);
  });

  it("HPが1以上のときfalse", () => {
    expect(isDefeated(1)).toBe(false);
  });
});

describe("INITIAL_HP", () => {
  it("初期HPは5", () => {
    expect(INITIAL_HP).toBe(5);
  });
});
