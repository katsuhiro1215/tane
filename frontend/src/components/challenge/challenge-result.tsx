"use client";

import Image from "next/image";
import Link from "next/link";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { MEDAL_LABELS, MedalBadge } from "@/components/challenge/medal-badge";
import { useCountUp } from "@/components/play/use-count-up";
import { CHALLENGE_LABELS, nextMedalGoal, resultMedal, type ChallengeModeId } from "@/lib/game/challenge-rules";
import { SPRU_POSES } from "@/lib/spru-images";

export interface ChallengeOutcome {
  score: number;
  correctCount: number;
  topLevel: number;
  newBest: boolean;
  bestBefore: number | null;
}

const SCORE_COUNT_MS = 1200;

export function ChallengeResult({
  modeId,
  outcome,
  onRetry,
}: {
  modeId: ChallengeModeId;
  outcome: ChallengeOutcome;
  onRetry: () => void;
}) {
  const score = useCountUp(outcome.score, SCORE_COUNT_MS, 0);
  const best = Math.max(outcome.score, outcome.bestBefore ?? 0);
  const { medal, upgraded: medalUp } = resultMedal(modeId, outcome.score, outcome.bestBefore);
  const goal = nextMedalGoal(modeId, best);

  return (
    <main className="flex flex-1 flex-col justify-center gap-4 p-6">
      <Panel className="flex flex-col items-center gap-3 py-6">
        <Image src={SPRU_POSES.cheer} alt="" width={120} height={160} priority className="h-28 w-auto animate-pop-in" />
        <p className="font-display text-sm font-black text-muted-foreground">{CHALLENGE_LABELS[modeId]} チャレンジ</p>
        <h1 className="font-display text-3xl font-black">タイムアップ！</h1>
        <p className="font-display text-4xl font-black text-cta-to" aria-label={`${outcome.score}てん`}>
          {score.toLocaleString("ja-JP")}
          <span className="ml-1 text-lg">PT</span>
        </p>
        {medal && <MedalBadge medal={medal} size={medalUp ? "lg" : "md"} />}
        {medalUp && <p className="animate-pop-in font-display text-sm font-black text-primary">あたらしい メダル！</p>}
        {outcome.newBest ? (
          <p className="animate-pop-in rounded-full bg-[#ff3d8b] px-3 py-0.5 font-display text-sm font-black text-white">
            さいこうきろく！
          </p>
        ) : (
          outcome.bestBefore !== null && (
            <p className="text-sm font-bold text-muted-foreground">
              さいこう {outcome.bestBefore.toLocaleString("ja-JP")} PT
            </p>
          )
        )}
        <p className="font-bold">
          せいかい {outcome.correctCount}もん ・ とどいた だん {outcome.topLevel}
        </p>
        {goal && (
          <p className="font-display text-sm font-black text-[#2b6fa3]">
            あと {goal.pointsLeft.toLocaleString("ja-JP")}てんで {MEDAL_LABELS[goal.medal]}メダル！
          </p>
        )}
      </Panel>
      <div className="flex flex-col gap-3">
        <AppButton variant="cta" size="xl" onClick={onRetry}>
          もういちど
        </AppButton>
        <Link href="/challenge" className={appButtonVariants({ variant: "cream", size: "lg" })}>
          あそびを えらぶ
        </Link>
      </div>
    </main>
  );
}
