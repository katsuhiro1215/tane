"use client";

import Image from "next/image";
import Link from "next/link";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { StarsRow } from "@/components/app/stars-row";
import type { Stage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import { resultLinks } from "@/lib/result-links";
import { SPRU_POSES } from "@/lib/spru-images";

export interface StageOutcome {
  stars: Stars;
  improved: boolean;
  before: Stars;
}

interface StageResultProps {
  stage: Stage;
  cleared: boolean;
  correctCount: number;
  total: number;
  outcome: StageOutcome;
  onRetry: () => void;
}

export function StageResult({ stage, cleared, correctCount, total, outcome, onRetry }: StageResultProps) {
  const links = resultLinks(stage, { cleared, improved: outcome.improved, before: outcome.before });
  return (
    <main className="flex flex-1 flex-col justify-center gap-4 p-6">
      <Panel className="flex flex-col items-center gap-3 py-6">
        <Image
          src={cleared ? SPRU_POSES.cheer : SPRU_POSES.sad}
          alt=""
          width={120}
          height={160}
          priority
          className="h-36 w-auto animate-pop-in"
        />
        <h1 className="font-display text-3xl font-black">{cleared ? "ステージクリア！" : "ざんねん…"}</h1>
        {cleared && <StarsRow stars={outcome.stars} size="lg" animate />}
        <p className="font-bold">
          {correctCount} / {total} もん せいかい
        </p>
        {cleared && outcome.improved && (
          <p className="font-display text-sm font-black text-primary">タネが そだったよ！ みにいこう</p>
        )}
      </Panel>
      <div className="flex flex-col gap-3">
        {cleared ? (
          links.nextHref && (
            <Link href={links.nextHref} className={appButtonVariants({ variant: "cta", size: "xl" })}>
              つぎのステージへ
            </Link>
          )
        ) : (
          <AppButton variant="cta" size="xl" onClick={onRetry}>
            もういちど
          </AppButton>
        )}
        <Link href={links.backHref} className={appButtonVariants({ variant: "cream", size: "lg" })}>
          もどる
        </Link>
      </div>
    </main>
  );
}
