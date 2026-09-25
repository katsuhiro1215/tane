"use client";

import { useEffect, useState } from "react";

export type FlashPhase = "flashing" | "answering";

interface FlashSequenceState {
  phase: FlashPhase;
  currentNumber: number | null;
  index: number; // 現在表示中の要素のインデックス。表示していない間は-1
}

const INITIAL_STATE: FlashSequenceState = {
  phase: "flashing",
  currentNumber: null,
  index: -1,
};

export function useFlashSequence(
  sequence: number[],
  stepMs: number,
  gapMs: number
): FlashSequenceState {
  const [state, setState] = useState<FlashSequenceState>(INITIAL_STATE);

  useEffect(() => {
    // 全タイマーをマウント時にまとめて予約する。setStateはすべて
    // setTimeoutのコールバック内(非同期)で呼ばれ、エフェクト本体から
    // 同期的には呼ばない(react-hooks/set-state-in-effectを踏まないため。
    // storage.tsのuseSyncExternalStore移行時に学んだのと同種の注意点)。
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    // リセットも他のsetStateと同様setTimeout経由(delay 0)で行う。
    // 同じdelayのタイマーは登録順に実行されるため、これが最初の
    // 「数字を表示する」タイマーより必ず先に実行される。
    timeoutIds.push(
      setTimeout(() => {
        setState(INITIAL_STATE);
      }, 0)
    );

    sequence.forEach((value, index) => {
      timeoutIds.push(
        setTimeout(() => {
          setState({ phase: "flashing", currentNumber: value, index });
        }, elapsed)
      );
      elapsed += stepMs;

      timeoutIds.push(
        setTimeout(() => {
          setState({ phase: "flashing", currentNumber: null, index });
        }, elapsed)
      );
      elapsed += gapMs;
    });

    timeoutIds.push(
      setTimeout(() => {
        setState({ phase: "answering", currentNumber: null, index: sequence.length });
      }, elapsed)
    );

    return () => {
      timeoutIds.forEach(clearTimeout);
    };
  }, [sequence, stepMs, gapMs]);

  return state;
}
