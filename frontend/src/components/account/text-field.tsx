import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, id, className, ...props }: TextFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1">
      <span className="font-display text-sm font-black text-muted-foreground">{label}</span>
      <input
        id={inputId}
        className={cn(
          "h-12 rounded-2xl border-2 border-border bg-card px-4 text-base text-card-foreground outline-none focus-visible:border-primary",
          className
        )}
        {...props}
      />
      {error && <span className="text-sm font-bold text-destructive">{error}</span>}
    </label>
  );
}
