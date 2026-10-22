import { redirect } from "next/navigation";

import { ChallengePlayerLoader } from "@/components/challenge/challenge-player-loader";
import { CHALLENGE_MODE_IDS, isChallengeModeId } from "@/lib/game/challenge-rules";

export const dynamicParams = false;

export function generateStaticParams() {
  return CHALLENGE_MODE_IDS.map((modeId) => ({ modeId }));
}

export default async function ChallengePlayPage({ params }: { params: Promise<{ modeId: string }> }) {
  const { modeId } = await params;
  // フラッシュなど、チャレンジに無いあそびは入口へ
  if (!isChallengeModeId(modeId)) redirect("/challenge");
  return <ChallengePlayerLoader modeId={modeId} />;
}
