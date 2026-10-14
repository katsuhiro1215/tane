"use client";

import { appButtonVariants } from "@/components/app/button";
import { appendDigit, canSubmit, removeLastDigit } from "@/lib/game/answer-input";
import { cn } from "@/lib/utils";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const DIGIT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"];

export function NumericKeypad({ value, onChange, onSubmit, disabled }: NumericKeypadProps) {
  function handleKeyPress(key: string) {
    if (disabled) {
      return;
    }
    if (key === "⌫") {
      onChange(removeLastDigit(value));
      return;
    }
    if (key === "OK") {
      if (canSubmit(value)) {
        onSubmit();
      }
      return;
    }
    onChange(appendDigit(value, key));
  }

  return (
    <div className="grid w-full max-w-xs grid-cols-3 gap-2">
      {DIGIT_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKeyPress(key)}
          disabled={disabled || (key === "OK" && !canSubmit(value))}
          className={cn(appButtonVariants({ variant: key === "OK" ? "cta" : "cream", size: "lg" }), "w-full")}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
