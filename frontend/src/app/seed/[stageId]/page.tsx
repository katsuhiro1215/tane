import { RemainderDivisionPlayerLoader } from "@/components/seed/remainder-division-player-loader";
import { SeedPlayerLoader } from "@/components/seed/seed-player-loader";
import { getStage, STAGES } from "@/data/stages/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return STAGES.filter((stage) => stage.kind === "seed").map((stage) => ({ stageId: stage.id }));
}

export default async function SeedPage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  const stage = getStage(stageId);
  if (stage?.kind === "seed" && stage.rule.pair) return <RemainderDivisionPlayerLoader stageId={stageId} />;
  return <SeedPlayerLoader stageId={stageId} />;
}
