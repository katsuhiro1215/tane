"use client";

import dynamic from "next/dynamic";

const StagePlayer = dynamic(
  () => import("@/components/stage-player").then((mod) => mod.StagePlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">よみこみちゅう...</p>
      </div>
    ),
  }
);

export function StagePlayerLoader({ stageId }: { stageId: string }) {
  // key={stageId}により、ステージを移動するたびに新しいインスタンスとして
  // 再マウントされる(前のステージの問題やHPを引き継がない)。
  return <StagePlayer key={stageId} stageId={stageId} />;
}
