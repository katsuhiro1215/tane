import { FlashStagePlayerLoader } from "@/components/flash-stage-player-loader";
import { STAGES } from "@/data/stages/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return STAGES.filter((stage) => stage.kind === "flash").map((stage) => ({ stageId: stage.id }));
}

export default async function FlashStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  return <FlashStagePlayerLoader stageId={stageId} />;
}
