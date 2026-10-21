"use client";

import dynamic from "next/dynamic";

const RemainderDivisionPlayer = dynamic(
  () => import("@/components/seed/remainder-division-player").then((mod) => mod.RemainderDivisionPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">よみこみちゅう...</p>
      </div>
    ),
  }
);

export function RemainderDivisionPlayerLoader({ stageId }: { stageId: string }) {
  // key={stageId} で、ステージを移るたびに作り直す
  return <RemainderDivisionPlayer key={stageId} stageId={stageId} />;
}
