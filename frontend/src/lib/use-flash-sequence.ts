"use client";

import { useEffect, useRef, useState } from "react";

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
  const [prevSequence, setPrevSequence] = useState(sequence);
  const phaseRef = useRef<FlashPhase>("flashing");

  // sequenceが変わった(次の問題に進んだ)瞬間に、レンダー中にstateを
  // INITIAL_STATEへ同期的に揃える(Reactの「レンダー中にpropsの変化に
  // 合わせてstateを調整する」公式パターン)。useEffect + setTimeout経由の
  // リセットだと、次の数列の最初のタイマーが発火するまでの数msのあいだ
  // 前の問題の"answering"状態(=キーパッドが有効)のまま表示されてしまう
  // 窓ができるため、レンダー中に同期的に揃える必要がある。
  if (sequence !== prevSequence) {
    setPrevSequence(sequence);
    setState(INITIAL_STATE);
  }

  useEffect(() => {
    let cancelled = false;
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];

    function updateState(next: FlashSequenceState) {
      if (cancelled) {
        return;
      }
      phaseRef.current = next.phase;
      setState(next);
    }

    function schedule() {
      timeoutIds.forEach(clearTimeout);
      timeoutIds = [];
      let elapsed = 0;

      sequence.forEach((value, index) => {
        timeoutIds.push(
          setTimeout(() => updateState({ phase: "flashing", currentNumber: value, index }), elapsed)
        );
        elapsed += stepMs;

        timeoutIds.push(
          setTimeout(() => updateState({ phase: "flashing", currentNumber: null, index }), elapsed)
        );
        elapsed += gapMs;
      });

      timeoutIds.push(
        setTimeout(
          () => updateState({ phase: "answering", currentNumber: null, index: sequence.length }),
          elapsed
        )
      );
    }

    schedule();

    // タブが非表示の間はsetTimeoutが大幅に遅延・スロットルされ、復帰時に
    // 溜まったタイマーが一気に消化されて数字が実質見えないまま表示が
    // 終わってしまう(子供向けアプリで「アプリを切り替えて戻ってくる」のは
    // 日常的な操作)。表示中に非表示→再表示された場合は数列を最初から
    // やり直す。
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && phaseRef.current === "flashing") {
        schedule();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      timeoutIds.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sequence, stepMs, gapMs]);

  return state;
}
