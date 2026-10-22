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
import { modeHref, parseModeSearchParams, type ModeSearch } from "@/lib/mode-params";
import { useProgress } from "@/lib/progress-store";

/**
 * stage・grew は静的書き出しのためサーバーから渡せない（searchParams はビルド時に使えない）ので、
 * props ではなく今の URL から読む。grew を props で受けていた頃も、replaceState で URL から消しても
 * 「戻る」で Next が前の props のまま画面を作り直し、演出がくり返される問題があったので、同じやり方にそろえる。
 */
function readModeSearchFromLocation(modeId: ModeId): ModeSearch {
  return parseModeSearchParams(modeId, Object.fromEntries(new URLSearchParams(window.location.search)));
}

export function ModeScreen({ modeId }: { modeId: ModeId }) {
  const router = useRouter();
  const { play } = useSound();
  const { stars } = useProgress();
  const stages = stagesOfMode(modeId);
  // この画面は ssr: false でだけ描くので、初期値で window を見てよい
  const [{ requestedStageId, grewStageId, grewFrom }] = useState(() => readModeSearchFromLocation(modeId));
  const [focusedId, setFocusedId] = useState(() => initialFocusStage(modeId, stars, requestedStageId).id);
  const grew = grewStageId ? { stageId: grewStageId, from: grewFrom ?? 0 } : undefined;

  // 再読み込みで演出がくり返されないよう、URL から grew を消す（画面は作り直さない）
  useEffect(() => {
    if (grew) {
      window.history.replaceState(window.history.state, "", modeHref(modeId, { stageId: requestedStageId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
