"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { MODE_IDS, MODES, type ModeId } from "@/data/stages/catalog";
import { cn } from "@/lib/utils";

// メインの「たねまき」を先頭に出す（MODE_IDS の順は、色や「つづきから」の順に使うので変えない）
const TAB_ORDER: readonly ModeId[] = ["shisoku", ...MODE_IDS.filter((id) => id !== "shisoku")];

export function ModeTabs({ current }: { current: ModeId }) {
  const currentRef = useRef<HTMLAnchorElement>(null);

  // タブが6つになって横にはみ出すので、選ばれているタブが見える位置までスクロールしておく
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [current]);

  return (
    <nav
      aria-label="あそび"
      className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TAB_ORDER.map((id) => (
        <Link
          key={id}
          ref={id === current ? currentRef : undefined}
          href={`/mode/${id}`}
          aria-current={id === current ? "page" : undefined}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 font-display text-[11px] font-black",
            id === current ? "bg-primary text-primary-foreground" : "bg-card text-primary"
          )}
        >
          {MODES[id].label}
        </Link>
      ))}
    </nav>
  );
}
