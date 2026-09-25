import { FlashStagePlayerLoader } from "@/components/flash-stage-player-loader";

export default async function FlashStagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  return <FlashStagePlayerLoader stageId={stageId} />;
}
