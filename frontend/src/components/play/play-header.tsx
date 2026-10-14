import Link from "next/link";
import { X } from "lucide-react";

import { appButtonVariants } from "@/components/app/button";
import { HpGauge } from "@/components/hp-gauge";
import { INITIAL_HP } from "@/lib/game/hp";

export function PlayHeader({ backHref, hp, index, total }: { backHref: string; hp: number; index: number; total: number }) {
  return (
    <header className="flex items-center gap-2 px-3 pt-3">
      <Link href={backHref} aria-label="やめる" className={appButtonVariants({ variant: "cream", size: "icon" })}>
        <X className="h-6 w-6" strokeWidth={3} />
      </Link>
      <HpGauge value={hp} max={INITIAL_HP} />
      <span className="ml-auto rounded-full border-b-[3px] border-cream-edge bg-card px-3 py-1 font-display text-sm font-black">
        {index} / {total}
      </span>
    </header>
  );
}
