"use client";

import dynamic from "next/dynamic";

const SorobanPlayer = dynamic(() => import("@/components/soroban/soroban-player").then((mod) => mod.SorobanPlayer), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-muted-foreground">よみこみちゅう...</p>
    </div>
  ),
});

export function SorobanPlayerLoader({ stageId }: { stageId: string }) {
  // key={stageId} で、ステージを移るたびに作り直す（前のステージの問題やHPを引き継がない）
  return <SorobanPlayer key={stageId} stageId={stageId} />;
}
