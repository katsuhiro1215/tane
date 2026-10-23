"use client";

import { appButtonVariants } from "@/components/app/button";
import { useSound } from "@/components/app/sound-provider";
import { appendDigit, canSubmit, removeLastDigit } from "@/lib/game/answer-input";
import { cn } from "@/lib/utils";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  /** 打てる桁数。省略は4けた */
  maxLength?: number;
  /** キーの大きさ。省略は lg（通常の練習画面）。種が降ってくる画面など、上の表示に高さを譲りたいときは md */
  size?: "md" | "lg";
}

const DIGIT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];

export function NumericKeypad({ value, onChange, onSubmit, disabled, maxLength, size = "lg" }: NumericKeypadProps) {
  const { play } = useSound();
  function handleKeyPress(key: string) {
    if (disabled) {
      return;
    }
    if (key === "⌫") {
      play("cancel");
      onChange(removeLastDigit(value));
      return;
    }
    if (key === "OK") {
      if (canSubmit(value)) {
        onSubmit();
      }
      return;
    }
    play("key");
    onChange(appendDigit(value, key, maxLength));
  }

  return (
    <div className="grid w-full max-w-xs grid-cols-3 gap-2">
      {DIGIT_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKeyPress(key)}
          disabled={disabled || (key === "OK" && !canSubmit(value))}
          className={cn(appButtonVariants({ variant: key === "OK" ? "cta" : "cream", size }), "w-full")}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
