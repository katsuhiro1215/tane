import { StagePlayer } from "@/components/stage-player";

export default async function StagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  return <StagePlayer stageId={stageId} />;
}
