"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { STAGES } from "@/data/problems/stages";
import { isStageUnlocked } from "@/lib/game/progress";
import { getClearedStageIds } from "@/lib/storage";

export default function HomePage() {
  const [clearedIds, setClearedIds] = useState<string[]>([]);

  useEffect(() => {
    setClearedIds(getClearedStageIds());
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Tane</h1>
      <ul className="flex flex-col gap-2">
        {STAGES.map((stage) => {
          const unlocked = isStageUnlocked(stage.id, STAGES, clearedIds);
          const cleared = clearedIds.includes(stage.id);
          return (
            <li key={stage.id}>
              {unlocked ? (
                <Link
                  href={`/stage/${stage.id}`}
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
    </main>
  );
}
