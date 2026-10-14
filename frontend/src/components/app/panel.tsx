import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border-b-[6px] border-cream-edge bg-card p-4 text-card-foreground shadow-[0_8px_22px_rgba(40,70,90,0.16)]",
        className
      )}
      {...props}
    />
  );
}
