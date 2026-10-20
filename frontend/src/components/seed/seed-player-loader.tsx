"use client";

import dynamic from "next/dynamic";

const SeedPlayer = dynamic(() => import("@/components/seed/seed-player").then((mod) => mod.SeedPlayer), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-muted-foreground">よみこみちゅう...</p>
    </div>
  ),
});

export function SeedPlayerLoader({ stageId }: { stageId: string }) {
  // key={stageId} で、ステージを移るたびに作り直す（前のステージの種やHPを引き継がない）
  return <SeedPlayer key={stageId} stageId={stageId} />;
}
