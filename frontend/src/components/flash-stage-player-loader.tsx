"use client";

import dynamic from "next/dynamic";

const FlashStagePlayer = dynamic(
  () => import("@/components/flash-stage-player").then((mod) => mod.FlashStagePlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">よみこみちゅう...</p>
      </div>
    ),
  }
);

export function FlashStagePlayerLoader({ stageId }: { stageId: string }) {
  // key={stageId}により、ステージを移動するたびに新しいインスタンスとして
  // 再マウントされる(既存のStagePlayerLoaderと同じパターン)。
  return <FlashStagePlayer key={stageId} stageId={stageId} />;
}
