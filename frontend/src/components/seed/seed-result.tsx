"use client";

import Image from "next/image";
import Link from "next/link";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { StarsRow } from "@/components/app/stars-row";
import { useCountUp } from "@/components/play/use-count-up";
import { unlockStars, type SeedStage } from "@/data/stages/catalog";
import type { SeedRunMode } from "@/lib/game/seed-run";
import type { Stars } from "@/lib/game/stars";
import { resultLinks } from "@/lib/result-links";
import { SPRU_POSES } from "@/lib/spru-images";

export interface SeedOutcome {
  mode: SeedRunMode;
  stars: Stars;
  before: Stars;
  improved: boolean;
  score: number;
  newBest: boolean;
  correct: number;
  mistakes: number;
  maxCombo: number;
  defeated: boolean;
  /** エンドレスの新記録 */
  newBestCorrect: boolean;
  newBestCombo: boolean;
}

const SCORE_COUNT_MS = 1200;

export function SeedResult({ stage, outcome, onRetry }: { stage: SeedStage; outcome: SeedOutcome; onRetry: () => void }) {
  const score = useCountUp(outcome.score, SCORE_COUNT_MS, 0);
  const minute = outcome.mode === "minute";
  const passed = outcome.stars >= unlockStars(stage);
  const links = resultLinks(stage, { cleared: minute && passed, improved: outcome.improved, before: outcome.before });
  const nextNeed =
    minute && !outcome.defeated && outcome.stars < 5
      ? stage.rule.thresholds[outcome.stars as 0 | 1 | 2 | 3 | 4] - outcome.correct
      : null;
  const title = minute ? (outcome.stars > 0 ? "ステージクリア！" : outcome.defeated ? "ざんねん…" : "もうすこし！") : "おつかれさま！";

  return (
    <main className="flex flex-1 flex-col justify-center gap-4 p-6">
      <Panel className="flex flex-col items-center gap-3 py-6">
        <Image
          src={outcome.stars > 0 || !minute ? SPRU_POSES.cheer : SPRU_POSES.sad}
          alt=""
          width={120}
          height={160}
          priority
          className="h-28 w-auto animate-pop-in"
        />
        <h1 className="font-display text-3xl font-black">{title}</h1>
        {minute && <StarsRow stars={outcome.stars} size="lg" max={5} animate />}
        <p className="font-display text-4xl font-black text-cta-to" aria-label={`${outcome.score}てん`}>
          {score.toLocaleString("ja-JP")}
          <span className="ml-1 text-lg">PT</span>
        </p>
        {outcome.newBest && minute && (
          <p className="animate-pop-in rounded-full bg-[#ff3d8b] px-3 py-0.5 font-display text-sm font-black text-white">
            さいこうきろく！
          </p>
        )}
        <p className="font-bold">
          {outcome.correct}もん せいかい ・ ミス {outcome.mistakes}
        </p>
        {!minute && (
          <p className="font-bold">
            いちばん つづいた コンボ {outcome.maxCombo}
            {(outcome.newBestCorrect || outcome.newBestCombo) && (
              <span className="ml-2 animate-pop-in rounded-full bg-[#ff3d8b] px-2 py-0.5 font-display text-xs font-black text-white">
                しんきろく！
              </span>
            )}
          </p>
        )}
        {nextNeed !== null && nextNeed > 0 && (
          <p className="font-display text-sm font-black text-[#2b6fa3]">
            あと {nextNeed}もんで ★{outcome.stars + 1}！
          </p>
        )}
        {minute && outcome.defeated && (
          <p className="text-sm font-bold text-muted-foreground">HPが なくなると ★は もらえないよ</p>
        )}
        {minute && outcome.improved && (
          <p className="font-display text-sm font-black text-primary">タネが そだったよ！ みにいこう</p>
        )}
      </Panel>
      <div className="flex flex-col gap-3">
        {links.nextHref && (
          <Link href={links.nextHref} className={appButtonVariants({ variant: "cta", size: "xl" })}>
            つぎのステージへ
          </Link>
        )}
        <AppButton variant={links.nextHref ? "primary" : "cta"} size={links.nextHref ? "lg" : "xl"} onClick={onRetry}>
          もういちど
        </AppButton>
        <Link href={links.backHref} className={appButtonVariants({ variant: "cream", size: "lg" })}>
          もどる
        </Link>
      </div>
    </main>
  );
}
