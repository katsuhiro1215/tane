"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSound } from "@/components/app/sound-provider";
import { TopBar } from "@/components/app/top-bar";
import { ModeTabs } from "@/components/mode/mode-tabs";
import { StageCard } from "@/components/mode/stage-card";
import { StageGrid } from "@/components/mode/stage-grid";
import { MODES, playPath, stagesOfMode, type ModeId } from "@/data/stages/catalog";
import { initialFocusStage, isUnlocked, starsOf } from "@/lib/game/progression";
import { modeHref, parseModeSearchParams } from "@/lib/mode-params";
import { useProgress } from "@/lib/progress-store";

export function ModeScreen({ modeId }: { modeId: ModeId }) {
  const router = useRouter();
  const { play } = useSound();
  const { stars } = useProgress();
  const stages = stagesOfMode(modeId);
  // stage・grew は静的書き出しのためサーバーから渡せない（searchParams はビルド時に使えない）ので、
  // useSearchParams で読む。window.location を useState の初期値で1回だけ読む形だと、画面内の移動
  // （Routerがこの画面をマウントしたままクエリだけ変わる場合）で新しいクエリに気づけない
  const searchParams = useSearchParams();
  const { requestedStageId, grewStageId, grewFrom } = parseModeSearchParams(
    modeId,
    Object.fromEntries(searchParams.entries())
  );
  const grew = grewStageId ? { stageId: grewStageId, from: grewFrom ?? 0 } : undefined;
  const [focusedId, setFocusedId] = useState(() => initialFocusStage(modeId, stars, requestedStageId).id);
  // URL の stage が変わったら、選んでいるステージを合わせる（画面を作り直さなくても）。
  // レンダー中に直接合わせる（useEffect の中で setState すると、カスケードする再描画になる）
  const [appliedStageId, setAppliedStageId] = useState(requestedStageId);
  if (requestedStageId && requestedStageId !== appliedStageId) {
    setAppliedStageId(requestedStageId);
    setFocusedId(requestedStageId);
  }

  // 再読み込みで演出がくり返されないよう、URL から grew を消す（画面は作り直さない）
  useEffect(() => {
    if (grewStageId) {
      window.history.replaceState(window.history.state, "", modeHref(modeId, { stageId: requestedStageId }));
    }
  }, [grewStageId, modeId, requestedStageId]);

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
