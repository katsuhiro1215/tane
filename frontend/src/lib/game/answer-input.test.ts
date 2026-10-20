import { describe, expect, it } from "vitest";

import {
  appendDigit,
  canSubmit,
  MAX_ANSWER_LENGTH,
  removeLastDigit,
} from "@/lib/game/answer-input";

describe("appendDigit", () => {
  it("数字を末尾に追加する", () => {
    expect(appendDigit("1", "2")).toBe("12");
  });

  it("数字以外の文字は無視する", () => {
    expect(appendDigit("1", "a")).toBe("1");
    expect(appendDigit("1", "-")).toBe("1");
  });

  it(`${MAX_ANSWER_LENGTH}桁を超える入力は無視する`, () => {
    const maxed = "9".repeat(MAX_ANSWER_LENGTH);
    expect(appendDigit(maxed, "9")).toBe(maxed);
  });
});

describe("removeLastDigit", () => {
  it("末尾の1文字を削除する", () => {
    expect(removeLastDigit("123")).toBe("12");
  });

  it("空文字の場合は空文字のまま", () => {
    expect(removeLastDigit("")).toBe("");
  });
});

describe("canSubmit", () => {
  it("空文字はsubmitできない", () => {
    expect(canSubmit("")).toBe(false);
  });

  it("1文字以上ならsubmitできる", () => {
    expect(canSubmit("0")).toBe(true);
  });
});

describe("appendDigit の桁数の上限", () => {
  it("上限を渡せる（そろばんは7けた）", () => {
    expect(appendDigit("123456", "7", 7)).toBe("1234567");
    expect(appendDigit("1234567", "8", 7)).toBe("1234567");
  });

  it("省略すると今までどおり4けた", () => {
    expect(appendDigit("1234", "5")).toBe("1234");
  });
});
