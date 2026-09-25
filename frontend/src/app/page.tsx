"use client";

import { StageListSection } from "@/components/stage-list-section";
import { FLASH_STAGES } from "@/data/problems/flash-stages";
import { STAGES } from "@/data/problems/stages";
import { useClearedStageIds } from "@/lib/storage";

export default function HomePage() {
  const clearedIds = useClearedStageIds();

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold">Tane</h1>
      <StageListSection
        title="四則演算"
        stages={STAGES}
        clearedIds={clearedIds}
        hrefPrefix="/stage"
      />
      <StageListSection
        title="フラッシュ暗算"
        stages={FLASH_STAGES}
        clearedIds={clearedIds}
        hrefPrefix="/flash"
      />
    </main>
  );
}
