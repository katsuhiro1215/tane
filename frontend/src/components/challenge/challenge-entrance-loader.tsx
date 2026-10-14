"use client";

import dynamic from "next/dynamic";

// 開いているかどうかと最高点が localStorage で決まるため、サーバーでは描かない
const ChallengeEntrance = dynamic(
  () => import("@/components/challenge/challenge-entrance").then((mod) => mod.ChallengeEntrance),
  { ssr: false, loading: () => <div className="flex-1" /> }
);

export function ChallengeEntranceLoader() {
  return <ChallengeEntrance />;
}
