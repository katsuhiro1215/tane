import { StagePlayerLoader } from "@/components/stage-player-loader";

export default async function StagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  return <StagePlayerLoader stageId={stageId} />;
}
