"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useSound } from "@/components/app/sound-provider";
import { TopBar } from "@/components/app/top-bar";
import { ModeTabs } from "@/components/mode/mode-tabs";
import { StageCard } from "@/components/mode/stage-card";
import { StageGrid } from "@/components/mode/stage-grid";
import { MODES, playPath, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { initialFocusStage, isUnlocked, starsOf } from "@/lib/game/progression";
import { modeHref, type ModeSearch } from "@/lib/mode-params";
import { useProgress } from "@/lib/progress-store";

export function ModeScreen({ modeId, requestedStageId, grewStageId, grewFrom }: { modeId: ModeId } & ModeSearch) {
  const router = useRouter();
  const { play } = useSound();
  const { stars } = useProgress();
  const stages = stagesOfMode(modeId);
  const [focusedId, setFocusedId] = useState(() => initialFocusStage(modeId, stars, requestedStageId).id);
  const [grew] = useState(() => (grewStageId ? { stageId: grewStageId, from: grewFrom ?? 0 } : undefined));

  // 戻る・再読み込みで育つ演出がくり返されないよう、URL から grew を消す（画面は作り直さない）
  useEffect(() => {
    if (grewStageId) {
      window.history.replaceState(null, "", modeHref(modeId, { stageId: requestedStageId }));
    }
  }, [grewStageId, modeId, requestedStageId]);

  const index = stages.findIndex((stage) => stage.id === focusedId);
  const stage = stages[index];
  const unlocked = isUnlocked(stage, stars);

  function start() {
    play("select");
    router.push(playPath(stage));
  }

  return (
    <main className="flex flex-1 flex-col">
      <TopBar title={MODES[modeId].label} backHref="/" />
      <ModeTabs current={modeId} />
      <StageCard
        stage={stage}
        total={stages.length}
        stars={starsOf(stars, stage.id)}
        unlocked={unlocked}
        onPrev={index > 0 ? () => setFocusedId(stages[index - 1].id) : undefined}
        onNext={index < stages.length - 1 ? () => setFocusedId(stages[index + 1].id) : undefined}
        onStart={start}
      />
      <StageGrid stages={stages} stars={stars} focusedId={focusedId} grew={grew} onSelect={setFocusedId} />
    </main>
  );
}
