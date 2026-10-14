import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// 下の縁を太くして立体に見せ、押すと沈む（Spra Go の AppButton と同じ作り）
export const appButtonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-display font-black transition-[transform,border-width] active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        cta: "border-b-[5px] border-cta-edge bg-linear-to-b from-cta-from to-cta-to text-white active:border-b-2",
        primary: "border-b-4 border-leaf-dark bg-primary text-primary-foreground active:border-b-2",
        cream: "border-2 border-b-4 border-cream-edge bg-card text-primary active:border-b-2",
        warning: "border-b-4 border-[#c98f12] bg-accent text-accent-foreground active:border-b-2",
        locked: "border-b-4 border-[#dccfb4] bg-muted text-muted-foreground",
      },
      size: {
        sm: "h-10 px-3 text-sm",
        md: "h-12 px-5 text-base",
        lg: "h-14 px-6 text-xl",
        xl: "h-16 px-8 text-2xl",
        icon: "h-11 w-11 p-0",
      },
    },
    defaultVariants: { variant: "cream", size: "md" },
  }
);

export interface AppButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof appButtonVariants> {}

export function AppButton({ className, variant, size, type = "button", ...props }: AppButtonProps) {
  return <button type={type} className={cn(appButtonVariants({ variant, size }), className)} {...props} />;
}
