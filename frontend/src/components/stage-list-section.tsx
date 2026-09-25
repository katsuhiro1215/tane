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
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {stages.map((stage) => {
          const unlocked = isStageUnlocked(stage.id, stages, clearedIds);
          const cleared = clearedIds.includes(stage.id);
          return (
            <li key={stage.id}>
              {unlocked ? (
                <Link
                  href={`${hrefPrefix}/${stage.id}`}
                  className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-secondary-foreground"
                >
                  <span>{stage.title}</span>
                  {cleared && <span aria-label="クリア済み">✅</span>}
                </Link>
              ) : (
                <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-muted-foreground">
                  <span>{stage.title}</span>
                  <span aria-label="未解放">🔒</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
