import { StagePlayerLoader } from "@/components/stage-player-loader";
import { STAGES } from "@/data/stages/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return STAGES.filter((stage) => stage.kind === "arithmetic").map((stage) => ({ stageId: stage.id }));
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ stageId: string }>;
}) {
  const { stageId } = await params;
  return <StagePlayerLoader stageId={stageId} />;
}
