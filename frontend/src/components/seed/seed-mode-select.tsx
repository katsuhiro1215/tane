import Link from "next/link";

import { AppButton, appButtonVariants } from "@/components/app/button";
import { Panel } from "@/components/app/panel";
import { StarsRow } from "@/components/app/stars-row";
import type { SeedStage } from "@/data/stages/catalog";
import type { Stars } from "@/lib/game/stars";
import type { SeedRunMode } from "@/lib/game/seed-run";
import { displayNumber } from "@/data/stages/catalog";
import { roundLabel, SEED_ROUND_MS } from "@/lib/game/seed-stars";
import { modeHref } from "@/lib/mode-params";

export function SeedModeSelect({
  stage,
  stars,
  endlessBest,
  onSelect,
}: {
  stage: SeedStage;
  stars: Stars;
  endlessBest: { correct: number; combo: number } | undefined;
  onSelect: (mode: SeedRunMode) => void;
}) {
  return (
    <main className="flex flex-1 flex-col justify-center gap-4 p-6">
      <Panel className="flex flex-col items-center gap-2 py-6">
        <p className="font-display text-sm font-black text-muted-foreground">ステージ {displayNumber(stage)}</p>
        <h1 className="font-display text-2xl font-black">{stage.name}</h1>
        <StarsRow stars={stars} max={5} />
      </Panel>
      <div className="flex flex-col gap-3">
        <AppButton variant="cta" size="xl" onClick={() => onSelect("minute")}>
          {roundLabel(stage.rule.roundMs ?? SEED_ROUND_MS)} ちょうせん
        </AppButton>
        <p className="-mt-1 text-center text-xs font-bold text-muted-foreground">せいかいの かずで ★が きまるよ</p>
        <AppButton variant="primary" size="lg" onClick={() => onSelect("endless")}>
          エンドレス（れんしゅう）
        </AppButton>
        <p className="-mt-1 text-center text-xs font-bold text-muted-foreground">
          {endlessBest
            ? `さいこう ${endlessBest.correct}もん ・ ${endlessBest.combo}れんぞく`
            : "HPが なくなるまで ずっと あそべるよ"}
        </p>
        <Link
          href={modeHref(stage.mode, { stageId: stage.id })}
          className={appButtonVariants({ variant: "cream", size: "lg" })}
        >
          もどる
        </Link>
      </div>
    </main>
  );
}
