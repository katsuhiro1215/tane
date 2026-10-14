import Link from "next/link";

import { MODE_IDS, MODES, type ModeId } from "@/data/stages/catalog";
import { cn } from "@/lib/utils";

export function ModeTabs({ current }: { current: ModeId }) {
  return (
    <nav aria-label="あそび" className="flex justify-center gap-1.5 px-3 py-2">
      {MODE_IDS.map((id) => (
        <Link
          key={id}
          href={`/mode/${id}`}
          aria-current={id === current ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-full px-2.5 py-1 font-display text-[11px] font-black",
            id === current ? "bg-primary text-primary-foreground" : "bg-card text-primary"
          )}
        >
          {MODES[id].label}
        </Link>
      ))}
    </nav>
  );
}
