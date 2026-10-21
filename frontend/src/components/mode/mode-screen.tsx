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
import type { Stars } from "@/lib/game/stars";
import { modeHref, parseModeSearchParams, type ModeSearch } from "@/lib/mode-params";
import { useProgress } from "@/lib/progress-store";

/**
 * grew はサーバーからの props ではなく今の URL から読む。
 * props で受けると、replaceState で URL から消しても「戻る」で Next が前の props のまま画面を作り直し、演出がくり返される。
 */
function readGrewFromLocation(modeId: ModeId): { stageId: string; from: Stars } | undefined {
  const search = parseModeSearchParams(modeId, Object.fromEntries(new URLSearchParams(window.location.search)));
  return search.grewStageId ? { stageId: search.grewStageId, from: search.grewFrom ?? 0 } : undefined;
}

export function ModeScreen({ modeId, requestedStageId }: { modeId: ModeId } & Pick<ModeSearch, "requestedStageId">) {
  const router = useRouter();
  const { play } = useSound();
  const { stars } = useProgress();
  const stages = stagesOfMode(modeId);
  const [focusedId, setFocusedId] = useState(() => initialFocusStage(modeId, stars, requestedStageId).id);
  // この画面は ssr: false でだけ描くので、初期値で window を見てよい
  const [grew] = useState(() => readGrewFromLocation(modeId));

  // 再読み込みで演出がくり返されないよう、URL から grew を消す（画面は作り直さない）
  useEffect(() => {
    if (grew) {
      window.history.replaceState(window.history.state, "", modeHref(modeId, { stageId: requestedStageId }));
    }
  }, [grew, modeId, requestedStageId]);

  const index = stages.findIndex((stage) => stage.id === focusedId);
  const stage = stages[index];
  const unlocked = isUnlocked(stage, stars);

  // ステージを選ぶ（前へ・次へ・一覧から）
  function choose(id: string) {
    play("select");
    setFocusedId(id);
  }

  function start() {
    play("decide");
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
        onPrev={index > 0 ? () => choose(stages[index - 1].id) : undefined}
        onNext={index < stages.length - 1 ? () => choose(stages[index + 1].id) : undefined}
        onStart={start}
      />
      <StageGrid stages={stages} stars={stars} focusedId={focusedId} grew={grew} onSelect={choose} />
    </main>
  );
}
