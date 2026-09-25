"use client";

import Link from "next/link";

import { isStageUnlocked, type StageLike } from "@/lib/game/progress";

interface StageListItem extends StageLike {
  title: string;
}

export function StageListSection({
  title,
  stages,
  clearedIds,
  hrefPrefix,
}: {
  title: string;
  stages: StageListItem[];
  clearedIds: string[];
  hrefPrefix: string;
}) {
  return (
    <section className="rounded-[28px] border-[6px] border-[#6B4226] bg-primary p-4 shadow-[0_6px_0_#3f2717]">
      <h2
        className="mb-3 text-center text-lg text-primary-foreground"
        style={{ fontFamily: "var(--font-hachi)" }}
      >
        {title}
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {stages.map((stage) => {
          const unlocked = isStageUnlocked(stage.id, stages, clearedIds);
          const cleared = clearedIds.includes(stage.id);
          return (
            <li key={stage.id} className="relative">
              {unlocked ? (
                <Link
                  href={`${hrefPrefix}/${stage.id}`}
                  className="flex min-h-16 items-center justify-center rounded-2xl border-b-4 border-border bg-secondary px-2 py-3 text-center text-sm font-bold text-secondary-foreground transition active:translate-y-[2px] active:border-b-[2px]"
                >
                  {stage.title}
                </Link>
              ) : (
                <div className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-b-4 border-[#7A6650] bg-muted px-2 py-3 text-center text-sm font-bold text-muted-foreground">
                  <span>{stage.title}</span>
                  <span aria-label="未解放" className="text-xs">
                    🔒
                  </span>
                </div>
              )}
              {cleared && (
                <span
                  aria-label="クリア済み"
                  className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#C98A1B] bg-accent text-sm shadow-[0_2px_0_#C98A1B]"
                >
                  ⭐
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
