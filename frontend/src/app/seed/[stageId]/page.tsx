import { RemainderDivisionPlayerLoader } from "@/components/seed/remainder-division-player-loader";
import { SeedPlayerLoader } from "@/components/seed/seed-player-loader";
import { getStage } from "@/data/stages/catalog";

export default async function SeedPage({ params }: { params: Promise<{ stageId: string }> }) {
  const { stageId } = await params;
  const stage = getStage(stageId);
  if (stage?.kind === "seed" && stage.rule.pair) return <RemainderDivisionPlayerLoader stageId={stageId} />;
  return <SeedPlayerLoader stageId={stageId} />;
}
